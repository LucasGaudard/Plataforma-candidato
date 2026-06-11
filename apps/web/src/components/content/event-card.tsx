import type { EventPublic } from '@platform/types';
import { Card } from '@platform/ui';
import { formatDateTime } from '@/lib/format';

interface EventCardProps {
  event: EventPublic;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <span className="text-xs font-bold uppercase">
            {new Date(event.date).toLocaleDateString('pt-BR', { month: 'short' })}
          </span>
          <span className="text-lg font-bold leading-none">
            {new Date(event.date).getDate()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-brand-900">{event.title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {formatDateTime(event.date, event.time)}
          </p>
          <p className="mt-1 text-sm text-slate-500">📍 {event.location}</p>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{event.description}</p>
        </div>
      </div>
    </Card>
  );
}
