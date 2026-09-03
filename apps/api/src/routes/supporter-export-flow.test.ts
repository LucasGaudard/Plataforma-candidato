import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { Role } from '@platform/types';
import { registerAuth } from '../plugins/auth';
import { prisma } from '../lib/prisma';
import { adminRoutes } from './admin';

const routeSource = readFileSync('apps/api/src/routes/admin.ts', 'utf8');
const webApiSource = readFileSync('apps/web/src/lib/api.ts', 'utf8');
const pageSource = readFileSync('apps/web/src/app/dashboard/apoiadores/page.tsx', 'utf8');

test('endpoint é exclusivo de ADMIN e usa campaignId da autenticação', () => {
  assert.match(routeSource, /'\/supporters\/export'/);
  assert.match(routeSource, /fastify\.authenticate, fastify\.authorize\(Role\.ADMIN\)/);
  assert.match(routeSource, /role: Role\.USER,[\s\S]*campaignId: request\.user\.campaignId/);
  assert.doesNotMatch(routeSource, /supporters\/export[\s\S]{0,500}request\.(?:query|body).*campaignId/);
});

test('exportação inclui localização e vínculos sem paginação', () => {
  const exportBlock = routeSource.slice(routeSource.indexOf("'/supporters/export'"), routeSource.indexOf('fastify.delete', routeSource.indexOf("'/supporters/export'")));
  assert.match(exportBlock, /select:\s*\{[\s\S]*firstName: true,[\s\S]*lastName: true,[\s\S]*phone: true/);
  assert.match(exportBlock, /neighborhood: true/);
  assert.match(exportBlock, /zone: true/);
  for (const forbidden of ['skip', 'take', 'status:', 'whatsappStatus:']) {
    assert.doesNotMatch(exportBlock, new RegExp(forbidden));
  }
});

test('autorização e campanha são aplicadas pelo endpoint real', async () => {
  const app = Fastify();
  await app.register(jwt, { secret: 'export-test-secret' });
  await registerAuth(app);
  await app.register(adminRoutes, { prefix: '/admin' });

  const originalFindMany = prisma.user.findMany;
  const queries: unknown[] = [];
  (prisma.user as unknown as { findMany: (args: unknown) => Promise<unknown[]> }).findMany = async (args) => {
    queries.push(args);
    return [{ firstName: 'Ana', lastName: 'Campanha A', phone: '21999999999', city: 'Rio de Janeiro', state: 'RJ', neighborhood: 'Centro', zone: 'NORTH', coordinator: null, leader: null }];
  };

  try {
    const unauthenticated = await app.inject({ method: 'GET', url: '/admin/supporters/export' });
    assert.equal(unauthenticated.statusCode, 401);

    for (const role of [Role.LEADER, Role.COORDINATOR, Role.USER]) {
      const token = app.jwt.sign({ sub: `user-${role}`, email: 'role@test.local', role, campaignId: 'campaign-a' });
      const response = await app.inject({ method: 'GET', url: '/admin/supporters/export', headers: { authorization: `Bearer ${token}` } });
      assert.equal(response.statusCode, 403);
    }

    const token = app.jwt.sign({ sub: 'admin-a', email: 'admin@test.local', role: Role.ADMIN, campaignId: 'campaign-a' });
    const response = await app.inject({ method: 'GET', url: '/admin/supporters/export', headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.equal(response.rawPayload.subarray(0, 2).toString(), 'PK');
    assert.equal(queries.length, 1);
    assert.deepEqual(queries[0], {
      where: { role: Role.USER, campaignId: 'campaign-a' },
      select: {
        firstName: true, lastName: true, phone: true, city: true, state: true, neighborhood: true, zone: true,
        coordinator: { select: { firstName: true, lastName: true } },
        leader: { select: { firstName: true, lastName: true, coordinator: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ zone: 'asc' }, { neighborhood: 'asc' }, { firstName: 'asc' }],
    });
  } finally {
    (prisma.user as unknown as { findMany: typeof originalFindMany }).findMany = originalFindMany;
    await app.close();
  }
});

test('frontend baixa blob autenticado somente para ADMIN e expõe estado de exportação', () => {
  assert.match(webApiSource, /exportAdminSupporters\(filters:/);
  assert.match(webApiSource, /Authorization: `Bearer \$\{token\}`/);
  assert.match(webApiSource, /response\.blob\(\)/);
  assert.match(pageSource, /isAdmin &&/);
  assert.match(pageSource, /Exportar apoiadores/);
  assert.match(pageSource, /Exportando\.\.\./);
  assert.match(pageSource, /link\.download = 'apoiadores\.xlsx'/);
});
