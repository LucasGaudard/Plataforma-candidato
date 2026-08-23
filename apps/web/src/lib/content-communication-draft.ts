import type { EventPublic, LivePublic, PostPublic } from '@platform/types';

export interface CommunicationDraft {
  title: string;
  message: string;
}

export const MANUAL_COMMUNICATION_DRAFT_STORAGE_KEY = 'manualCommunicationDraft';

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

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

export function saveContentCommunicationDraft(
  storage: Pick<DraftStorage, 'setItem'>,
  type: 'posts' | 'events' | 'lives',
  item: PostPublic | EventPublic | LivePublic,
) {
  const draft = buildContentCommunicationDraft(type, item);
  storage.setItem(MANUAL_COMMUNICATION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  return draft;
}

export function consumeContentCommunicationDraft(
  storage: Pick<DraftStorage, 'getItem' | 'removeItem'>,
): CommunicationDraft | null {
  const serialized = storage.getItem(MANUAL_COMMUNICATION_DRAFT_STORAGE_KEY);
  if (!serialized) return null;
  storage.removeItem(MANUAL_COMMUNICATION_DRAFT_STORAGE_KEY);
  try {
    const draft = JSON.parse(serialized) as Partial<CommunicationDraft>;
    return typeof draft.title === 'string' && typeof draft.message === 'string'
      ? { title: draft.title, message: draft.message }
      : null;
  } catch {
    return null;
  }
}
