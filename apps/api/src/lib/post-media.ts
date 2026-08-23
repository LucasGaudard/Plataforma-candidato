import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const POST_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const POST_DIRECT_VIDEO_MAX_BYTES = 500 * 1024 * 1024;

export type PostMediaKind = 'image' | 'video';

const MEDIA_RULES = {
  image: {
    maxBytes: POST_IMAGE_MAX_BYTES,
    mimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
    extensions: new Set(['jpg', 'jpeg', 'png', 'webp']),
  },
  video: {
    maxBytes: POST_VIDEO_MAX_BYTES,
    mimeTypes: new Set(['video/mp4', 'video/webm']),
    extensions: new Set(['mp4', 'webm']),
  },
} as const;

export function validatePostMediaMetadata(kind: PostMediaKind, filename: string, mimetype: string): string | null {
  const rule = MEDIA_RULES[kind];
  if (!filename || filename.includes('\0') || filename.includes('/') || filename.includes('\\')) {
    return 'Nome de arquivo inválido.';
  }
  const extension = filename.toLowerCase().split('.').pop() || '';
  if (!rule.mimeTypes.has(mimetype as never) || !rule.extensions.has(extension as never)) {
    return kind === 'image'
      ? 'Imagem inválida. Use JPG, PNG ou WebP.'
      : 'Vídeo inválido. Use MP4 ou WebM.';
  }
  return null;
}

export function validateDirectVideoUpload(filename: string, mimetype: string, size: number): string | null {
  const metadataError = validatePostMediaMetadata('video', filename, mimetype);
  if (metadataError) return metadataError;
  if (!Number.isSafeInteger(size) || size <= 0) return 'Tamanho de vídeo inválido.';
  if (size > POST_DIRECT_VIDEO_MAX_BYTES) return 'O vídeo deve ter no máximo 500 MB.';
  return null;
}

export class PostMediaTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super('Arquivo acima do limite permitido.');
  }
}

export function mediaSizeLimit(kind: PostMediaKind) {
  let received = 0;
  const maxBytes = MEDIA_RULES[kind].maxBytes;
  return new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      callback(received > maxBytes ? new PostMediaTooLargeError(maxBytes) : null, chunk);
    },
  });
}

export async function pipePostMedia(
  kind: PostMediaKind,
  input: Readable,
  output: NodeJS.WritableStream,
) {
  await pipeline(input, mediaSizeLimit(kind), output);
}
