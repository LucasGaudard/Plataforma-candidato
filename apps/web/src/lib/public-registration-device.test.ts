import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getOrCreatePublicRegistrationDeviceId,
  PUBLIC_REGISTRATION_DEVICE_STORAGE_KEY,
} from './public-registration-device';

test('reutiliza o identificador persistido no navegador', () => {
  const stored = '550e8400-e29b-41d4-a716-446655440000';
  const storage = { getItem: () => stored, setItem: () => assert.fail('não deveria sobrescrever') };
  const cryptoApi = { randomUUID: () => assert.fail('não deveria gerar') } as unknown as Crypto;
  assert.equal(getOrCreatePublicRegistrationDeviceId(storage, cryptoApi), stored);
});

test('gera UUID seguro e salva na chave específica do projeto', () => {
  let saved: [string, string] | undefined;
  const generated = '550e8400-e29b-41d4-a716-446655440000';
  const storage = {
    getItem: () => null,
    setItem: (key: string, value: string) => { saved = [key, value]; },
  };
  const cryptoApi = { randomUUID: () => generated } as unknown as Crypto;
  assert.equal(getOrCreatePublicRegistrationDeviceId(storage, cryptoApi), generated);
  assert.deepEqual(saved, [PUBLIC_REGISTRATION_DEVICE_STORAGE_KEY, generated]);
});
