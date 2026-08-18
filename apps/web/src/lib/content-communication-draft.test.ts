import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildContentCommunicationDraft } from './content-communication-draft';

test('gera mensagem de evento com local, data e horário', () => {
  const draft = buildContentCommunicationDraft('events', {
    id: 'e1', title: 'Encontro', description: 'Conversa com apoiadores', location: 'Praça Central',
    date: '2026-08-20T00:00:00.000Z', time: '19:00', published: true,
    createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z',
  });
  assert.match(draft.message, /Praça Central/);
  assert.match(draft.message, /20\/08\/2026/);
  assert.match(draft.message, /19:00/);
});

test('gera mensagens de post e live com links reais e sem campos vazios', () => {
  const post = buildContentCommunicationDraft('posts', {
    id: 'p1', title: 'Notícia', description: 'Atualização', imageUrl: null,
    videoUrl: 'https://example.com/video', category: 'GERAL', published: true,
    publishedAt: '2026-08-18T00:00:00.000Z', createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z',
  });
  assert.match(post.message, /https:\/\/example.com\/video/);
  assert.doesNotMatch(post.message, /undefined|null/);
  const live = buildContentCommunicationDraft('lives', {
    id: 'l1', title: 'Ao vivo', description: 'Conversa', thumbnailUrl: null,
    youtubeUrl: 'https://youtube.com/watch?v=1', scheduledAt: '2026-08-20T22:00:00.000Z', published: true,
    createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z',
  });
  assert.match(live.message, /youtube\.com/);
  assert.match(live.message, /Data e horário/);
});

test('ContentManager remove fluxo antigo e oferece Criar comunicação', () => {
  const source = readFileSync(new URL('../components/admin/content-manager.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Enviar WhatsApp|WhatsappModal/);
  assert.match(source, /Criar comunicação/);
});
