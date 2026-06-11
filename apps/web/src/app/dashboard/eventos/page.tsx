'use client';

import { useEffect, useState } from 'react';
import type { EventPublic } from '@platform/types';
import { Role } from '@platform/types';
import { CardSkeleton, EmptyState, Pagination } from '@platform/ui';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EventCard } from '@/components/content/event-card';
import { ContentManager } from '@/components/admin/content-manager';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

function EventosView() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventPublic[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEvents({ page, limit: 9 })
      .then((res) => {
        setEvents(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .finally(() => setLoading(false));
  }, [page]);

  if (user?.role === Role.ADMIN) {
    return <ContentManager type="events" title="Gerenciar Eventos" />;
  }

  return (
    <DashboardLayout title="Eventos" subtitle="Agenda da campanha">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <EmptyState icon="📅" title="Nenhum evento agendado" description="Fique atento às novidades!" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
        </>
      )}
    </DashboardLayout>
  );
}

export default function EventosPage() {
  return (
    <ProtectedRoute>
      <EventosView />
    </ProtectedRoute>
  );
}
