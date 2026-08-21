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
})) {
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
  await app.register(postUploadRoutes, { uploadMedia: uploadMedia as never });
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
  assert.equal(response.body.includes('secret api payload'), false);
  await app.close();
});

test('configuração ausente retorna serviço indisponível sem vazar segredo', async () => {
  const app = await build('ADMIN', async () => { throw new Error('Cloudinary não configurado na API.'); });
  const response = await app.inject({ method: 'POST', url: '/image', ...multipartPayload('foto.png', 'image/png') });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().message, 'Cloudinary não configurado na API.');
  await app.close();
});
