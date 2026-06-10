'use client';

import { Card } from '@platform/ui';
import { useAuth } from '@/contexts/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { formatCpf, formatPhone } from '@platform/utils';

export function UserDashboardView() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <DashboardLayout
      title="Meu Painel"
      subtitle="Bem-vindo à campanha"
    >
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Seus Dados</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-400">Nome</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-400">CPF</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {formatCpf(user.cpf)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-400">Telefone</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {formatPhone(user.phone)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-400">E-mail</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{user.email}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-400">Endereço</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {user.address} — {user.city}/{user.state}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-6">
        <p className="text-sm text-slate-600">
          Você faz parte da nossa campanha! Em breve teremos novidades, eventos e conteúdos exclusivos para você.
        </p>
      </Card>
    </DashboardLayout>
  );
}
