import assert from 'node:assert/strict';
import test from 'node:test';
import { readCloudinaryConfig } from './cloudinary.service';

test('falha claramente quando variáveis obrigatórias estão ausentes', () => {
  assert.throws(() => readCloudinaryConfig({}), /Cloudinary não configurado/);
});

test('lê credenciais somente do ambiente', () => {
  assert.deepEqual(readCloudinaryConfig({
    CLOUDINARY_CLOUD_NAME: 'cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret',
  }), { cloudName: 'cloud', apiKey: 'key', apiSecret: 'secret' });
});
