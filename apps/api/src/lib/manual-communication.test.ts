import assert from 'node:assert/strict';
import test from 'node:test';
import { Role } from '@prisma/client';
import { supporterScope } from './supporter-management';
import { canProcessManualRecipient, classifyManualCommunicationAudience, manualCommunicationAudienceWhere, manualCommunicationSessionOwnerWhere, normalizeManualSelection, resolveManualCommunicationLimit, selectUniqueManualRecipients } from './manual-communication';

test('filtros permanecem combinados ao escopo da campanha e hierarquia', () => {
  const scope = supporterScope(Role.COORDINATOR, 'coord-1', 'campaign-1')!;
  const where = manualCommunicationAudienceWhere(scope, { city: 'Recife', leaderId: 'leader-1', registeredFrom: '2026-08-01' });
  assert.equal(Array.isArray(where.AND), true);
  assert.deepEqual((where.AND as unknown[])[0], scope);
  assert.deepEqual((where.AND as unknown[])[2], { leaderId: 'leader-1' });
});

test('prévia separa elegíveis, opt-out e telefones inválidos sem sobreposição', () => {
  const result = classifyManualCommunicationAudience([
    { id: 'eligible', phone: '11999990000', whatsappStatus: 'PENDING' },
    { id: 'optout', phone: '11999990001', whatsappStatus: 'OPT_OUT' },
    { id: 'invalid', phone: '123', whatsappStatus: 'PENDING' },
  ]);
  assert.equal(result.totalFound, 3);
  assert.deepEqual(result.eligible.map((item) => item.id), ['eligible']);
  assert.equal(result.excludedOptOut, 1);
  assert.equal(result.invalidPhone, 1);
});

test('limite respeita todos, opções fixas e quantidade disponível', () => {
  assert.equal(resolveManualCommunicationLimit('ALL', 80), 80);
  assert.equal(resolveManualCommunicationLimit(25, 80), 25);
  assert.equal(resolveManualCommunicationLimit(100, 40), 40);
  assert.throws(() => resolveManualCommunicationLimit(0, 40));
});

test('seleção limita a quantidade e não duplica apoiador na sessão', () => {
  assert.deepEqual(selectUniqueManualRecipients([{ id: 'a' }, { id: 'a' }, { id: 'b' }], 2), [{ id: 'a' }, { id: 'b' }]);
});

test('sessão sempre restringe campanha e criador', () => {
  assert.deepEqual(manualCommunicationSessionOwnerWhere('campaign-1', 'user-1', 'session-1'), {
    id: 'session-1', campaignId: 'campaign-1', createdByUserId: 'user-1',
  });
});

test('snapshot removido ou transferido para fora do escopo não permite ação atual', () => {
  assert.equal(canProcessManualRecipient(null), false);
  assert.equal(canProcessManualRecipient({ whatsappStatus: 'OPT_OUT' }), false);
  assert.equal(canProcessManualRecipient({ whatsappStatus: 'PENDING' }), true);
});

test('opt-out ocorrido depois da prévia é revalidado na criação', () => {
  const before = classifyManualCommunicationAudience([{ id: 'a', phone: '11999990000', whatsappStatus: 'PENDING' }]);
  const after = classifyManualCommunicationAudience([{ id: 'a', phone: '11999990000', whatsappStatus: 'OPT_OUT' }]);
  assert.equal(before.eligible.length, 1);
  assert.equal(after.eligible.length, 0);
  assert.equal(after.excludedOptOut, 1);
});

test('seleção individual remove duplicados e rejeita payload inválido', () => {
  assert.deepEqual(normalizeManualSelection({ mode: 'IDS', ids: ['a', 'a', 'b'] }), { mode: 'IDS', ids: ['a', 'b'] });
  assert.throws(() => normalizeManualSelection({ mode: 'IDS', ids: [] }));
  assert.throws(() => normalizeManualSelection({ mode: 'FIRST', count: 0 }));
});
