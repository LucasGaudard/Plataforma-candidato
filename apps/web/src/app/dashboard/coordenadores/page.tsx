'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminCoordinatorItem, CreateCoordinatorRequest, UpdateCoordinatorRequest } from '@platform/types';
import { Role } from '@platform/types';
import { BRAZILIAN_STATES, formatPhone } from '@platform/utils';
import { Button, Card, EmptyState, Input, Pagination, Select, TableRowSkeleton } from '@platform/ui';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useToast } from '@/contexts/toast-context';

type FormMode = 'create' | 'edit' | null;

const emptyCreate: CreateCoordinatorRequest = {
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

function CoordinatorsContent() {
  const { toast } = useToast();

  const [coordinators, setCoordinators] = useState<AdminCoordinatorItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingCoordinator, setEditingCoordinator] = useState<AdminCoordinatorItem | null>(null);
  const [createForm, setCreateForm] = useState<CreateCoordinatorRequest>(emptyCreate);
  const [editForm, setEditForm] = useState<UpdateCoordinatorRequest>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadCoordinators = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await api.getAdminCoordinators({ page, limit: 10, search: search || undefined });
      setCoordinators(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    loadCoordinators();
  }, [loadCoordinators]);

  function openCreate() {
    setCreateForm(emptyCreate);
    setFormErrors({});
    setEditingCoordinator(null);
    setFormMode('create');
  }

  function openEdit(coord: AdminCoordinatorItem) {
    setEditForm({
      firstName: coord.firstName,
      lastName: coord.lastName,
      phone: coord.phone,
      city: coord.city,
      state: coord.state,
    });
    setFormErrors({});
    setEditingCoordinator(coord);
    setFormMode('edit');
  }

  function closeForm() {
    setFormMode(null);
    setEditingCoordinator(null);
    setFormErrors({});
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormErrors({});
    try {
      await api.createAdminCoordinator(createForm);
      toast('Coordenador criado com sucesso!', 'success');
      closeForm();
      await loadCoordinators();
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
    if (!editingCoordinator) return;
    setFormLoading(true);
    setFormErrors({});
    try {
      await api.updateAdminCoordinator(editingCoordinator.id, editForm);
      toast('Coordenador atualizado com sucesso!', 'success');
      closeForm();
      await loadCoordinators();
    } catch (err: unknown) {
      const error = err as Error & { errors?: Record<string, string> };
      if (error.errors) setFormErrors(error.errors);
      else toast(error.message, 'error');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeactivate(coord: AdminCoordinatorItem) {
    const action = coord.active ? 'Desativar' : 'Ativar';
    const confirmed = window.confirm(`Deseja realmente ${action.toLowerCase()} o coordenador ${coord.firstName} ${coord.lastName}?`);
    if (!confirmed) return;
    try {
      await api.deactivateAdminCoordinator(coord.id);
      toast(`Coordenador ${coord.active ? 'desativado' : 'ativado'} com sucesso.`, 'success');
      await loadCoordinators();
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
      <DashboardLayout title="Coordenadores">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Coordenadores" subtitle="Gerencie os coordenadores da campanha">
      {formMode && (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-900">
              {formMode === 'create' ? 'Novo Coordenador' : `Editar: ${editingCoordinator?.firstName}`}
            </h2>
            <button onClick={closeForm} className="text-sm text-slate-400 hover:text-slate-700">✕ Fechar</button>
          </div>

          {formMode === 'create' ? (
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
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
                <Button type="submit" loading={formLoading}>Criar Coordenador</Button>
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
          <h2 className="text-lg font-semibold text-brand-900">Lista de Coordenadores</h2>
          {formMode === null && <Button size="sm" onClick={openCreate}>+ Novo Coordenador</Button>}
        </div>

        <form onSubmit={handleSearch} className="mb-4 flex gap-3">
          <div className="flex-1">
            <Input placeholder="Buscar por nome ou e-mail" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <Button type="submit" variant="outline">Filtrar</Button>
          {search && (
            <Button type="button" variant="outline" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>Limpar</Button>
          )}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 font-semibold text-slate-600">Nome / E-mail</th>
                <th className="hidden pb-3 font-semibold text-slate-600 md:table-cell">Telefone</th>
                <th className="hidden pb-3 font-semibold text-slate-600 sm:table-cell">Cidade/UF</th>
                <th className="pb-3 text-center font-semibold text-slate-600">Líderes</th>
                <th className="pb-3 text-center font-semibold text-slate-600">Apoiadores</th>
                <th className="pb-3 font-semibold text-slate-600">Status</th>
                <th className="pb-3 font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading && Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}

              {!tableLoading && coordinators.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon="👔" title="Nenhum coordenador encontrado" description={search ? 'Tente ajustar a busca.' : 'Cadastre o primeiro coordenador.'} />
                  </td>
                </tr>
              )}

              {!tableLoading && coordinators.map((coord) => (
                <tr key={coord.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 font-medium text-slate-900">
                    {coord.firstName} {coord.lastName}
                    <div className="text-xs text-slate-400 font-normal">{coord.email}</div>
                  </td>
                  <td className="hidden py-3 text-slate-500 md:table-cell">{formatPhone(coord.phone)}</td>
                  <td className="hidden py-3 text-slate-500 sm:table-cell">{coord.city}/{coord.state}</td>
                  <td className="py-3 text-center font-semibold text-brand-700">{coord.leadersCount}</td>
                  <td className="py-3 text-center font-semibold text-brand-700">{coord.supportersCount}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${coord.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {coord.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/dashboard/lideres?coordinatorId=${coord.id}`}>
                        <button className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">Líderes</button>
                      </Link>
                      <button onClick={() => openEdit(coord)} className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">Editar</button>
                      <button onClick={() => handleDeactivate(coord)} className={`rounded px-2 py-1 text-xs font-medium ${coord.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {coord.active ? 'Desativar' : 'Ativar'}
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

export default function CoordinatorsPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <CoordinatorsContent />
    </ProtectedRoute>
  );
}
