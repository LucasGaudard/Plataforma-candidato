import assert from 'node:assert/strict';
import test from 'node:test';
import { cloudinaryConfigurationStatus, readCloudinaryConfig } from './cloudinary.service';

test('falha claramente quando variáveis obrigatórias estão ausentes', () => {
  assert.throws(() => readCloudinaryConfig({}), /Cloudinary não configurado/);
});

test('diagnóstico informa somente presença das credenciais', () => {
  assert.deepEqual(cloudinaryConfigurationStatus({
    CLOUDINARY_CLOUD_NAME: ' cloud ', CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret',
  }), { cloudNameConfigured: true, apiKeyConfigured: true, apiSecretConfigured: true });
  assert.deepEqual(cloudinaryConfigurationStatus({}), {
    cloudNameConfigured: false, apiKeyConfigured: false, apiSecretConfigured: false,
  });
});

test('lê credenciais somente do ambiente', () => {
  assert.deepEqual(readCloudinaryConfig({
    CLOUDINARY_CLOUD_NAME: 'cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret',
  }), { cloudName: 'cloud', apiKey: 'key', apiSecret: 'secret' });
});
