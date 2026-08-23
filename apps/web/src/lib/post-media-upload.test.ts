import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PostCategory } from '@platform/types';
import {
  applyUploadedMediaUrl,
  POST_IMAGE_MAX_BYTES,
  POST_VIDEO_MAX_BYTES,
  POST_DIRECT_VIDEO_MAX_BYTES,
  validatePostMediaFile,
  diagnosePostMediaUploadError,
} from './post-media-upload';

test('aceita imagem e vídeo válidos dentro do limite', () => {
  assert.equal(validatePostMediaFile('image', { name: 'foto.webp', type: 'image/webp', size: POST_IMAGE_MAX_BYTES }), null);
  assert.equal(validatePostMediaFile('video', { name: 'video.mp4', type: 'video/mp4', size: POST_VIDEO_MAX_BYTES }), null);
});

test('diagnóstico diferencia autenticação, rota, configuração e rede sem expor segredo', () => {
  assert.match(diagnosePostMediaUploadError({ status: 401, code: 'HTTP_401', endpoint: '/posts/uploads/image' }, 'image').message, /sessão/);
  assert.match(diagnosePostMediaUploadError({ status: 404, code: 'HTTP_404' }, 'video').message, /versão da API/);
  assert.match(diagnosePostMediaUploadError({ status: 503, code: 'CLOUDINARY_NOT_CONFIGURED' }, 'image').message, /não está configurado/);
  const network = diagnosePostMediaUploadError(new TypeError('Failed to fetch'), 'video');
  assert.equal(network.code, 'UPLOAD_NETWORK_ERROR');
  assert.equal(JSON.stringify(network).includes('apiSecret'), false);
});

test('frontend usa a mesma API base autenticada nos endpoints exatos de imagem e assinatura', () => {
  const apiSource = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');
  assert.match(apiSource, /const API_URL = process\.env\.NEXT_PUBLIC_API_URL/);
  assert.match(apiSource, /headers\['Authorization'\] = `Bearer \$\{token\}`/);
  assert.match(apiSource, /\/posts\/uploads\/\$\{kind\}/);
  assert.match(apiSource, /\/posts\/uploads\/video\/authorize/);
});

test('rejeita MIME inválido e arquivo acima do limite', () => {
  assert.match(validatePostMediaFile('image', { name: 'x.svg', type: 'image/svg+xml', size: 10 }) || '', /JPG/);
  assert.match(validatePostMediaFile('video', { name: 'x.mp4', type: 'video/mp4', size: POST_DIRECT_VIDEO_MAX_BYTES + 1 }) || '', /500 MB/);
});

test('upload concluído preenche somente a URL correspondente', () => {
  const form = { title: 'Post', description: 'Descrição do post', category: PostCategory.GERAL, imageUrl: 'manual' };
  const image = applyUploadedMediaUrl(form, 'image', 'https://res.cloudinary.com/image.jpg');
  const video = applyUploadedMediaUrl(image, 'video', 'https://res.cloudinary.com/video.mp4');
  assert.equal(video.imageUrl, 'https://res.cloudinary.com/image.jpg');
  assert.equal(video.videoUrl, 'https://res.cloudinary.com/video.mp4');
});

test('formulário mantém URL manual, seletores nativos e bloqueio durante upload', () => {
  const source = readFileSync(new URL('../components/admin/content-manager.tsx', import.meta.url), 'utf8');
  assert.match(source, /label="URL da imagem"/);
  assert.match(source, /label="URL do vídeo"/);
  assert.match(source, /type="file" accept="image\/\*"/);
  assert.match(source, /type="file" accept="video\/\*"/);
  assert.match(source, /disabled=\{uploading !== null\}/);
  assert.match(source, /catch \(error\)/);
});
