import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma, Role } from '@prisma/client';
import {
  deleteSupporterWithinScope,
  supporterDeletionBlockers,
  supporterScope,
  manualWhatsappQueueWhere,
  partitionManualWhatsappQueue,
  supporterSearchWhere,
} from './supporter-management';

test('fila manual combina status e filtros sem substituir o escopo', () => {
  const scope = supporterScope(Role.LEADER, 'leader-1', 'campaign-1')!;
  assert.deepEqual(manualWhatsappQueueWhere(scope, { zone: 'NORTH', neighborhood: 'Centro' }), {
    AND: [
      scope,
      { whatsappStatus: { not: 'OPT_OUT' } },
      { zone: 'NORTH' },
      { neighborhood: { equals: 'Centro', mode: 'insensitive' } },
    ],
  });
});

test('fila manual exibe pendente válido e exclui enviado ou telefone inválido apó reload', () => {
  const sentAt = new Date('2026-08-18T12:00:00.000Z');
  const result = partitionManualWhatsappQueue([
    { id: 'pending', phone: '11999990000', whatsappInitialMessageSentAt: null },
    { id: 'sent', phone: '11999990001', whatsappInitialMessageSentAt: sentAt },
    { id: 'invalid', phone: '123', whatsappInitialMessageSentAt: null },
  ]);
  assert.deepEqual(result.pending.map((item) => item.id), ['pending']);
  assert.deepEqual(result.sent.map((item) => item.id), ['sent']);
});

test('busca nome completo por termos em nome e sobrenome', () => {
  const where = supporterSearchWhere('  Maria   da Silva  ');
  const terms = where?.AND as Array<{ OR: unknown[] }>;
  assert.equal(terms.length, 3);
  assert.equal(terms.every((term) => term.OR.length === 2), true);
});

test('busca parcial e sem distinção de maiúsculas usa contains insensitive', () => {
  const where = supporterSearchWhere('mAr') as { AND: Array<{ OR: Array<{ firstName?: { contains: string; mode: string } }> }> };
  assert.deepEqual(where.AND[0].OR[0], { firstName: { contains: 'mAr', mode: 'insensitive' } });
});

test('busca telefone formatado usa somente os dígitos', () => {
  const where = supporterSearchWhere('(21) 96950-1194') as { OR: Array<unknown> };
  assert.deepEqual(where.OR[1], { phone: { contains: '21969501194' } });
});

test('busca telefone internacional remove o DDI 55 para comparar com o banco', () => {
  const where = supporterSearchWhere('+55 (21) 96950-1194') as { OR: Array<unknown> };
  assert.deepEqual(where.OR[1], { phone: { contains: '21969501194' } });
});

test('busca textual não cria phone contains vazio', () => {
  const serialized = JSON.stringify(supporterSearchWhere('Maria'));
  assert.equal(serialized.includes('"phone"'), false);
  assert.equal(supporterSearchWhere('   '), undefined);
});

test('escopos preservam campanha, role e hierarquia', () => {
  assert.deepEqual(supporterScope(Role.ADMIN, 'admin-1', 'campaign-1'), {
    role: Role.USER,
    campaignId: 'campaign-1',
  });
  assert.deepEqual(supporterScope(Role.LEADER, 'leader-1', 'campaign-1'), {
    role: Role.USER,
    campaignId: 'campaign-1',
    leaderId: 'leader-1',
  });
  const coordinator = supporterScope(Role.COORDINATOR, 'coordinator-1', 'campaign-1');
  assert.equal(JSON.stringify(coordinator).includes('coordinator-1'), true);
  assert.equal(JSON.stringify(coordinator).includes('campaign-1'), true);
  assert.equal(supporterScope(Role.USER, 'user-1', 'campaign-1'), null);
});

test('relacionamentos estruturais e conteúdo bloqueiam exclusão', () => {
  assert.deepEqual(supporterDeletionBlockers({ posts: 0, events: 0, lives: 0, supporters: 0, leaders: 0 }), []);
  const blockers = supporterDeletionBlockers({ posts: 1, events: 0, lives: 0, supporters: 2, leaders: 0 });
  assert.deepEqual(blockers.map((item) => item.type), ['posts', 'supporters']);
});

test('exclusão autorizada remove notificações e o User na mesma transação', async () => {
  const calls: string[] = [];
  const database = {
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) => operation({
      user: {
        findFirst: async () => ({
          id: 'supporter-1',
          _count: { posts: 0, events: 0, lives: 0, notifications: 2, supporters: 0, leaders: 0 },
        }),
        delete: async () => { calls.push('user.delete'); },
      },
      notification: {
        deleteMany: async () => { calls.push('notification.deleteMany'); return { count: 2 }; },
      },
    }),
  };
  const result = await deleteSupporterWithinScope(
    { id: 'supporter-1', role: Role.USER, campaignId: 'campaign-1' },
    database as never,
  );
  assert.deepEqual(result, { kind: 'deleted', removed: { notifications: 2 } });
  assert.deepEqual(calls, ['notification.deleteMany', 'user.delete']);
});

test('apoiador inexistente não executa exclusão', async () => {
  const database = {
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) => operation({
      user: {
        findFirst: async () => null,
        delete: async () => assert.fail('não deveria excluir'),
      },
      notification: { deleteMany: async () => assert.fail('não deveria remover notificações') },
    }),
  };
  const result = await deleteSupporterWithinScope({ id: 'missing' }, database as never);
  assert.deepEqual(result, { kind: 'not_found' });
});

test('exclusão repetida retorna não encontrado sem executar delete duas vezes', async () => {
  let exists = true;
  let deletions = 0;
  const database = {
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) => operation({
      user: {
        findFirst: async () => exists
          ? { id: 'supporter-1', _count: { posts: 0, events: 0, lives: 0, notifications: 0, supporters: 0, leaders: 0 } }
          : null,
        delete: async () => { exists = false; deletions += 1; },
      },
      notification: { deleteMany: async () => ({ count: 0 }) },
    }),
  };
  const first = await deleteSupporterWithinScope({ id: 'supporter-1' }, database as never);
  const second = await deleteSupporterWithinScope({ id: 'supporter-1' }, database as never);
  assert.equal(first.kind, 'deleted');
  assert.deepEqual(second, { kind: 'not_found' });
  assert.equal(deletions, 1);
});

test('conflito serializável é repetido uma vez e termina como não encontrado', async () => {
  let transactions = 0;
  const database = {
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) => {
      transactions += 1;
      if (transactions === 1) {
        throw new Prisma.PrismaClientKnownRequestError('conflito', {
          code: 'P2034',
          clientVersion: '5.22.0',
        });
      }
      return operation({
        user: { findFirst: async () => null },
        notification: { deleteMany: async () => ({ count: 0 }) },
      });
    },
  };
  const result = await deleteSupporterWithinScope({ id: 'supporter-1' }, database as never);
  assert.deepEqual(result, { kind: 'not_found' });
  assert.equal(transactions, 2);
});
