import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildContentCommunicationDraft, consumeContentCommunicationDraft, saveContentCommunicationDraft } from './content-communication-draft';
import { applyUploadedMediaUrl } from './post-media-upload';
import { buildManualWhatsappLink } from './manual-whatsapp';

function postDraft(overrides: { description?: string; imageUrl?: string | null; videoUrl?: string | null } = {}) {
  return buildContentCommunicationDraft('posts', {
    id: 'p1', title: 'Notícia', description: overrides.description ?? 'Atualização importante',
    imageUrl: overrides.imageUrl ?? null, videoUrl: overrides.videoUrl ?? null,
    category: 'GERAL', published: true, publishedAt: '2026-08-18T00:00:00.000Z',
    authorName: 'Admin Campanha',
    createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z',
  });
}

test('gera mensagem de evento com local, data e horário', () => {
  const draft = buildContentCommunicationDraft('events', {
    id: 'e1', title: 'Encontro', description: 'Conversa com apoiadores', location: 'Praça Central',
    date: '2026-08-20T00:00:00.000Z', time: '19:00', published: true,
    authorName: 'Admin Campanha',
    createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z',
  });
  assert.match(draft.message, /Praça Central/);
  assert.match(draft.message, /20\/08\/2026/);
  assert.match(draft.message, /19:00/);
});

test('gera mensagens de post e live com links reais e sem campos vazios', () => {
  const post = postDraft({ videoUrl: 'https://example.com/video' });
  assert.match(post.message, /https:\/\/example.com\/video/);
  assert.doesNotMatch(post.message, /undefined|null/);
  const live = buildContentCommunicationDraft('lives', {
    id: 'l1', title: 'Ao vivo', description: 'Conversa', thumbnailUrl: null,
    youtubeUrl: 'https://youtube.com/watch?v=1', scheduledAt: '2026-08-20T22:00:00.000Z', published: true,
    authorName: 'Admin Campanha',
    createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z',
  });
  assert.match(live.message, /youtube\.com/);
  assert.match(live.message, /Data e horário/);
});

test('post sem mídia preserva o texto original sem bloco de link', () => {
  const draft = postDraft();
  assert.match(draft.message, /Notícia/);
  assert.match(draft.message, /Atualização importante/);
  assert.match(draft.message, /Acompanhe as novidades\./);
  assert.doesNotMatch(draft.message, /Veja a imagem|Assista ao vídeo/);
});

test('post somente com imagem inclui URL manual claramente', () => {
  const draft = postDraft({ imageUrl: 'https://example.com/imagem.jpg' });
  assert.match(draft.message, /Veja a imagem:\nhttps:\/\/example\.com\/imagem\.jpg/);
  assert.doesNotMatch(draft.message, /Assista ao vídeo/);
});

test('post somente com vídeo inclui URL Cloudinary claramente', () => {
  const url = 'https://res.cloudinary.com/campanha/video/upload/v1/video.mp4';
  const draft = postDraft({ videoUrl: url });
  assert.match(draft.message, /Assista ao vídeo:/);
  assert.equal(draft.message.includes(url), true);
});

test('post com imagem e vídeo não omite nenhuma mídia', () => {
  const imageUrl = 'https://res.cloudinary.com/campanha/image/upload/imagem.webp';
  const videoUrl = 'https://example.com/video.webm';
  const draft = postDraft({ imageUrl, videoUrl });
  assert.match(draft.message, /Veja a imagem:/);
  assert.match(draft.message, /Assista ao vídeo:/);
  assert.equal(draft.message.includes(imageUrl), true);
  assert.equal(draft.message.includes(videoUrl), true);
  assert.equal(draft.message.indexOf(imageUrl) < draft.message.indexOf(videoUrl), true);
});

test('não duplica URL que já existe no conteúdo original', () => {
  const url = 'https://example.com/video.mp4';
  const draft = postDraft({ description: `Confira agora: ${url}`, videoUrl: url });
  assert.equal(draft.message.split(url).length - 1, 1);
  assert.doesNotMatch(draft.message, /Assista ao vídeo:/);
});

test('ContentManager remove fluxo antigo e oferece Criar comunicação', () => {
  const source = readFileSync(new URL('../components/admin/content-manager.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Enviar WhatsApp|WhatsappModal/);
  assert.match(source, /Criar comunicação/);
});

test('upload Cloudinary e URL manual percorrem o mesmo pipeline até sessionStorage', () => {
  const cloudinaryVideo = 'https://res.cloudinary.com/campanha/video/upload/v1/apresentacao.mp4';
  const manualImage = 'https://cdn.example.com/apresentacao.jpg';
  const uploadedForm = applyUploadedMediaUrl({
    title: 'Apresentação Paula Quintanilha', description: 'Conheça a história', category: 'VIDEO', imageUrl: manualImage,
  }, 'video', cloudinaryVideo);
  const post = {
    id: 'post-1', ...uploadedForm, imageUrl: uploadedForm.imageUrl || null, videoUrl: uploadedForm.videoUrl || null,
    published: true, publishedAt: '2026-08-23T12:00:00.000Z', authorName: 'Admin Campanha',
    createdAt: '2026-08-23T12:00:00.000Z', updatedAt: '2026-08-23T12:00:00.000Z',
  };
  const values = new Map<string, string>();
  const storage = {
    setItem: (key: string, value: string) => values.set(key, value),
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => { values.delete(key); },
  };
  const saved = saveContentCommunicationDraft(storage, 'posts', post);
  const consumed = consumeContentCommunicationDraft(storage);
  assert.deepEqual(consumed, saved);
  assert.equal(consumed?.message.includes(manualImage), true);
  assert.equal(consumed?.message.includes(cloudinaryVideo), true);
  assert.equal(values.size, 0);
});

test('wa.me recebe sem perda a mensagem completa consumida do rascunho', () => {
  const videoUrl = 'https://res.cloudinary.com/campanha/video/upload/v1/video.mp4';
  const draft = postDraft({ videoUrl });
  const whatsappUrl = buildManualWhatsappLink('21999990000', draft.message);
  assert.ok(whatsappUrl);
  const encodedMessage = whatsappUrl.split('?text=')[1];
  assert.equal(decodeURIComponent(encodedMessage), draft.message);
  assert.equal(decodeURIComponent(encodedMessage).includes(videoUrl), true);
});

test('tela de comunicação consome o helper centralizado e preenche a mensagem', () => {
  const source = readFileSync(new URL('../app/dashboard/comunicacao/sessoes/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /consumeContentCommunicationDraft\(sessionStorage\)/);
  assert.match(source, /setMessage\(draft\.message\)/);
});
