import type { PostPublic } from '@platform/types';
import { Badge, Card } from '@platform/ui';
import { formatCategory, formatDate } from '@/lib/format';

interface PostCardProps {
  post: PostPublic;
  compact?: boolean;
}

export function PostCard({ post, compact = false }: PostCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {post.imageUrl && (
        <div className={compact ? 'h-36' : 'h-48'}>
          <img
            src={post.imageUrl}
            alt={post.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className={post.imageUrl ? 'p-4' : ''}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="info">{formatCategory(post.category)}</Badge>
          <span className="text-xs text-slate-400">{formatDate(post.publishedAt)}</span>
        </div>
        <h3 className={`font-bold text-brand-900 ${compact ? 'text-base' : 'text-lg'}`}>
          {post.title}
        </h3>
        <p className={`mt-2 text-slate-600 ${compact ? 'line-clamp-2 text-sm' : 'line-clamp-3 text-sm'}`}>
          {post.description}
        </p>
        {post.videoUrl && (
          <a
            href={post.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
          >
            Assistir vídeo →
          </a>
        )}
      </div>
    </Card>
  );
}
