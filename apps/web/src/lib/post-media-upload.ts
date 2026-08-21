import type { CreatePostRequest } from '@platform/types';

export type PostMediaKind = 'image' | 'video';
export const POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const POST_VIDEO_MAX_BYTES = 100 * 1024 * 1024;

const ACCEPTED_TYPES = {
  image: new Set(['image/jpeg', 'image/png', 'image/webp']),
  video: new Set(['video/mp4', 'video/webm']),
};

export function validatePostMediaFile(
  kind: PostMediaKind,
  file: Pick<File, 'name' | 'size' | 'type'>,
): string | null {
  if (!ACCEPTED_TYPES[kind].has(file.type)) {
    return kind === 'image' ? 'Use uma imagem JPG, PNG ou WebP.' : 'Use um vídeo MP4 ou WebM.';
  }
  const maxBytes = kind === 'image' ? POST_IMAGE_MAX_BYTES : POST_VIDEO_MAX_BYTES;
  if (file.size > maxBytes) {
    return `O arquivo deve ter no máximo ${kind === 'image' ? '10 MB' : '100 MB'}.`;
  }
  return null;
}

export function applyUploadedMediaUrl(
  form: CreatePostRequest,
  kind: PostMediaKind,
  secureUrl: string,
): CreatePostRequest {
  return { ...form, [kind === 'image' ? 'imageUrl' : 'videoUrl']: secureUrl };
}
