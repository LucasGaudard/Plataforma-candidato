import type { CreatePostRequest, PostPublic } from '@platform/types';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function isoToDatetimeLocalValue(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalValueToIso(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function postToForm(post: PostPublic): CreatePostRequest {
  return {
    title: post.title,
    description: post.description,
    imageUrl: post.imageUrl || '',
    videoUrl: post.videoUrl || '',
    category: post.category,
    published: post.published,
    publishedAt: post.publishedAt,
  };
}
