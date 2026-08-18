import type { EventPublic, LivePublic, PostPublic } from '@platform/types';

export interface CommunicationDraft {
  title: string;
  message: string;
}

function compact(lines: Array<string | null | undefined>) {
  return lines.filter((line): line is string => Boolean(line?.trim())).join('\n\n');
}

export function buildContentCommunicationDraft(
  type: 'posts' | 'events' | 'lives',
  item: PostPublic | EventPublic | LivePublic,
): CommunicationDraft {
  if (type === 'events') {
    const event = item as EventPublic;
    return {
      title: `Evento: ${event.title}`,
      message: compact([
        'Olá!', 'Temos um novo evento:', event.title, event.description,
        event.location ? `Local: ${event.location}` : null,
        event.date ? `Data: ${new Date(event.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : null,
        event.time ? `Horário: ${event.time}` : null,
        'Acompanhe as novidades.',
      ]),
    };
  }
  if (type === 'lives') {
    const live = item as LivePublic;
    return {
      title: `Live: ${live.title}`,
      message: compact([
        'Olá!', 'Temos uma nova live:', live.title, live.description,
        live.scheduledAt ? `Data e horário: ${new Date(live.scheduledAt).toLocaleString('pt-BR')}` : null,
        live.youtubeUrl ? `Link: ${live.youtubeUrl}` : null,
        'Acompanhe as novidades.',
      ]),
    };
  }
  const post = item as PostPublic;
  return {
    title: `Post: ${post.title}`,
    message: compact([
      'Olá!', 'Temos uma nova atualização da campanha:', post.title, post.description,
      post.videoUrl ? `Link: ${post.videoUrl}` : post.imageUrl ? `Link: ${post.imageUrl}` : null,
      'Acompanhe as novidades.',
    ]),
  };
}
