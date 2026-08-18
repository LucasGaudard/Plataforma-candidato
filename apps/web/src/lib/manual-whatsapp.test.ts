import assert from 'node:assert/strict';
import test from 'node:test';
import { buildManualWhatsappLink, canUseManualWhatsapp, removeSentItemFromManualQueue } from './manual-whatsapp';

test('monta link oficial com DDI e mensagem codificada', () => {
  assert.equal(
    buildManualWhatsappLink('(11) 99999-0000', 'Olá, equipe!'),
    'https://wa.me/5511999990000?text=Ol%C3%A1%2C%20equipe!',
  );
});

test('aceita telefone que já contém DDI sem duplicá-lo', () => {
  assert.equal(buildManualWhatsappLink('+55 11 99999-0000', 'Oi'), 'https://wa.me/5511999990000?text=Oi');
});

test('codifica caracteres que poderiam criar parâmetros extras', () => {
  assert.equal(
    buildManualWhatsappLink('5511999990000', 'Olá & confirma? sim=1'),
    'https://wa.me/5511999990000?text=Ol%C3%A1%20%26%20confirma%3F%20sim%3D1',
  );
});

test('rejeita telefone inválido e opt-out', () => {
  assert.equal(buildManualWhatsappLink('123', 'Oi'), null);
  assert.equal(canUseManualWhatsapp('(11) 99999-0000', 'OPT_OUT'), false);
  assert.equal(canUseManualWhatsapp('123', 'PENDING'), false);
});

test('marcar enviada remove imediatamente o apoiador e atualiza os totais', () => {
  const queue = {
    items: [{ id: 'supporter-1', firstName: 'Ana', lastName: 'Silva', phone: '11999990000', origin: 'DIRECT' as const, originName: null, createdAt: '2026-08-18T10:00:00.000Z' }],
    totalPending: 1,
    totalSent: 3,
    filters: { leaders: [], coordinators: [], neighborhoods: [] },
  };
  assert.deepEqual(removeSentItemFromManualQueue(queue, 'supporter-1'), {
    ...queue, items: [], totalPending: 0, totalSent: 4,
  });
});
