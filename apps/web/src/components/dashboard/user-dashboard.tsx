'use client';

import { useEffect, useState } from 'react';
import type { EventPublic, LivePublic } from '@platform/types';
import { Card, CardSkeleton, EmptyState } from '@platform/ui';
import { useAuth } from '@/contexts/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { formatCpf, formatPhone } from '@platform/utils';
import { api } from '@/lib/api';
import { PostsFeed } from '@/components/content/posts-feed';
import { EventCard } from '@/components/content/event-card';
import { LiveCard } from '@/components/content/live-card';

export function UserDashboardView() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventPublic[]>([]);
  const [lives, setLives] = useState<LivePublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getEvents({ limit: 3 }),
      api.getLives({ limit: 3 }),
    ])
      .then(([eventsRes, livesRes]) => {
        setEvents(eventsRes.data);
        setLives(livesRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  return (
    <DashboardLayout title="Meu Painel" subtitle="Bem-vindo à campanha">
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Seus dados</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-400">Nome</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-400">CPF</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{formatCpf(user.cpf)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-400">Telefone</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{formatPhone(user.phone)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-400">E-mail</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{user.email}</dd>
          </div>
        </dl>
      </Card>

      <div className="mt-8">
        <PostsFeed limit={3} title="Novidades" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Próximos eventos</h2>
          {loading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : events.length === 0 ? (
            <EmptyState icon="📅" title="Nenhum evento agendado" />
          ) : (
            <div className="space-y-4">
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Lives</h2>
          {loading ? (
            <div className="space-y-4">
              <CardSkeleton />
            </div>
          ) : lives.length === 0 ? (
            <EmptyState icon="📺" title="Nenhuma live disponível" />
          ) : (
            <div className="space-y-4">
              {lives.map((l) => <LiveCard key={l.id} live={l} />)}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
