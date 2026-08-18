import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { manualCommunicationRoutes } from './manual-communications';

test('registra POST de elegíveis no prefixo esperado', async () => {
  const app = Fastify();
  app.decorate('authenticate', async () => undefined);
  app.decorate('authorize', () => async () => undefined);
  await app.register(manualCommunicationRoutes, { prefix: '/campaign/manual-communications' });
  await app.ready();
  assert.equal(app.hasRoute({ method: 'POST', url: '/campaign/manual-communications/eligible' }), true);
  await app.close();
});
