'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { LeaderDashboard } from '@platform/types';
import { Button, Card, StatCard } from '@platform/ui';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PostsFeed } from '@/components/content/posts-feed';
import { useToast } from '@/contexts/toast-context';

export function LeaderDashboardView() {
  const { toast } = useToast();
  const [data, setData] = useState<LeaderDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const dashboard = await api.getLeaderDashboard();
      setData(dashboard);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  async function copyLink() {
    if (!data?.referralLink) return;
    await navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    toast('Link copiado!', 'success');
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <DashboardLayout title="Dashboard Líder">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard Líder">
        <p className="text-red-600">{error}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard Líder" subtitle="Acompanhe seus apoiadores">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total de apoiadores" value={data?.totalSupporters ?? 0} icon={<span>🤝</span>} />
        <StatCard title="Novos (7 dias)" value={data?.recentSupporters ?? 0} icon={<span>📈</span>} />
        <StatCard title="Pendentes" value={data?.totalPending ?? 0} icon={<span>⏳</span>} />
        <StatCard title="Verificados" value={data?.totalVerified ?? 0} icon={<span>✅</span>} />
        <StatCard title="Inválidos" value={data?.totalInvalid ?? 0} icon={<span>❌</span>} />
      </div>

      <div className="mt-8 grid gap-4">
        <Card>
          <h3 className="text-sm font-medium text-slate-500">Link personalizado</h3>
          <p className="mt-2 break-all text-xs font-mono text-brand-700">{data?.referralLink}</p>
          <Button onClick={copyLink} variant="outline" size="sm" className="mt-3">
            {copied ? 'Copiado!' : 'Copiar link'}
          </Button>
        </Card>
      </div>

      <div className="mt-8 flex items-center justify-between rounded-xl bg-brand-50 p-6 shadow-sm border border-brand-100">
        <div>
          <h2 className="text-lg font-semibold text-brand-900">Gerenciar Apoiadores</h2>
          <p className="text-sm text-brand-700 mt-1">Visualize a lista completa dos seus apoiadores cadastrados.</p>
        </div>
        <Link href="/dashboard/apoiadores">
          <Button>Ver todos os apoiadores</Button>
        </Link>
      </div>

      <div className="mt-8">
        <PostsFeed limit={3} title="Novidades da campanha" />
      </div>
    </DashboardLayout>
  );
}
