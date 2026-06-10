'use client';

import { useEffect, useState } from 'react';
import type { AdminDashboard } from '@platform/types';
import { Card, StatCard } from '@platform/ui';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

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
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
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
    <DashboardLayout
      title="Dashboard Admin"
      subtitle="Visão geral da campanha"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total de Líderes"
          value={data?.totalLeaders ?? 0}
          icon={<span className="text-xl">👥</span>}
        />
        <StatCard
          title="Total de Apoiadores"
          value={data?.totalSupporters ?? 0}
          icon={<span className="text-xl">🤝</span>}
        />
        <StatCard
          title="Média por Líder"
          value={
            data && data.totalLeaders > 0
              ? Math.round(data.totalSupporters / data.totalLeaders)
              : 0
          }
          icon={<span className="text-xl">📈</span>}
        />
      </div>

      <Card className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">
          Apoiadores por Líder
        </h2>

        {data?.supportersByLeader.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum líder cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 font-semibold text-slate-600">Líder</th>
                  <th className="pb-3 font-semibold text-slate-600">Link</th>
                  <th className="pb-3 text-right font-semibold text-slate-600">
                    Apoiadores
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.supportersByLeader.map((leader) => (
                  <tr key={leader.leaderId} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">
                      {leader.leaderName}
                    </td>
                    <td className="py-3 text-slate-500">
                      /lider/{leader.leaderSlug}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                        {leader.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
