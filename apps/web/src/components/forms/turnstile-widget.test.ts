import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('formulário exige token, inclui honeypot e preserva declaração separada da LGPD', () => {
  const form = readFileSync(new URL('./supporter-form.tsx', import.meta.url), 'utf8');
  assert.match(form, /turnstileToken/);
  assert.match(form, /turnstileRequired && !turnstileToken/);
  assert.match(form, /name="website"/);
  assert.match(form, /formStartedAt/);
  assert.match(form, /cadastro está sendo realizado por mim/);
});

test('widget usa script oficial e callbacks de token, expiração e erro', () => {
  const widget = readFileSync(new URL('./turnstile-widget.tsx', import.meta.url), 'utf8');
  assert.match(widget, /https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(widget, /expired-callback/);
  assert.match(widget, /error-callback/);
});
