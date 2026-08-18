import assert from 'node:assert/strict';
import test from 'node:test';
import { applyManualRecipientAction } from './manual-communication-session';

test('progresso remove pendente, preserva histórico e conclui a sessão', () => {
  const session = {
    id: 'session-1', title: 'Teste', message: 'Mensagem', filters: {}, requestedQuantity: 1,
    status: 'ACTIVE' as const, createdByUserId: 'user-1', createdByName: 'Ana',
    createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z',
    counts: { PENDING: 1, SENT: 0, SKIPPED: 0, OPT_OUT: 0 },
    recipients: [{ id: 'recipient-1', supporterId: 'supporter-1', supporterName: 'João', phone: '11999990000', status: 'PENDING' as const, sentAt: null, skippedAt: null, optOutAt: null }],
  };
  const updated = applyManualRecipientAction(session, 'recipient-1', 'SENT');
  assert.equal(updated.counts.PENDING, 0);
  assert.equal(updated.counts.SENT, 1);
  assert.equal(updated.status, 'COMPLETED');
  assert.equal(updated.recipients?.[0].status, 'SENT');
  assert.equal(applyManualRecipientAction(updated, 'recipient-1', 'SKIPPED'), updated);
});
