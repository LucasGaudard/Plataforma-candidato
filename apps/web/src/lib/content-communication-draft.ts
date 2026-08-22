import type { EventPublic, LivePublic, PostPublic } from '@platform/types';

export interface CommunicationDraft {
  title: string;
  message: string;
}

function compact(lines: Array<string | null | undefined>) {
  return lines.filter((line): line is string => Boolean(line?.trim())).join('\n\n');
}

function postMediaBlocks(post: PostPublic, originalText: string) {
  const blocks: string[] = [];
  let messageWithLinks = originalText;
  const addLink = (label: string, url: string | null) => {
    const normalizedUrl = url?.trim();
    if (!normalizedUrl || messageWithLinks.includes(normalizedUrl)) return;
    blocks.push(`${label}:\n${normalizedUrl}`);
    messageWithLinks += `\n${normalizedUrl}`;
  };

  addLink('Veja a imagem', post.imageUrl);
  addLink('Assista ao vídeo', post.videoUrl);
  return blocks;
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
  const originalContent = compact([
    'Olá!', 'Temos uma nova atualização da campanha:', post.title, post.description,
  ]);
  return {
    title: `Post: ${post.title}`,
    message: compact([
      originalContent,
      ...postMediaBlocks(post, originalContent),
      'Acompanhe as novidades.',
    ]),
  };
}
