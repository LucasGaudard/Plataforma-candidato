'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LeaderDashboard, UserPublic } from '@platform/types';
import { BRAZILIAN_STATES } from '@platform/utils';
import { Button, Card, EmptyState, Input, Pagination, Select, StatCard, TableRowSkeleton } from '@platform/ui';
import { formatCpf, formatPhone } from '@platform/utils';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PostsFeed } from '@/components/content/posts-feed';
import { useToast } from '@/contexts/toast-context';

export function LeaderDashboardView() {
  const { toast } = useToast();
  const [data, setData] = useState<LeaderDashboard | null>(null);
  const [supporters, setSupporters] = useState<UserPublic[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
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

  const loadSupporters = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await api.getLeaderSupporters({
        page,
        limit: 10,
        search: search || undefined,
        city: city || undefined,
        state: state || undefined,
      });
      setSupporters(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setTableLoading(false);
    }
  }, [page, search, city, state, toast]);

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  useEffect(() => {
    if (!loading) loadSupporters();
  }, [loading, loadSupporters]);

  async function copyLink() {
    if (!data?.referralLink) return;
    await navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    toast('Link copiado!', 'success');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadSupporters();
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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total de apoiadores" value={data?.totalSupporters ?? 0} icon={<span>🤝</span>} />
        <StatCard title="Novos (7 dias)" value={data?.recentSupporters ?? 0} icon={<span>📈</span>} />
        <Card>
          <h3 className="text-sm font-medium text-slate-500">Link personalizado</h3>
          <p className="mt-2 break-all text-xs font-mono text-brand-700">{data?.referralLink}</p>
          <Button onClick={copyLink} variant="outline" size="sm" className="mt-3">
            {copied ? 'Copiado!' : 'Copiar link'}
          </Button>
        </Card>
      </div>

      <Card className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Apoiadores</h2>

        <form onSubmit={handleSearch} className="mb-4 grid gap-3 sm:grid-cols-4">
          <Input
            placeholder="Buscar nome, e-mail ou CPF"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
          <Select
            options={BRAZILIAN_STATES.map((s) => ({ value: s, label: s }))}
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
          <Button type="submit">Filtrar</Button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 font-semibold text-slate-600">Nome</th>
                <th className="hidden pb-3 font-semibold text-slate-600 sm:table-cell">CPF</th>
                <th className="hidden pb-3 font-semibold text-slate-600 md:table-cell">Telefone</th>
                <th className="hidden pb-3 font-semibold text-slate-600 lg:table-cell">Cidade</th>
                <th className="pb-3 font-semibold text-slate-600">Data</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={5} />
              ))}
              {!tableLoading && supporters.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon="🔍" title="Nenhum apoiador encontrado" />
                  </td>
                </tr>
              )}
              {!tableLoading && supporters.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 font-medium text-slate-900">{s.firstName} {s.lastName}</td>
                  <td className="hidden py-3 text-slate-500 sm:table-cell">{formatCpf(s.cpf)}</td>
                  <td className="hidden py-3 text-slate-500 md:table-cell">{formatPhone(s.phone)}</td>
                  <td className="hidden py-3 text-slate-500 lg:table-cell">{s.city}/{s.state}</td>
                  <td className="py-3 text-slate-500">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />
      </Card>

      <div className="mt-8">
        <PostsFeed limit={3} title="Novidades da campanha" />
      </div>
    </DashboardLayout>
  );
}
