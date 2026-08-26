import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('apps/api/src/index.ts', 'utf8');

test('confia no proxy da hospedagem para request.ip representar o cliente', () => {
  assert.match(source, /Fastify\(\{[\s\S]*trustProxy:\s*true/);
});
