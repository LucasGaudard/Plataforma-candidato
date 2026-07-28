'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SuperAdminDashboard } from '@platform/types';
import { api } from '@/lib/api';
import { SuperAdminLayout } from '@/components/super-admin/super-admin-layout';

export default function SuperAdminPage() {
  const [data, setData] = useState<SuperAdminDashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSuperAdminDashboard().then(setData).catch((err: Error) => setError(err.message));
  }, []);

  const metrics = data ? [
    ['Campanhas', data.totalCampaigns],
    ['Ativas', data.activeCampaigns],
    ['Inativas/suspensas', data.unavailableCampaigns],
    ['Usuários', data.totalUsers],
    ['Administradores', data.totalAdmins],
    ['Líderes', data.totalLeaders],
    ['Apoiadores', data.totalSupporters],
    ['Conteúdos', data.totalPosts + data.totalEvents + data.totalLives],
  ] : [];

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Visão geral</h2><p className="text-slate-600">Indicadores globais da plataforma.</p></div>
        <Link href="/super-admin/campanhas/nova" className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white">Nova campanha</Link>
      </div>
      {error && <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      {!data && !error && <p className="mt-8 text-slate-500">Carregando...</p>}
      {data && (
        <>
          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-900">{value}</p></div>
            ))}
          </section>
          <section className="mt-7 rounded-xl bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">Campanhas recentes</h3>
            <div className="mt-4 divide-y">
              {data.recentCampaigns.map((campaign) => (
                <Link key={campaign.id} href={`/super-admin/campanhas/${campaign.id}`} className="flex justify-between py-3 hover:text-cyan-700">
                  <span>{campaign.name} <span className="text-sm text-slate-400">/{campaign.slug}</span></span>
                  <span className="text-sm">{campaign.status}</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </SuperAdminLayout>
  );
}
