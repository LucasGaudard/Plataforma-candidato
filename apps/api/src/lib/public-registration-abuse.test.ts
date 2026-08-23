import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hashRegistrationDevice,
  hashRegistrationIp,
  isValidPublicRegistrationDeviceId,
  isHoneypotTriggered,
  PublicRegistrationRateLimiter,
  registrationRiskFlags,
} from './public-registration-abuse';

test('honeypot vazio passa e preenchido é detectado', () => {
  assert.equal(isHoneypotTriggered(''), false);
  assert.equal(isHoneypotTriggered(undefined), false);
  assert.equal(isHoneypotTriggered('bot'), true);
});

test('deviceId aceita somente UUID válido e limitado', () => {
  assert.equal(isValidPublicRegistrationDeviceId('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isValidPublicRegistrationDeviceId(undefined), false);
  assert.equal(isValidPublicRegistrationDeviceId('device-manipulado'), false);
  assert.equal(isValidPublicRegistrationDeviceId('a'.repeat(65)), false);
});

test('hash de dispositivo é HMAC estável, completo e separado do hash de IP', () => {
  const deviceId = '550e8400-e29b-41d4-a716-446655440000';
  const hash = hashRegistrationDevice(deviceId, 'test-secret');
  assert.equal(hash.length, 64);
  assert.equal(hash, hashRegistrationDevice(deviceId, 'test-secret'));
  assert.notEqual(hash, hashRegistrationIp(deviceId, 'test-secret'));
  assert.equal(hash.includes(deviceId), false);
});

test('limites independentes bloqueiam IP, link e telefone com cooldown', () => {
  for (const [dimension, max] of [['ip', 40], ['link', 80], ['phone', 5]] as const) {
    const limiter = new PublicRegistrationRateLimiter();
    for (let index = 0; index < max; index += 1) assert.equal(limiter.checkAndRecord(dimension, 'key', 1_000).allowed, true);
    assert.equal(limiter.checkAndRecord(dimension, 'key', 1_000).allowed, false);
    assert.equal(limiter.checkAndRecord(dimension, 'key', 2_000).allowed, false);
  }
});

test('vários cadastros legítimos não são bloqueados prematuramente', () => {
  const limiter = new PublicRegistrationRateLimiter();
  for (let index = 0; index < 20; index += 1) {
    assert.equal(limiter.checkAndRecord('ip', 'shared-wifi', index * 1_000).allowed, true);
  }
});

test('score sinaliza velocidade e volume sem bloquear por si só', () => {
  assert.deepEqual(registrationRiskFlags({ ipAttempts: 1, linkAttempts: 1, formStartedAt: 1_000, now: 5_000 }), []);
  assert.deepEqual(registrationRiskFlags({ ipAttempts: 10, linkAttempts: 20, formStartedAt: 4_500, now: 5_000 }), [
    'IP_VOLUME', 'LINK_VOLUME', 'FAST_SUBMIT',
  ]);
});

test('hash de IP é estável e não contém o IP original', () => {
  const hash = hashRegistrationIp('203.0.113.42', 'test-secret');
  assert.equal(hash, hashRegistrationIp('203.0.113.42', 'test-secret'));
  assert.equal(hash.includes('203.0.113.42'), false);
});
