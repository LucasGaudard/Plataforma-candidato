import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyTurnstileToken } from './turnstile.service';

test('desenvolvimento sem secret usa bypass controlado', async () => {
  assert.equal(await verifyTurnstileToken(undefined, '127.0.0.1', { env: { NODE_ENV: 'development' } }), true);
});

test('produção sem secret falha de forma segura', async () => {
  assert.equal(await verifyTurnstileToken('token', '127.0.0.1', { env: { NODE_ENV: 'production' } }), false);
});

test('token válido e inválido seguem Siteverify sem expor secret', async () => {
  let sentBody = '';
  const valid = await verifyTurnstileToken('valid-token', '203.0.113.1', {
    env: { NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'private-secret' },
    fetchImpl: async (_url, init) => {
      sentBody = String(init?.body);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    },
  });
  assert.equal(valid, true);
  assert.match(sentBody, /valid-token/);

  const invalid = await verifyTurnstileToken('invalid-token', '203.0.113.1', {
    env: { NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'private-secret' },
    fetchImpl: async () => new Response(JSON.stringify({ success: false }), { status: 200 }),
  });
  assert.equal(invalid, false);
});
