'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminDashboard } from '@platform/types';
import { Badge, Button, Card, CardSkeleton, StatCard } from '@platform/ui';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { GrowthChart } from '@/components/charts/growth-chart';
import { PostsFeed } from '@/components/content/posts-feed';

export function AdminDashboardView() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getAdminDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Dashboard Admin">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard Admin">
        <p className="text-red-600">{error}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard Admin" subtitle="Visão geral da campanha">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/dashboard/posts"><Button size="sm">Gerenciar Posts</Button></Link>
        <Link href="/dashboard/eventos"><Button size="sm" variant="outline">Gerenciar Eventos</Button></Link>
        <Link href="/dashboard/lives"><Button size="sm" variant="outline">Gerenciar Lives</Button></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Líderes" value={data?.totalLeaders ?? 0} icon={<span>👥</span>} />
        <StatCard title="Apoiadores" value={data?.totalSupporters ?? 0} icon={<span>🤝</span>} />
        <StatCard title="Novos (7 dias)" value={data?.recentRegistrations ?? 0} icon={<span>📈</span>} />
        <StatCard title="Pendentes" value={data?.totalPending ?? 0} icon={<span>⏳</span>} />
        <StatCard title="Verificados" value={data?.totalVerified ?? 0} icon={<span>✅</span>} />
        <StatCard title="Inválidos" value={data?.totalInvalid ?? 0} icon={<span>❌</span>} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard title="Posts" value={data?.totalPosts ?? 0} icon={<span>📢</span>} />
        <StatCard title="Eventos" value={data?.totalEvents ?? 0} icon={<span>📅</span>} />
        <StatCard title="Lives" value={data?.totalLives ?? 0} icon={<span>📺</span>} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Crescimento de cadastros (30 dias)</h2>
          <GrowthChart data={data?.registrationGrowth ?? []} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Ranking de líderes</h2>
          {data?.leaderRanking.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum líder cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {data?.leaderRanking.slice(0, 5).map((leader) => (
                <div key={leader.leaderId} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {leader.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{leader.leaderName}</p>
                    <p className="text-xs text-slate-500">+{leader.recentCount} esta semana</p>
                  </div>
                  <Badge variant="info">{leader.count} apoiadores</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Apoiadores por líder</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 font-semibold text-slate-600">#</th>
                <th className="pb-3 font-semibold text-slate-600">Líder</th>
                <th className="hidden pb-3 font-semibold text-slate-600 sm:table-cell">Link</th>
                <th className="pb-3 text-right font-semibold text-slate-600">Total</th>
                <th className="hidden pb-3 text-right font-semibold text-slate-600 md:table-cell">7 dias</th>
              </tr>
            </thead>
            <tbody>
              {data?.leaderRanking.map((leader) => (
                <tr key={leader.leaderId} className="border-b border-slate-100">
                  <td className="py-3 text-slate-400">{leader.rank}</td>
                  <td className="py-3 font-medium text-slate-900">{leader.leaderName}</td>
                  <td className="hidden py-3 text-slate-500 sm:table-cell">/lider/{leader.leaderSlug}</td>
                  <td className="py-3 text-right font-semibold text-brand-700">{leader.count}</td>
                  <td className="hidden py-3 text-right text-slate-500 md:table-cell">+{leader.recentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-8">
        <PostsFeed limit={3} title="Posts recentes" />
      </div>
    </DashboardLayout>
  );
}
