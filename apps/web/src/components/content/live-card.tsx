import type { LivePublic } from '@platform/types';
import { Badge, Card } from '@platform/ui';
import { formatDate, getYoutubeThumbnail } from '@/lib/format';

interface LiveCardProps {
  live: LivePublic;
}

export function LiveCard({ live }: LiveCardProps) {
  const thumb = live.thumbnailUrl || getYoutubeThumbnail(live.youtubeUrl);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {thumb && (
        <div className="relative h-40">
          <img src={thumb} alt={live.title} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
              LIVE
            </span>
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="warning">YouTube</Badge>
          {live.scheduledAt && (
            <span className="text-xs text-slate-400">{formatDate(live.scheduledAt)}</span>
          )}
        </div>
        <h3 className="font-bold text-brand-900">{live.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{live.description}</p>
        <a
          href={live.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
        >
          Assistir no YouTube →
        </a>
      </div>
    </Card>
  );
}
