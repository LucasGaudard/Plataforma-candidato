import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePublishedAt } from './post-date';

const fallback = new Date('2026-08-20T12:00:00.000Z');

test('data vazia usa o fallback sem criar Invalid Date', () => {
  assert.equal(resolvePublishedAt(undefined, fallback), fallback);
  assert.equal(resolvePublishedAt('', fallback), fallback);
});

test('data ISO válida preserva exatamente o instante recebido', () => {
  assert.equal(
    resolvePublishedAt('2026-08-20T22:30:00.000Z', fallback)?.toISOString(),
    '2026-08-20T22:30:00.000Z',
  );
});

test('data inválida é rejeitada', () => {
  assert.equal(resolvePublishedAt('data-invalida', fallback), null);
});
