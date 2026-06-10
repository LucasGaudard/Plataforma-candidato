'use client';

import { useEffect, useState } from 'react';
import type { LeaderDashboard } from '@platform/types';
import { Button, Card, StatCard } from '@platform/ui';
import { formatCpf, formatPhone } from '@platform/utils';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export function LeaderDashboardView() {
  const [data, setData] = useState<LeaderDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .getLeaderDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function copyLink() {
    if (!data?.referralLink) return;
    await navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
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
    <DashboardLayout
      title="Dashboard Líder"
      subtitle="Acompanhe seus apoiadores"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <StatCard
          title="Apoiadores Cadastrados"
          value={data?.totalSupporters ?? 0}
          icon={<span className="text-xl">🤝</span>}
        />

        <Card>
          <h3 className="text-sm font-medium text-slate-500">Seu Link Personalizado</h3>
          <p className="mt-2 break-all text-sm font-mono text-brand-700">
            {data?.referralLink}
          </p>
          <Button onClick={copyLink} variant="outline" size="sm" className="mt-4">
            {copied ? 'Copiado!' : 'Copiar link'}
          </Button>
        </Card>
      </div>

      <Card className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">
          Lista de Apoiadores
        </h2>

        {data?.supporters.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum apoiador cadastrado ainda. Compartilhe seu link!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 font-semibold text-slate-600">Nome</th>
                  <th className="hidden pb-3 font-semibold text-slate-600 sm:table-cell">
                    CPF
                  </th>
                  <th className="hidden pb-3 font-semibold text-slate-600 md:table-cell">
                    Telefone
                  </th>
                  <th className="hidden pb-3 font-semibold text-slate-600 lg:table-cell">
                    Cidade
                  </th>
                  <th className="pb-3 font-semibold text-slate-600">Data</th>
                </tr>
              </thead>
              <tbody>
                {data?.supporters.map((supporter) => (
                  <tr key={supporter.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">
                      {supporter.firstName} {supporter.lastName}
                    </td>
                    <td className="hidden py-3 text-slate-500 sm:table-cell">
                      {formatCpf(supporter.cpf)}
                    </td>
                    <td className="hidden py-3 text-slate-500 md:table-cell">
                      {formatPhone(supporter.phone)}
                    </td>
                    <td className="hidden py-3 text-slate-500 lg:table-cell">
                      {supporter.city}/{supporter.state}
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(supporter.createdAt).toLocaleDateString('pt-BR')}
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
