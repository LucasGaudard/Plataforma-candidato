'use client';

import { useEffect, useState } from 'react';
import type { LivePublic } from '@platform/types';
import { Role } from '@platform/types';
import { CardSkeleton, EmptyState, Pagination } from '@platform/ui';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { LiveCard } from '@/components/content/live-card';
import { ContentManager } from '@/components/admin/content-manager';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

function LivesView() {
  const { user } = useAuth();
  const [lives, setLives] = useState<LivePublic[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLives({ page, limit: 9 })
      .then((res) => {
        setLives(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .finally(() => setLoading(false));
  }, [page]);

  if (user?.role === Role.ADMIN) {
    return <ContentManager type="lives" title="Gerenciar Lives" />;
  }

  return (
    <DashboardLayout title="Lives" subtitle="Transmissões da campanha">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : lives.length === 0 ? (
        <EmptyState icon="📺" title="Nenhuma live disponível" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lives.map((l) => <LiveCard key={l.id} live={l} />)}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
        </>
      )}
    </DashboardLayout>
  );
}

export default function LivesPage() {
  return (
    <ProtectedRoute>
      <LivesView />
    </ProtectedRoute>
  );
}
