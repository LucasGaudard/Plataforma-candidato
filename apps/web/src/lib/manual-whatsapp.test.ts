import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildManualWhatsappLink, canUseManualWhatsapp, createManualWhatsappOpener, MANUAL_WHATSAPP_WINDOW_NAME, removeSentItemFromManualQueue } from './manual-whatsapp';

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

test('desktop cria janela nomeada, reutiliza e atualiza URL do próximo contato', () => {
  const calls: Array<{ url: string; target: string }> = [];
  let focused = 0;
  const handle = { closed: false, location: { href: '' }, focus: () => { focused += 1; }, opener: {} as unknown };
  const open = createManualWhatsappOpener({
    getWindow: () => ({ navigator: { userAgent: 'Desktop' }, open: (url, target) => { calls.push({ url, target }); handle.location.href = url; return handle; } }),
    now: () => 1000,
  });
  assert.equal(open('11999990000', 'Primeira'), 'OPENED');
  assert.equal(open('11999990001', 'Segunda'), 'REUSED');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, MANUAL_WHATSAPP_WINDOW_NAME);
  assert.match(handle.location.href, /5511999990001/);
  assert.equal(focused, 2);
});

test('janela fechada é recriada no próximo contato', () => {
  const handles = [
    { closed: true, location: { href: '' }, focus: () => undefined },
    { closed: false, location: { href: '' }, focus: () => undefined },
  ];
  let calls = 0;
  const open = createManualWhatsappOpener({
    getWindow: () => ({ navigator: { userAgent: 'Desktop' }, open: () => handles[calls++] }),
    now: () => 1000,
  });
  assert.equal(open('11999990000', 'Primeira'), 'OPENED');
  assert.equal(open('11999990001', 'Segunda'), 'OPENED');
  assert.equal(calls, 2);
});

test('mobile preserva abertura externa e clique duplo não abre duas vezes', () => {
  const targets: string[] = [];
  const open = createManualWhatsappOpener({
    getWindow: () => ({ navigator: { userAgent: 'Mozilla/5.0 (iPhone)' }, open: (_url, target) => { targets.push(target); return { focus: () => undefined }; } }),
    now: () => 1000,
  });
  assert.equal(open('11999990000', 'Mensagem'), 'MOBILE');
  assert.equal(open('11999990000', 'Mensagem'), 'DUPLICATE');
  assert.deepEqual(targets, ['_blank']);
});

test('os dois fluxos de fila usam o helper compartilhado e não chamam window.open', () => {
  for (const relativePath of [
    '../app/dashboard/comunicacao/novos-apoiadores/page.tsx',
    '../app/dashboard/comunicacao/sessoes/page.tsx',
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    assert.match(source, /openManualWhatsappConversation/);
    assert.doesNotMatch(source, /window\.open/);
  }
});
