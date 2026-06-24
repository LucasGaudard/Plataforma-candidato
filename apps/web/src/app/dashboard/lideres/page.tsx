'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AdminLeaderItem, AdminCoordinatorItem, AdminCreateLeaderRequest, UpdateLeaderRequest } from '@platform/types';
import { Role } from '@platform/types';
import { BRAZILIAN_STATES, formatPhone } from '@platform/utils';
import { Button, Card, EmptyState, Input, Pagination, Select, TableRowSkeleton } from '@platform/ui';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useToast } from '@/contexts/toast-context';

type FormMode = 'create' | 'edit' | null;

const emptyCreate: AdminCreateLeaderRequest = {
  coordinatorId: '',
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

function LeadersContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialCoordinatorId = searchParams.get('coordinatorId') || '';

  const [leaders, setLeaders] = useState<AdminLeaderItem[]>([]);
  const [coordinators, setCoordinators] = useState<AdminCoordinatorItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCoordinatorId, setFilterCoordinatorId] = useState(initialCoordinatorId);

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingLeader, setEditingLeader] = useState<AdminLeaderItem | null>(null);
  const [createForm, setCreateForm] = useState<AdminCreateLeaderRequest>({ ...emptyCreate, coordinatorId: initialCoordinatorId });
  const [editForm, setEditForm] = useState<UpdateLeaderRequest>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadLeaders = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await api.getAdminLeaders({ 
        page, 
        limit: 10, 
        search: filterSearch || undefined,
        coordinatorId: filterCoordinatorId || undefined
      });
      setLeaders(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [page, filterSearch, filterCoordinatorId, toast]);

  const loadCoordinatorsForSelect = useCallback(async () => {
    try {
      // Fetch all active coordinators for the select dropdown
      // (assuming 100 limit is enough for demonstration, otherwise a typeahead is needed)
      const res = await api.getAdminCoordinators({ page: 1, limit: 100 });
      setCoordinators(res.data.filter(c => c.active));
    } catch (err) {
      toast('Erro ao carregar coordenadores', 'error');
    }
  }, [toast]);

  useEffect(() => {
    loadLeaders();
  }, [loadLeaders]);

  useEffect(() => {
    loadCoordinatorsForSelect();
  }, [loadCoordinatorsForSelect]);

  function openCreate() {
    setCreateForm({ ...emptyCreate, coordinatorId: filterCoordinatorId });
    setFormErrors({});
    setEditingLeader(null);
    setFormMode('create');
  }

  function openEdit(leader: AdminLeaderItem) {
    setEditForm({
      firstName: leader.firstName,
      lastName: leader.lastName,
      phone: leader.phone,
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
      await api.createAdminLeader(createForm);
      toast('Líder criado com sucesso!', 'success');
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

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLeader) return;
    setFormLoading(true);
    setFormErrors({});
    try {
      await api.updateAdminLeader(editingLeader.id, editForm);
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

  async function handleDeactivate(leader: AdminLeaderItem) {
    const action = leader.active ? 'Desativar' : 'Ativar';
    const confirmed = window.confirm(`Deseja realmente ${action.toLowerCase()} o líder ${leader.firstName} ${leader.lastName}?`);
    if (!confirmed) return;
    try {
      await api.deactivateAdminLeader(leader.id);
      toast(`Líder ${leader.active ? 'desativado' : 'ativado'} com sucesso.`, 'success');
      await loadLeaders();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilterSearch(searchInput);
    setPage(1);
  }

  if (loading) {
    return (
      <DashboardLayout title="Líderes">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Líderes" subtitle="Gerencie os líderes vinculados aos coordenadores">
      {formMode && (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-900">
              {formMode === 'create' ? 'Novo Líder' : `Editar: ${editingLeader?.firstName}`}
            </h2>
            <button onClick={closeForm} className="text-sm text-slate-400 hover:text-slate-700">✕ Fechar</button>
          </div>

          {formMode === 'create' ? (
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select 
                  label="Vincular ao Coordenador *" 
                  options={[{ value: '', label: 'Selecione um coordenador' }, ...coordinators.map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))]} 
                  value={createForm.coordinatorId} 
                  onChange={(e) => setCreateForm({ ...createForm, coordinatorId: e.target.value })} 
                />
              </div>
              <Input label="Nome *" value={createForm.firstName} error={formErrors.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
              <Input label="Sobrenome *" value={createForm.lastName} error={formErrors.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
              <Input label="E-mail *" type="email" value={createForm.email} error={formErrors.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
              <Input label="Senha *" type="password" value={createForm.password} error={formErrors.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
              <Input label="CPF *" value={createForm.cpf} error={formErrors.cpf} onChange={(e) => setCreateForm({ ...createForm, cpf: e.target.value })} />
              <Input label="Telefone *" value={createForm.phone} error={formErrors.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
              <div className="sm:col-span-2">
                <Input label="Endereço *" value={createForm.address} error={formErrors.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} />
              </div>
              <Input label="Cidade *" value={createForm.city} error={formErrors.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} />
              <Select label="Estado *" options={[{ value: '', label: 'Selecione o estado' }, ...BRAZILIAN_STATES.map((s) => ({ value: s, label: s }))]} value={createForm.state} onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })} />
              <div className="flex justify-end gap-3 sm:col-span-2">
                <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
                <Button type="submit" loading={formLoading} disabled={!createForm.coordinatorId}>Criar Líder</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEdit} className="grid gap-4 sm:grid-cols-2">
              <Input label="Nome" value={editForm.firstName ?? ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              <Input label="Sobrenome" value={editForm.lastName ?? ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              <Input label="Telefone" value={editForm.phone ?? ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              <Input label="Cidade" value={editForm.city ?? ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              <Select label="Estado" options={[{ value: '', label: 'Selecione o estado' }, ...BRAZILIAN_STATES.map((s) => ({ value: s, label: s }))]} value={editForm.state ?? ''} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} />
              <div className="flex justify-end gap-3 sm:col-span-2">
                <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
                <Button type="submit" loading={formLoading}>Salvar Alterações</Button>
              </div>
            </form>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-brand-900">Lista de Líderes</h2>
          {formMode === null && <Button size="sm" onClick={openCreate}>+ Novo Líder</Button>}
        </div>

        <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input placeholder="Buscar por nome ou e-mail" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="w-full sm:w-64">
            <Select 
              options={[{ value: '', label: 'Todos os coordenadores' }, ...coordinators.map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))]} 
              value={filterCoordinatorId} 
              onChange={(e) => {
                setFilterCoordinatorId(e.target.value);
                setPage(1);
              }} 
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="outline">Filtrar</Button>
            {(filterSearch || filterCoordinatorId) && (
              <Button type="button" variant="outline" onClick={() => { setFilterSearch(''); setSearchInput(''); setFilterCoordinatorId(''); setPage(1); }}>Limpar</Button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 font-semibold text-slate-600">Nome / E-mail</th>
                <th className="hidden pb-3 font-semibold text-slate-600 md:table-cell">Coordenador</th>
                <th className="hidden pb-3 font-semibold text-slate-600 sm:table-cell">Cidade/UF</th>
                <th className="pb-3 text-center font-semibold text-slate-600">Apoiadores</th>
                <th className="pb-3 font-semibold text-slate-600">Status</th>
                <th className="pb-3 font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading && Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}

              {!tableLoading && leaders.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon="👥" title="Nenhum líder encontrado" description={filterSearch || filterCoordinatorId ? 'Tente ajustar a busca.' : 'Cadastre o primeiro líder vinculando-o a um coordenador.'} />
                  </td>
                </tr>
              )}

              {!tableLoading && leaders.map((leader) => (
                <tr key={leader.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 font-medium text-slate-900">
                    {leader.firstName} {leader.lastName}
                    <div className="text-xs text-slate-400 font-normal">{leader.email}</div>
                  </td>
                  <td className="hidden py-3 text-slate-500 md:table-cell">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-xs">
                      {leader.coordinatorName}
                    </span>
                  </td>
                  <td className="hidden py-3 text-slate-500 sm:table-cell">{leader.city}/{leader.state}</td>
                  <td className="py-3 text-center font-semibold text-brand-700">{leader.supportersCount}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${leader.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {leader.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(leader)} className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">Editar</button>
                      <button onClick={() => handleDeactivate(leader)} className={`rounded px-2 py-1 text-xs font-medium ${leader.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {leader.active ? 'Desativar' : 'Ativar'}
                      </button>
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

export default function LeadersPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      }>
        <LeadersContent />
      </Suspense>
    </ProtectedRoute>
  );
}
