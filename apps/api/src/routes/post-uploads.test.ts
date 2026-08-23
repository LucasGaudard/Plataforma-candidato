import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import multipart from '@fastify/multipart';
import { Role } from '@platform/types';
import { postUploadRoutes } from './post-uploads';

function multipartPayload(filename: string, mimetype: string, content = 'media') {
  const boundary = '----codex-post-media';
  return {
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: Buffer.from([
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`,
      `Content-Type: ${mimetype}\r\n\r\n`,
      content,
      `\r\n--${boundary}--\r\n`,
    ].join('')),
  };
}

async function build(role: 'ADMIN' | 'LEADER', uploadMedia = async (_stream: unknown, options: { kind: 'image' | 'video'; campaignId: string }) => ({
  secureUrl: `https://res.cloudinary.com/test/${options.kind}`,
  publicId: `folder/${options.kind}`,
  resourceType: options.kind,
}), prefix = '') {
  const app = Fastify();
  await app.register(multipart);
  app.decorate('authenticate', async (request: unknown) => {
    (request as { user: unknown }).user = { sub: 'actor-1', role, campaignId: 'campaign-1' };
  });
  app.decorate('authorize', (...allowedRoles: Role[]) => async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!allowedRoles.includes(role as Role)) {
      reply.status(403).send({ message: 'Acesso negado' });
    }
  });
  await app.register(postUploadRoutes, {
    prefix,
    uploadMedia: uploadMedia as never,
    authorizeVideo: (campaignId: string) => ({
      cloudName: 'test', uploadUrl: 'https://api.cloudinary.com/v1_1/test/video/upload', apiKey: 'public-key', timestamp: 123,
      signature: 'signature', folder: `conecta-eleitor/${campaignId}/posts/videos`, publicId: 'post-video-id',
      maxBytes: 500 * 1024 * 1024, chunkSize: 10 * 1024 * 1024,
    }),
  });
  return app;
}

test('ADMIN envia imagem e campanha vem do usuário autenticado', async () => {
  let campaignId = '';
  const app = await build('ADMIN', async (_stream, options) => {
    campaignId = options.campaignId;
    return { secureUrl: 'https://res.cloudinary.com/image.jpg', publicId: 'campaign/image', resourceType: 'image' };
  });
  const response = await app.inject({ method: 'POST', url: '/image', ...multipartPayload('foto.jpg', 'image/jpeg') });
  assert.equal(response.statusCode, 201);
  assert.equal(campaignId, 'campaign-1');
  assert.equal(response.json().secureUrl, 'https://res.cloudinary.com/image.jpg');
  await app.close();
});

test('rotas finais usadas pelo frontend estão registradas com o prefixo real', async () => {
  const app = await build('ADMIN', undefined, '/posts/uploads');
  const image = await app.inject({ method: 'POST', url: '/posts/uploads/image', ...multipartPayload('foto.png', 'image/png') });
  const authorize = await app.inject({
    method: 'POST', url: '/posts/uploads/video/authorize',
    payload: { filename: 'video.mp4', mimetype: 'video/mp4', size: 20 * 1024 * 1024 },
  });
  assert.equal(image.statusCode, 201);
  assert.equal(authorize.statusCode, 200);
  await app.close();
});

test('ADMIN recebe autorização limitada à pasta da própria campanha', async () => {
  const app = await build('ADMIN');
  const response = await app.inject({
    method: 'POST', url: '/video/authorize',
    payload: { filename: 'paula.mp4', mimetype: 'video/mp4', size: 300 * 1024 * 1024 },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().folder, 'conecta-eleitor/campaign-1/posts/videos');
  assert.equal(response.json().apiKey, 'public-key');
  assert.equal(response.json().cloudName, 'test');
  assert.equal('apiSecret' in response.json(), false);
  await app.close();
});

test('autorização rejeita acima de 500 MB antes de contatar Cloudinary', async () => {
  const app = await build('ADMIN');
  const response = await app.inject({
    method: 'POST', url: '/video/authorize',
    payload: { filename: 'paula.mp4', mimetype: 'video/mp4', size: 500 * 1024 * 1024 + 1 },
  });
  assert.equal(response.statusCode, 413);
  await app.close();
});

test('LEADER não recebe assinatura de upload direto', async () => {
  const app = await build('LEADER');
  const response = await app.inject({
    method: 'POST', url: '/video/authorize',
    payload: { filename: 'paula.webm', mimetype: 'video/webm', size: 20 * 1024 * 1024 },
  });
  assert.equal(response.statusCode, 403);
  await app.close();
});

test('usuário não autenticado não recebe assinatura', async () => {
  const app = Fastify();
  await app.register(multipart);
  app.decorate('authenticate', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.status(401).send({ message: 'Não autenticado' });
  });
  app.decorate('authorize', () => async () => undefined);
  await app.register(postUploadRoutes, {
    authorizeVideo: () => assert.fail('não deveria assinar'),
  });
  const response = await app.inject({
    method: 'POST', url: '/video/authorize',
    payload: { filename: 'paula.mp4', mimetype: 'video/mp4', size: 20 * 1024 * 1024 },
  });
  assert.equal(response.statusCode, 401);
  await app.close();
});

test('usuário não autorizado não chega ao uploader', async () => {
  let called = false;
  const app = await build('LEADER', async () => {
    called = true;
    throw new Error('não deveria executar');
  });
  const response = await app.inject({ method: 'POST', url: '/image', ...multipartPayload('foto.jpg', 'image/jpeg') });
  assert.equal(response.statusCode, 403);
  assert.equal(called, false);
  await app.close();
});

test('rejeita MIME inválido antes do Cloudinary', async () => {
  const app = await build('ADMIN');
  const response = await app.inject({ method: 'POST', url: '/image', ...multipartPayload('foto.svg', 'image/svg+xml') });
  assert.equal(response.statusCode, 415);
  await app.close();
});

test('vídeo válido usa resource type video', async () => {
  const app = await build('ADMIN');
  const response = await app.inject({ method: 'POST', url: '/video', ...multipartPayload('video.webm', 'video/webm') });
  assert.equal(response.statusCode, 201);
  assert.equal(response.json().resourceType, 'video');
  await app.close();
});

test('erro do Cloudinary é sanitizado', async () => {
  const app = await build('ADMIN', async () => { throw new Error('secret api payload'); });
  const response = await app.inject({ method: 'POST', url: '/image', ...multipartPayload('foto.png', 'image/png') });
  assert.equal(response.statusCode, 502);
  assert.equal(response.json().code, 'CLOUDINARY_UPLOAD_FAILED');
  assert.equal(response.body.includes('secret api payload'), false);
  await app.close();
});

test('configuração ausente retorna serviço indisponível sem vazar segredo', async () => {
  const app = await build('ADMIN', async () => { throw new Error('Cloudinary não configurado na API.'); });
  const response = await app.inject({ method: 'POST', url: '/image', ...multipartPayload('foto.png', 'image/png') });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().message, 'Cloudinary não configurado na API.');
  assert.equal(response.json().code, 'CLOUDINARY_NOT_CONFIGURED');
  await app.close();
});
