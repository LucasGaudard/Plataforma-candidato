import { PostCategory } from '@platform/types';

const POST_CATEGORIES = Object.values(PostCategory);
const URL_REGEX = /^https?:\/\/.+/i;
const YOUTUBE_REGEX = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i;

export function isValidUrl(url: string): boolean {
  return URL_REGEX.test(url.trim());
}

export function isValidYoutubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url.trim());
}

export function validatePostInput(input: {
  title?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  category?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.title?.trim() || input.title.trim().length < 3) {
    errors.title = 'Título deve ter pelo menos 3 caracteres';
  }

  if (!input.description?.trim() || input.description.trim().length < 10) {
    errors.description = 'Descrição deve ter pelo menos 10 caracteres';
  }

  if (input.category && !POST_CATEGORIES.includes(input.category as PostCategory)) {
    errors.category = 'Categoria inválida';
  }

  if (input.imageUrl?.trim() && !isValidUrl(input.imageUrl)) {
    errors.imageUrl = 'URL da imagem inválida';
  }

  if (input.videoUrl?.trim() && !isValidUrl(input.videoUrl)) {
    errors.videoUrl = 'URL do vídeo inválida';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateEventInput(input: {
  title?: string;
  description?: string;
  location?: string;
  date?: string;
  time?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.title?.trim() || input.title.trim().length < 3) {
    errors.title = 'Título deve ter pelo menos 3 caracteres';
  }

  if (!input.description?.trim() || input.description.trim().length < 10) {
    errors.description = 'Descrição deve ter pelo menos 10 caracteres';
  }

  if (!input.location?.trim() || input.location.trim().length < 3) {
    errors.location = 'Local inválido';
  }

  if (!input.date || Number.isNaN(Date.parse(input.date))) {
    errors.date = 'Data inválida';
  }

  if (!input.time?.trim()) {
    errors.time = 'Horário é obrigatório';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateLiveInput(input: {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  youtubeUrl?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.title?.trim() || input.title.trim().length < 3) {
    errors.title = 'Título deve ter pelo menos 3 caracteres';
  }

  if (!input.description?.trim() || input.description.trim().length < 10) {
    errors.description = 'Descrição deve ter pelo menos 10 caracteres';
  }

  if (!input.youtubeUrl?.trim() || !isValidYoutubeUrl(input.youtubeUrl)) {
    errors.youtubeUrl = 'Link do YouTube inválido';
  }

  if (input.thumbnailUrl?.trim() && !isValidUrl(input.thumbnailUrl)) {
    errors.thumbnailUrl = 'URL da thumbnail inválida';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function parsePagination(query: {
  page?: string | number;
  limit?: string | number;
}): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
