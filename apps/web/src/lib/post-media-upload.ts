import type { CreatePostRequest } from '@platform/types';

export type PostMediaKind = 'image' | 'video';
export const POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const POST_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const POST_DIRECT_VIDEO_MAX_BYTES = 500 * 1024 * 1024;

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
  const maxBytes = kind === 'image' ? POST_IMAGE_MAX_BYTES : POST_DIRECT_VIDEO_MAX_BYTES;
  if (file.size > maxBytes) {
    return `O arquivo deve ter no máximo ${kind === 'image' ? '10 MB' : '500 MB'}.`;
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

export type PostMediaUploadDiagnostic = {
  code: string;
  status?: number;
  endpoint?: string;
  stage: string;
  message: string;
};

export function diagnosePostMediaUploadError(error: unknown, kind: PostMediaKind): PostMediaUploadDiagnostic {
  const value = error as { code?: string; status?: number; endpoint?: string; stage?: string; message?: string };
  const status = typeof value?.status === 'number' ? value.status : undefined;
  const code = value?.code || (status ? `HTTP_${status}` : 'UPLOAD_NETWORK_ERROR');
  const messages: Record<string, string> = {
    HTTP_401: 'Sua sessão expirou. Entre novamente para enviar mídia.',
    HTTP_403: 'Seu usuário não tem permissão para enviar mídia.',
    HTTP_404: 'O serviço de upload não está disponível nesta versão da API.',
    UPLOAD_TOO_LARGE: `O ${kind === 'image' ? 'arquivo' : 'vídeo'} excede o tamanho permitido.`,
    CLOUDINARY_NOT_CONFIGURED: 'O serviço de mídia não está configurado no servidor.',
    CLOUDINARY_NETWORK_ERROR: 'Não foi possível conectar ao serviço de vídeo. Verifique a rede e tente novamente.',
    CLOUDINARY_UPLOAD_REJECTED: 'O serviço de vídeo recusou o arquivo. Verifique o formato e os limites da conta.',
  };
  return {
    code,
    status,
    endpoint: value?.endpoint,
    stage: value?.stage || (value?.endpoint?.includes('/authorize') ? 'UPLOAD_AUTHORIZATION' : kind === 'video' ? 'VIDEO_UPLOAD' : 'IMAGE_UPLOAD'),
    message: messages[code] || value?.message || 'Não foi possível enviar mídia. Tente novamente.',
  };
}
