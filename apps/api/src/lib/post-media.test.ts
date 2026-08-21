import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable, Writable } from 'node:stream';
import {
  POST_IMAGE_MAX_BYTES,
  PostMediaTooLargeError,
  pipePostMedia,
  validatePostMediaMetadata,
} from './post-media';

test('valida MIME e extensão de imagem e vídeo', () => {
  assert.equal(validatePostMediaMetadata('image', 'foto.jpg', 'image/jpeg'), null);
  assert.equal(validatePostMediaMetadata('image', 'foto.webp', 'image/webp'), null);
  assert.equal(validatePostMediaMetadata('video', 'video.mp4', 'video/mp4'), null);
  assert.equal(validatePostMediaMetadata('video', 'video.webm', 'video/webm'), null);
  assert.match(validatePostMediaMetadata('image', 'foto.svg', 'image/svg+xml') || '', /Imagem inválida/);
  assert.match(validatePostMediaMetadata('video', '../video.mp4', 'video/mp4') || '', /Nome de arquivo/);
});

test('stream rejeita imagem acima de 10 MB sem acumular arquivo inteiro', async () => {
  const sink = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  await assert.rejects(
    () => pipePostMedia('image', Readable.from([
      Buffer.alloc(POST_IMAGE_MAX_BYTES),
      Buffer.alloc(1),
    ]), sink),
    PostMediaTooLargeError,
  );
});
