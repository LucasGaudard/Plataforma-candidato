'use client';

import { useCallback, useEffect, useState } from 'react';
import { Role, SupporterStatus } from '@platform/types';
import type { SupporterListItem, SupportersQuery } from '@platform/types';
import { BRAZILIAN_STATES, formatPhone } from '@platform/utils';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Input,
  Pagination,
  Select,
  TableRowSkeleton,
} from '@platform/ui';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';

const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.COORDINATOR, Role.LEADER];

const LIMIT = 20;

function SupportersContent() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [supporters, setSupporters] = useState<SupporterListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Filtros pendentes (aplicados apenas ao submeter)
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingCity, setPendingCity] = useState('');
  const [pendingState, setPendingState] = useState('');

  const isAdmin = user?.role === Role.ADMIN;
  const isCoordinator = user?.role === Role.COORDINATOR;

  const loadSupporters = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const query: SupportersQuery = {
        page,
        limit: LIMIT,
        search: search || undefined,
        city: city || undefined,
        state: state || undefined,
      };

      let result;
      if (isAdmin) {
        result = await api.getAdminSupporters(query);
      } else if (isCoordinator) {
        result = await api.getCoordinatorSupporters(query);
      } else {
        result = await api.getLeaderSupporters(query);
      }

      setSupporters(result.data);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, page, search, city, state, isAdmin, isCoordinator, toast]);

  useEffect(() => {
    loadSupporters();
  }, [loadSupporters]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(pendingSearch);
    setCity(pendingCity);
    setState(pendingState);
    setPage(1);
  }

  function handleClear() {
    setPendingSearch('');
    setPendingCity('');
    setPendingState('');
    setSearch('');
    setCity('');
    setState('');
    setPage(1);
  }

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState<{ id: string; newStatus: SupporterStatus; oldStatus: SupporterStatus } | null>(null);

  function requestStatusChange(id: string, newStatus: SupporterStatus, oldStatus: SupporterStatus) {
    if (newStatus === oldStatus) return;
    setStatusChangeData({ id, newStatus, oldStatus });
    setConfirmModalOpen(true);
  }

  async function handleConfirmStatusChange() {
    if (!statusChangeData) return;
    setLoading(true);
    try {
      const { id, newStatus } = statusChangeData;
      if (isAdmin) {
        await api.updateAdminSupporterStatus(id, newStatus);
      } else if (isCoordinator) {
        await api.updateCoordinatorSupporterStatus(id, newStatus);
      } else {
        await api.updateLeaderSupporterStatus(id, newStatus);
      }
      
      setSupporters((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)),
      );
      toast('Status atualizado com sucesso!', 'success');
      setConfirmModalOpen(false);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleCancelStatusChange() {
    setConfirmModalOpen(false);
    setStatusChangeData(null);
  }

  const subtitle =
    isAdmin
      ? 'Todos os apoiadores da campanha'
      : isCoordinator
        ? 'Apoiadores vinculados aos seus líderes'
        : 'Seus apoiadores cadastrados';

  // Colunas dinâmicas conforme role
  const showLeaderCol = isAdmin || isCoordinator;
  const showCoordinatorCol = isAdmin;
  const colCount = 5 + (showLeaderCol ? 1 : 0) + (showCoordinatorCol ? 1 : 0);

  return (
    <DashboardLayout title="Apoiadores" subtitle={subtitle}>
      <Card>
        {/* Filtros */}
        <form onSubmit={handleSearch} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            id="apoiadores-search"
            placeholder="Buscar nome ou WhatsApp"
            value={pendingSearch}
            onChange={(e) => setPendingSearch(e.target.value)}
          />
          <Input
            id="apoiadores-city"
            placeholder="Cidade"
            value={pendingCity}
            onChange={(e) => setPendingCity(e.target.value)}
          />
          <Select
            id="apoiadores-state"
            options={[{ value: '', label: 'Todos os estados' }, ...BRAZILIAN_STATES.map((s) => ({ value: s, label: s }))]}
            value={pendingState}
            onChange={(e) => setPendingState(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Filtrar
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>
              Limpar
            </Button>
          </div>
        </form>

        {/* Contagem */}
        {!loading && (
          <p className="mb-3 text-sm font-medium text-slate-500">
            {total === 0
              ? 'Nenhum apoiador encontrado'
              : `${total} apoiador${total !== 1 ? 'es' : ''} encontrado${total !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 font-semibold text-slate-600 px-4">Nome</th>
                <th className="hidden pb-3 font-semibold text-slate-600 sm:table-cell px-4">WhatsApp</th>
                <th className="hidden pb-3 font-semibold text-slate-600 md:table-cell px-4">Cidade / UF</th>
                {showLeaderCol && (
                  <th className="hidden pb-3 font-semibold text-slate-600 lg:table-cell px-4">Líder</th>
                )}
                {showCoordinatorCol && (
                  <th className="hidden pb-3 font-semibold text-slate-600 xl:table-cell px-4">Coordenador</th>
                )}
                <th className="pb-3 font-semibold text-slate-600 px-4">Status</th>
                <th className="pb-3 font-semibold text-slate-600 px-4">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={colCount} />
                ))}

              {!loading && supporters.length === 0 && (
                <tr>
                  <td colSpan={colCount}>
                    <EmptyState
                      icon="🔍"
                      title="Nenhum apoiador encontrado"
                      description="Tente ajustar os filtros de busca."
                    />
                  </td>
                </tr>
              )}

              {!loading &&
                supporters.map((s) => {
                  const selectValue = statusChangeData?.id === s.id ? statusChangeData.newStatus : s.status;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                    >
                      <td className="py-3 font-medium text-slate-900 px-4">
                        {s.firstName} {s.lastName}
                      </td>
                      <td className="hidden py-3 text-slate-600 sm:table-cell px-4">
                        {formatPhone(s.phone)}
                      </td>
                      <td className="hidden py-3 text-slate-500 md:table-cell px-4">
                        {s.city}
                        {s.state ? ` / ${s.state}` : ''}
                      </td>
                      {showLeaderCol && (
                        <td className="hidden py-3 text-slate-500 lg:table-cell px-4">
                          {s.leaderName ?? '—'}
                        </td>
                      )}
                      {showCoordinatorCol && (
                        <td className="hidden py-3 text-slate-500 xl:table-cell px-4">
                          {s.coordinatorName ?? '—'}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge 
                            variant={
                              s.status === SupporterStatus.VERIFIED ? 'success' :
                              s.status === SupporterStatus.INVALID ? 'danger' : 'warning'
                            }
                          >
                            {s.status}
                          </Badge>
                          <select
                            className="mt-1 block w-28 rounded-md border-slate-300 bg-white py-1 pl-2 pr-8 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
                            value={selectValue}
                            onChange={(e) => requestStatusChange(s.id, e.target.value as SupporterStatus, s.status)}
                          >
                            <option value={SupporterStatus.PENDING}>PENDING</option>
                            <option value={SupporterStatus.VERIFIED}>VERIFIED</option>
                            <option value={SupporterStatus.INVALID}>INVALID</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 text-slate-400 text-xs px-4">
                        {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-4"
          />
        )}
      </Card>

      <ConfirmModal
        isOpen={confirmModalOpen}
        title="Alterar Status do Apoiador"
        message={`Você tem certeza que deseja alterar o status deste apoiador para ${statusChangeData?.newStatus}?`}
        confirmLabel="Confirmar Alteração"
        confirmVariant="primary"
        onConfirm={handleConfirmStatusChange}
        onCancel={handleCancelStatusChange}
        isLoading={loading}
      />
    </DashboardLayout>
  );
}

export default function ApoiadoresPage() {
  return (
    <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
      <SupportersContent />
    </ProtectedRoute>
  );
}
