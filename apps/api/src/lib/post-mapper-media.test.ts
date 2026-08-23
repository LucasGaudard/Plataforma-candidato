import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PostCategory } from '@prisma/client';
import { toPostPublic } from './mappers';

test('DTO administrativo preserva imageUrl e videoUrl persistidos', () => {
  const imageUrl = 'https://res.cloudinary.com/campanha/image/upload/foto.webp';
  const videoUrl = 'https://res.cloudinary.com/campanha/video/upload/video.mp4';
  const mapped = toPostPublic({
    id: 'post-1', title: 'Apresentação', description: 'Descrição', imageUrl, videoUrl,
    category: PostCategory.VIDEO, published: true, publishedAt: new Date('2026-08-23T12:00:00Z'),
    authorId: 'admin-1', campaignId: 'campaign-1', createdAt: new Date('2026-08-23T12:00:00Z'),
    updatedAt: new Date('2026-08-23T12:00:00Z'), author: { firstName: 'Admin', lastName: 'Campanha' },
  });
  assert.equal(mapped.imageUrl, imageUrl);
  assert.equal(mapped.videoUrl, videoUrl);
});

test('POST e PUT persistem mídia e devolvem o DTO completo', () => {
  const routes = readFileSync('apps/api/src/routes/posts.ts', 'utf8');
  assert.match(routes, /imageUrl: body\.imageUrl\?\.trim\(\) \|\| null/);
  assert.match(routes, /videoUrl: body\.videoUrl\?\.trim\(\) \|\| null/);
  assert.match(routes, /body\.imageUrl !== undefined.*imageUrl: body\.imageUrl\?\.trim\(\) \|\| null/s);
  assert.match(routes, /body\.videoUrl !== undefined.*videoUrl: body\.videoUrl\?\.trim\(\) \|\| null/s);
  assert.equal(routes.match(/send\(toPostPublic\(post\)\)/g)?.length, 2);
});
