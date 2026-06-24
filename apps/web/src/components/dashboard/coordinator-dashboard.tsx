'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  CoordinatorDashboard,
  CoordinatorLeaderItem,
  CreateLeaderRequest,
  UpdateLeaderRequest,
} from '@platform/types';
import { BRAZILIAN_STATES, formatPhone } from '@platform/utils';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Pagination,
  Select,
  StatCard,
  TableRowSkeleton,
} from '@platform/ui';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useToast } from '@/contexts/toast-context';

type FormMode = 'create' | 'edit' | null;

const emptyCreate: CreateLeaderRequest = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  cpf: '',
  phone: '',
  address: '',
  city: '',
  state: '',
};

export function CoordinatorDashboardView() {
  const { toast } = useToast();

  const [stats, setStats] = useState<CoordinatorDashboard | null>(null);
  const [leaders, setLeaders] = useState<CoordinatorLeaderItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingLeader, setEditingLeader] = useState<CoordinatorLeaderItem | null>(null);
  const [createForm, setCreateForm] = useState<CreateLeaderRequest>(emptyCreate);
  const [editForm, setEditForm] = useState<UpdateLeaderRequest>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getCoordinatorDashboard();
      setStats(data);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }, [toast]);

  const loadLeaders = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await api.getCoordinatorLeaders({ page, limit: 10, search: search || undefined });
      setLeaders(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setTableLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    Promise.all([loadStats(), loadLeaders()]).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) loadLeaders();
  }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setCreateForm(emptyCreate);
    setFormErrors({});
    setEditingLeader(null);
    setFormMode('create');
  }

  function openEdit(leader: CoordinatorLeaderItem) {
    setEditForm({
      firstName: leader.firstName,
      lastName: leader.lastName,
      phone: leader.phone,
      address: '',
      city: leader.city,
      state: leader.state,
    });
    setFormErrors({});
    setEditingLeader(leader);
    setFormMode('edit');
  }

  function closeForm() {
    setFormMode(null);
    setEditingLeader(null);
    setFormErrors({});
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormErrors({});
    try {
      await api.createCoordinatorLeader(createForm);
      toast('Líder criado com sucesso!', 'success');
      closeForm();
      await Promise.all([loadStats(), loadLeaders()]);
    } catch (err: unknown) {
      const error = err as Error & { errors?: Record<string, string> };
      if (error.errors) setFormErrors(error.errors);
      else toast(error.message, 'error');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLeader) return;
    setFormLoading(true);
    setFormErrors({});
    try {
      await api.updateCoordinatorLeader(editingLeader.id, editForm);
      toast('Líder atualizado com sucesso!', 'success');
      closeForm();
      await loadLeaders();
    } catch (err: unknown) {
      const error = err as Error & { errors?: Record<string, string> };
      if (error.errors) setFormErrors(error.errors);
      else toast(error.message, 'error');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeactivate(leader: CoordinatorLeaderItem) {
    const confirmed = window.confirm(
      `Desativar o líder ${leader.firstName} ${leader.lastName}?\n\nEsta ação remove o link de captação. O líder ainda terá acesso ao sistema.`,
    );
    if (!confirmed) return;
    try {
      await api.deactivateCoordinatorLeader(leader.id);
      toast('Líder desativado com sucesso.', 'success');
      await Promise.all([loadStats(), loadLeaders()]);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  if (loading) {
    return (
      <DashboardLayout title="Dashboard Coordenador">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard Coordenador" subtitle="Gerencie seus líderes">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Líderes vinculados" value={stats?.totalLeaders ?? 0} icon={<span>👥</span>} />
        <StatCard title="Apoiadores captados" value={stats?.totalSupporters ?? 0} icon={<span>🤝</span>} />
        <StatCard title="Média por líder" value={stats?.averageSupportersPerLeader ?? 0} icon={<span>📊</span>} />
        <StatCard title="Pendentes" value={stats?.totalPending ?? 0} icon={<span>⏳</span>} />
        <StatCard title="Verificados" value={stats?.totalVerified ?? 0} icon={<span>✅</span>} />
        <StatCard title="Inválidos" value={stats?.totalInvalid ?? 0} icon={<span>❌</span>} />
      </div>

      {/* Formulário de criação/edição */}
      {formMode && (
        <Card className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-900">
              {formMode === 'create'
                ? 'Novo Líder'
                : `Editar: ${editingLeader?.firstName} ${editingLeader?.lastName}`}
            </h2>
            <button
              onClick={closeForm}
              className="text-sm text-slate-400 hover:text-slate-700"
              aria-label="Fechar formulário"
            >
              ✕ Fechar
            </button>
          </div>

          {formMode === 'create' ? (
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nome *"
                placeholder="Nome"
                value={createForm.firstName}
                error={formErrors.firstName}
                onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
              />
              <Input
                label="Sobrenome *"
                placeholder="Sobrenome"
                value={createForm.lastName}
                error={formErrors.lastName}
                onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
              />
              <Input
                label="E-mail *"
                type="email"
                placeholder="email@exemplo.com"
                value={createForm.email}
                error={formErrors.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
              <Input
                label="Senha *"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={createForm.password}
                error={formErrors.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
              <Input
                label="CPF *"
                placeholder="000.000.000-00"
                value={createForm.cpf}
                error={formErrors.cpf}
                onChange={(e) => setCreateForm({ ...createForm, cpf: e.target.value })}
              />
              <Input
                label="Telefone *"
                placeholder="(11) 99999-9999"
                value={createForm.phone}
                error={formErrors.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Endereço *"
                  placeholder="Rua, número, bairro"
                  value={createForm.address}
                  error={formErrors.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                />
              </div>
              <Input
                label="Cidade *"
                placeholder="Cidade"
                value={createForm.city}
                error={formErrors.city}
                onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
              />
              <Select
                label="Estado *"
                options={[
                  { value: '', label: 'Selecione o estado' },
                  ...BRAZILIAN_STATES.map((s) => ({ value: s, label: s })),
                ]}
                value={createForm.state}
                onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
              />
              <div className="flex justify-end gap-3 sm:col-span-2">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Criando...' : 'Criar Líder'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEdit} className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nome"
                placeholder="Nome"
                value={editForm.firstName ?? ''}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              />
              <Input
                label="Sobrenome"
                placeholder="Sobrenome"
                value={editForm.lastName ?? ''}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              />
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={editForm.phone ?? ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
              <Input
                label="Cidade"
                placeholder="Cidade"
                value={editForm.city ?? ''}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              />
              <Select
                label="Estado"
                options={[
                  { value: '', label: 'Selecione o estado' },
                  ...BRAZILIAN_STATES.map((s) => ({ value: s, label: s })),
                ]}
                value={editForm.state ?? ''}
                onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
              />
              <Input
                label="Endereço"
                placeholder="Rua, número, bairro"
                value={editForm.address ?? ''}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
              <div className="flex justify-end gap-3 sm:col-span-2">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* Tabela de líderes */}
      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-brand-900">Meus Líderes</h2>
          {formMode === null && (
            <Button size="sm" onClick={openCreate}>
              + Novo Líder
            </Button>
          )}
        </div>

        <form onSubmit={handleSearch} className="mb-4 flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome ou e-mail"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
          {search && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setPage(1);
              }}
            >
              Limpar
            </Button>
          )}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 font-semibold text-slate-600">Nome</th>
                <th className="hidden pb-3 font-semibold text-slate-600 md:table-cell">Telefone</th>
                <th className="hidden pb-3 font-semibold text-slate-600 sm:table-cell">Cidade/UF</th>
                <th className="pb-3 text-center font-semibold text-slate-600">Apoiadores</th>
                <th className="hidden pb-3 font-semibold text-slate-600 lg:table-cell">Link</th>
                <th className="pb-3 font-semibold text-slate-600">Status</th>
                <th className="pb-3 font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading &&
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}

              {!tableLoading && leaders.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon="👥"
                      title="Nenhum líder encontrado"
                      description={
                        search
                          ? 'Tente ajustar o filtro de busca.'
                          : 'Clique em + Novo Líder para cadastrar o primeiro.'
                      }
                    />
                  </td>
                </tr>
              )}

              {!tableLoading &&
                leaders.map((leader) => (
                  <tr key={leader.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-900">
                      {leader.firstName} {leader.lastName}
                    </td>
                    <td className="hidden py-3 text-slate-500 md:table-cell">
                      {formatPhone(leader.phone)}
                    </td>
                    <td className="hidden py-3 text-slate-500 sm:table-cell">
                      {leader.city}/{leader.state}
                    </td>
                    <td className="py-3 text-center font-semibold text-brand-700">
                      {leader.supporterCount}
                    </td>
                    <td className="hidden py-3 text-xs text-slate-400 lg:table-cell">
                      {leader.leaderSlug ? `/lider/${leader.leaderSlug}` : '—'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          leader.leaderSlug
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {leader.leaderSlug ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(leader)}
                          className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                        >
                          Editar
                        </button>
                        {leader.leaderSlug && (
                          <button
                            onClick={() => handleDeactivate(leader)}
                            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Desativar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />
      </Card>
    </DashboardLayout>
  );
}
