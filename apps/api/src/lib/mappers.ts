import type { Post, Event, Live, Notification, User } from '@prisma/client';
import type {
  EventPublic,
  LivePublic,
  NotificationPublic,
  PostCategory,
  PostPublic,
  NotificationType,
} from '@platform/types';

type AuthorPick = Pick<User, 'firstName' | 'lastName'>;

export function toPostPublic(
  post: Post & { author: AuthorPick },
): PostPublic {
  return {
    id: post.id,
    title: post.title,
    description: post.description,
    imageUrl: post.imageUrl,
    videoUrl: post.videoUrl,
    category: post.category as PostCategory,
    publishedAt: post.publishedAt.toISOString(),
    published: post.published,
    authorName: `${post.author.firstName} ${post.author.lastName}`,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export function toEventPublic(
  event: Event & { author: AuthorPick },
): EventPublic {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    date: event.date.toISOString(),
    time: event.time,
    published: event.published,
    authorName: `${event.author.firstName} ${event.author.lastName}`,
    createdAt: event.createdAt.toISOString(),
  };
}

export function toLivePublic(
  live: Live & { author: AuthorPick },
): LivePublic {
  return {
    id: live.id,
    title: live.title,
    description: live.description,
    thumbnailUrl: live.thumbnailUrl,
    youtubeUrl: live.youtubeUrl,
    published: live.published,
    scheduledAt: live.scheduledAt?.toISOString() ?? null,
    authorName: `${live.author.firstName} ${live.author.lastName}`,
    createdAt: live.createdAt.toISOString(),
  };
}

export function toNotificationPublic(notification: Notification): NotificationPublic {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    type: notification.type as NotificationType,
    link: notification.link,
    createdAt: notification.createdAt.toISOString(),
  };
}
