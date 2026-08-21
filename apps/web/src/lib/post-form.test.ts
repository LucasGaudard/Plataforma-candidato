import assert from 'node:assert/strict';
import test from 'node:test';
import { PostCategory, type PostPublic } from '@platform/types';
import { datetimeLocalValueToIso, isoToDatetimeLocalValue, postToForm } from './post-form';

const post: PostPublic = {
  id: 'post-1',
  title: 'Um post de teste',
  description: 'Descrição completa do post',
  imageUrl: 'https://cdn.example.com/image.jpg',
  videoUrl: 'https://cdn.example.com/video.mp4',
  category: PostCategory.GERAL,
  publishedAt: '2026-08-20T15:30:00.000Z',
  published: true,
  authorName: 'Admin Teste',
  createdAt: '2026-08-20T15:00:00.000Z',
  updatedAt: '2026-08-20T15:00:00.000Z',
};

test('edição preserva URLs existentes de imagem e vídeo', () => {
  const form = postToForm(post);
  assert.equal(form.imageUrl, post.imageUrl);
  assert.equal(form.videoUrl, post.videoUrl);
  assert.equal(form.category, post.category);
});

test('ISO é exibido em datetime-local no horário local e volta ao mesmo instante', () => {
  const localValue = isoToDatetimeLocalValue(post.publishedAt);
  assert.equal(datetimeLocalValueToIso(localValue), post.publishedAt);
});

test('data vazia permanece vazia sem Invalid Date', () => {
  assert.equal(isoToDatetimeLocalValue(undefined), '');
  assert.equal(datetimeLocalValueToIso(''), undefined);
});

test('alterar datetime-local gera ISO válido para persistência', () => {
  const iso = datetimeLocalValueToIso('2026-09-10T19:45');
  assert.equal(Number.isNaN(Date.parse(iso || '')), false);
  assert.equal(isoToDatetimeLocalValue(iso), '2026-09-10T19:45');
});
