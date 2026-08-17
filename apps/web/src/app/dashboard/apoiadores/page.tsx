'use client';

import { useCallback, useEffect, useState } from 'react';
import { Role, SupporterStatus, WhatsappStatus } from '@platform/types';
import type { SupporterListItem, SupportersQuery } from '@platform/types';
import { BRAZILIAN_STATES, CITIES_BY_STATE, CITY_ZONE_OPTIONS, NEIGHBORHOODS_BY_CITY, formatPhone, getCityZoneLabel } from '@platform/utils';
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
import {
  changeSupporterFilterState,
  clearSupporterFilters,
  normalizeSupporterFilters,
} from '@/lib/supporter-filter-state';

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

  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [zone, setZone] = useState('');

  // Filtros pendentes (aplicados apenas ao submeter)
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingCity, setPendingCity] = useState('');
  const [pendingState, setPendingState] = useState('');
  const [pendingNeighborhood, setPendingNeighborhood] = useState('');
  const [pendingZone, setPendingZone] = useState('');

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
        neighborhood: neighborhood || undefined,
        zone: (zone || undefined) as SupportersQuery['zone'],
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
  }, [user, page, search, city, state, neighborhood, zone, isAdmin, isCoordinator, toast]);

  useEffect(() => {
    loadSupporters();
  }, [loadSupporters]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const filters = normalizeSupporterFilters({
      search: pendingSearch,
      city: pendingCity,
      state: pendingState,
      neighborhood: pendingNeighborhood,
      zone: pendingZone,
    });
    setSearch(filters.search);
    setCity(filters.city);
    setState(filters.state);
    setNeighborhood(filters.neighborhood);
    setZone(filters.zone);
    setPage(1);
  }

  function handleClear() {
    const filters = clearSupporterFilters();
    setPendingSearch(filters.search);
    setPendingCity(filters.city);
    setPendingState(filters.state);
    setPendingNeighborhood(filters.neighborhood);
    setPendingZone(filters.zone);
    setSearch(filters.search);
    setCity(filters.city);
    setState(filters.state);
    setNeighborhood(filters.neighborhood);
    setZone(filters.zone);
    setPage(1);
  }

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState<{ id: string; newStatus: SupporterStatus; oldStatus: SupporterStatus } | null>(null);
  const [supporterToDelete, setSupporterToDelete] = useState<SupporterListItem | null>(null);

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

  async function handleDeleteSupporter() {
    if (!supporterToDelete) return;
    setLoading(true);
    try {
      if (isAdmin) await api.deleteAdminSupporter(supporterToDelete.id);
      else if (isCoordinator) await api.deleteCoordinatorSupporter(supporterToDelete.id);
      else await api.deleteLeaderSupporter(supporterToDelete.id);

      const remainingTotal = Math.max(0, total - 1);
      setSupporters((current) => current.filter((supporter) => supporter.id !== supporterToDelete.id));
      setTotal(remainingTotal);
      setTotalPages(Math.max(1, Math.ceil(remainingTotal / LIMIT)));
      setSupporterToDelete(null);
      toast('Apoiador excluído com sucesso!', 'success');
      if (supporters.length === 1 && page > 1) setPage((current) => current - 1);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
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
  const colCount = 7 + (showLeaderCol ? 1 : 0) + (showCoordinatorCol ? 1 : 0);

  const cityFilterOptions = (() => {
    if (!pendingState || !CITIES_BY_STATE[pendingState]) return [];
    const opts = CITIES_BY_STATE[pendingState].map(c => ({ value: c, label: c }));
    if (pendingCity && !opts.some(o => o.value === pendingCity)) {
      opts.push({ value: pendingCity, label: pendingCity });
    }
    return [{ value: '', label: 'Todas as cidades' }, ...opts];
  })();

  const neighborhoodFilterOptions = (() => {
    if (!pendingCity || !NEIGHBORHOODS_BY_CITY[pendingCity]) return [];
    const opts = NEIGHBORHOODS_BY_CITY[pendingCity].map(n => ({ value: n, label: n }));
    if (pendingNeighborhood && pendingNeighborhood !== 'Outro' && !opts.some(o => o.value === pendingNeighborhood)) {
      opts.push({ value: pendingNeighborhood, label: pendingNeighborhood });
    }
    return [{ value: '', label: 'Todos os bairros/regiões' }, ...opts];
  })();

  return (
    <DashboardLayout title="Apoiadores" subtitle={subtitle}>
      <Card>
        {/* Filtros */}
        <form onSubmit={handleSearch} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            id="apoiadores-search"
            placeholder="Buscar nome ou WhatsApp"
            value={pendingSearch}
            onChange={(e) => setPendingSearch(e.target.value)}
          />
          <Select
            id="apoiadores-state"
            options={[{ value: '', label: 'Todos os estados' }, ...BRAZILIAN_STATES.map((s) => ({ value: s, label: s }))]}
            value={pendingState}
            onChange={(e) => {
              const filters = changeSupporterFilterState({
                search: pendingSearch,
                city: pendingCity,
                state: pendingState,
                neighborhood: pendingNeighborhood,
                zone: pendingZone,
              }, e.target.value);
              setPendingState(filters.state);
              setPendingCity(filters.city);
              setPendingNeighborhood(filters.neighborhood);
            }}
          />
          <Select
            id="apoiadores-city"
            value={pendingCity}
            onChange={(e) => {
              setPendingCity(e.target.value);
              setPendingNeighborhood('');
            }}
            options={cityFilterOptions}
            disabled={!pendingState}
          />
          <Select
            id="apoiadores-neighborhood"
            value={pendingNeighborhood}
            onChange={(e) => setPendingNeighborhood(e.target.value)}
            options={neighborhoodFilterOptions}
            disabled={!pendingCity}
          />
          <Select
            id="apoiadores-zone"
            value={pendingZone}
            onChange={(e) => setPendingZone(e.target.value)}
            options={[{ value: '', label: 'Todas as zonas' }, ...CITY_ZONE_OPTIONS]}
          />
          <div className="flex gap-2 lg:col-span-5">
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
                <th className="pb-3 font-semibold text-slate-600 px-4">Status WhatsApp</th>
                <th className="pb-3 font-semibold text-slate-600 px-4">Cadastro</th>
                <th className="pb-3 font-semibold text-slate-600 px-4">Ações</th>
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
                        <div className="mt-1 text-xs text-slate-400">{getCityZoneLabel(s.zone)}</div>
                        {s.neighborhood && <div className="text-xs text-slate-400 mt-1">{s.neighborhood}</div>}
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
                      <td className="py-3 px-4">
                        {s.whatsappStatus && (
                          <Badge 
                            variant={
                              s.whatsappStatus === WhatsappStatus.CONFIRMED ? 'success' :
                              s.whatsappStatus === WhatsappStatus.FAILED || s.whatsappStatus === WhatsappStatus.OPT_OUT ? 'danger' : 
                              s.whatsappStatus === WhatsappStatus.SENT ? 'info' : 'warning'
                            }
                          >
                            {s.whatsappStatus === WhatsappStatus.PENDING ? 'Pendente de confirmação' :
                             s.whatsappStatus === WhatsappStatus.SENT ? 'Mensagem enviada' :
                             s.whatsappStatus === WhatsappStatus.CONFIRMED ? 'Confirmado pelo WhatsApp' :
                             s.whatsappStatus === WhatsappStatus.FAILED ? 'Falha no envio' :
                             s.whatsappStatus === WhatsappStatus.OPT_OUT ? 'Não deseja receber mensagens' : s.whatsappStatus}
                          </Badge>
                        )}
                        {s.whatsappConfirmedAt && (
                          <div className="mt-1 text-xs text-slate-400">
                            {new Date(s.whatsappConfirmedAt).toLocaleString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-slate-400 text-xs px-4">
                        {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <Button type="button" variant="danger" size="sm" onClick={() => setSupporterToDelete(s)}>
                          Excluir
                        </Button>
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

      <ConfirmModal
        isOpen={supporterToDelete !== null}
        title="Excluir apoiador"
        message={supporterToDelete
          ? `Excluir permanentemente ${supporterToDelete.firstName} ${supporterToDelete.lastName}? Essa ação não pode ser desfeita.`
          : ''}
        confirmLabel="Excluir apoiador"
        confirmVariant="danger"
        onConfirm={handleDeleteSupporter}
        onCancel={() => setSupporterToDelete(null)}
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
