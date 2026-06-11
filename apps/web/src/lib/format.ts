import { PostCategory } from '@platform/types';

const CATEGORY_LABELS: Record<PostCategory, string> = {
  VIDEO: 'Vídeo',
  LIVE: 'Live',
  COMUNICADO: 'Comunicado',
  EVENTO: 'Evento',
  GERAL: 'Geral',
};

export function formatCategory(category: PostCategory): string {
  return CATEGORY_LABELS[category] || category;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string, time?: string): string {
  const d = formatDate(date);
  return time ? `${d} às ${time}` : d;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}
