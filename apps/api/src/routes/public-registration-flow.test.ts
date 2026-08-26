import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('apps/api/src/routes/public.ts', 'utf8');

test('líder e coordenador usam o mesmo cadastro protegido', () => {
  assert.match(source, /leaders\/:leaderSlug\/supporters/);
  assert.match(source, /coordinators\/:coordinatorSlug\/supporters/);
  assert.equal(source.match(/createAttributedSupporter\(/g)?.length, 3);
});

test('duplicidade permanece isolada por campanha e role USER em transação serializável', () => {
  assert.match(source, /phone: normalized\.phone, role: Role\.USER, campaignId/);
  assert.match(source, /TransactionIsolationLevel\.Serializable/);
  assert.match(source, /error\.code === 'P2034'/);
});

test('logs de segurança usam hash de IP e não registram payload ou token', () => {
  assert.match(source, /ipHash/);
  assert.doesNotMatch(source, /log\.(?:info|warn|error)\([^\n]*turnstileToken/);
  assert.doesNotMatch(source, /log\.(?:info|warn|error)\([^\n]*request\.body/);
  assert.doesNotMatch(source, /log\.(?:info|warn|error)\([^\n]*deviceId/);
});

test('logs distinguem as causas operacionais do cadastro público', () => {
  for (const reason of [
    'TURNSTILE_FAILED', 'DEVICE_REUSE', 'DUPLICATE_PHONE', 'RATE_LIMIT_IP',
    'RATE_LIMIT_LINK', 'RATE_LIMIT_PHONE', 'INVALID_PHONE', 'HONEYPOT', 'DATABASE_ERROR',
  ]) {
    assert.match(source, new RegExp(reason));
  }
});

test('dispositivo é validado, hasheado e reservado na mesma transação do apoiador', () => {
  assert.match(source, /isValidPublicRegistrationDeviceId\(body\?\.deviceId\)/);
  assert.match(source, /hashRegistrationDevice\(body\.deviceId\)/);
  assert.match(source, /tx\.publicRegistrationDevice\.create/);
  assert.match(source, /deviceHash, supporterId: supporter\.id/);
});

test('constraint concorrente de dispositivo vira conflito público seguro', () => {
  assert.match(source, /error\.code === 'P2002'/);
  assert.match(source, /target\.includes\('campaignId'\).*target\.includes\('deviceHash'\)/);
  assert.match(source, /DEVICE_REUSE/);
  assert.match(source, /Este dispositivo já realizou um cadastro nesta campanha/);
});
