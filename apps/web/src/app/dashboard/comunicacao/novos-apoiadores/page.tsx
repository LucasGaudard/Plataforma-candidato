'use client';

import { useCallback, useEffect, useState } from 'react';
import { Role, type ManualWhatsappConfig, type ManualWhatsappQueueFilters, type ManualWhatsappQueueItem, type ManualWhatsappQueueResponse } from '@platform/types';
import { CITY_ZONE_OPTIONS, formatPhone } from '@platform/utils';
import { Button, Card, EmptyState } from '@platform/ui';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { api } from '@/lib/api';
import { buildManualWhatsappLink, removeSentItemFromManualQueue } from '@/lib/manual-whatsapp';

const ALLOWED_ROLES = [Role.ADMIN, Role.COORDINATOR, Role.LEADER];
const EMPTY_QUEUE: ManualWhatsappQueueResponse = {
  items: [], totalPending: 0, totalSent: 0,
  filters: { leaders: [], coordinators: [], neighborhoods: [] },
};

const ORIGIN_LABELS = {
  DIRECT: 'Direto',
  LEADER: 'Líder',
  COORDINATOR: 'Coordenador',
} as const;

function NewSupportersQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [queue, setQueue] = useState(EMPTY_QUEUE);
  const [config, setConfig] = useState<ManualWhatsappConfig | null>(null);
  const [filters, setFilters] = useState<ManualWhatsappQueueFilters>({});
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [sentThisSession, setSentThisSession] = useState(0);
  const [initialTotal, setInitialTotal] = useState(0);

  const loadQueue = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [queueData, configData] = await Promise.all([
        api.getManualWhatsappQueue(filters),
        api.getManualWhatsappConfig(),
      ]);
      setQueue(queueData);
      setConfig(configData);
      setInitialTotal(queueData.totalPending);
      setReviewed(0);
      setSentThisSession(0);
      setOpenedId(null);
    } catch (error) {
      toast((error as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, toast, user]);

  useEffect(() => { void loadQueue(); }, [loadQueue]);

  const current = queue.items[0];

  function openWhatsapp(supporter: ManualWhatsappQueueItem) {
    if (!config?.officialNumber) {
      toast('Configure primeiro o número oficial do WhatsApp Business.', 'error');
      return;
    }
    const link = buildManualWhatsappLink(supporter.phone, config.initialMessage);
    if (!link) {
      toast('O apoiador não possui telefone válido.', 'error');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
    setOpenedId(supporter.id);
  }

  async function markSent(supporter: ManualWhatsappQueueItem) {
    setMarking(true);
    try {
      await api.markManualWhatsappInitialMessageSent(supporter.id);
      if (queue.items.length === 1 && queue.totalPending > 1) {
        setQueue(await api.getManualWhatsappQueue(filters));
      } else {
        setQueue((currentQueue) => removeSentItemFromManualQueue(currentQueue, supporter.id));
      }
      setReviewed((value) => value + 1);
      setSentThisSession((value) => value + 1);
      setOpenedId(null);
      toast('Mensagem inicial marcada como enviada.', 'success');
    } catch (error) {
      toast((error as Error).message, 'error');
    } finally {
      setMarking(false);
    }
  }

  function skip() {
    setQueue((currentQueue) => currentQueue.items.length < 2 ? currentQueue : ({
      ...currentQueue,
      items: [...currentQueue.items.slice(1), currentQueue.items[0]],
    }));
    setOpenedId(null);
    setReviewed((value) => Math.min(initialTotal, value + 1));
  }

  function updateFilter<K extends keyof ManualWhatsappQueueFilters>(key: K, value: ManualWhatsappQueueFilters[K] | '') {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value || undefined }));
  }

  return <DashboardLayout title="Novos apoiadores" subtitle="Fila manual da mensagem inicial, dos cadastros mais antigos para os mais recentes.">
    <Card className="mb-5">
      <div className="grid gap-3 md:grid-cols-4">
        {user?.role === Role.ADMIN && <select className="rounded-lg border p-2 text-sm" value={filters.coordinatorId || ''} onChange={(event) => updateFilter('coordinatorId', event.target.value)}>
          <option value="">Todos os coordenadores</option>
          {queue.filters.coordinators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>}
        {user?.role !== Role.LEADER && <select className="rounded-lg border p-2 text-sm" value={filters.leaderId || ''} onChange={(event) => updateFilter('leaderId', event.target.value)}>
          <option value="">Todos os líderes</option>
          {queue.filters.leaders.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>}
        <select className="rounded-lg border p-2 text-sm" value={filters.zone || ''} onChange={(event) => updateFilter('zone', event.target.value as ManualWhatsappQueueFilters['zone'] | '')}>
          <option value="">Todas as zonas</option>
          {CITY_ZONE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select className="rounded-lg border p-2 text-sm" value={filters.neighborhood || ''} onChange={(event) => updateFilter('neighborhood', event.target.value)}>
          <option value="">Todos os bairros</option>
          {queue.filters.neighborhoods.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
    </Card>

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <Card><p className="text-sm text-slate-500">Pendentes</p><p className="text-2xl font-bold text-slate-900">{queue.totalPending}</p></Card>
      <Card><p className="text-sm text-slate-500">Marcados nesta sessão</p><p className="text-2xl font-bold text-emerald-700">{sentThisSession}</p></Card>
      <Card><p className="text-sm text-slate-500">Progresso</p><p className="text-2xl font-bold text-slate-900">{Math.min(reviewed, initialTotal)} de {initialTotal}</p></Card>
    </div>

    <Card>
      {loading ? <p className="py-10 text-center text-slate-500">Carregando fila...</p> : !current ? <EmptyState icon="✅" title="Fila concluída" description="Nenhum novo apoiador pendente para os filtros selecionados." /> : <div className="mx-auto max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Próximo apoiador</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">{current.firstName} {current.lastName}</h2>
        <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Telefone</dt><dd className="font-medium">{formatPhone(current.phone)}</dd></div>
          <div><dt className="text-slate-500">Origem</dt><dd className="font-medium">{ORIGIN_LABELS[current.origin]}{current.originName ? ` · ${current.originName}` : ''}</dd></div>
          <div><dt className="text-slate-500">Cadastro</dt><dd className="font-medium">{new Date(current.createdAt).toLocaleString('pt-BR')}</dd></div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={() => openWhatsapp(current)}>Abrir no WhatsApp</Button>
          <Button type="button" variant="outline" disabled={openedId !== current.id || marking} onClick={() => markSent(current)}>{marking ? 'Marcando...' : 'Marcar como enviada'}</Button>
          <Button type="button" variant="ghost" onClick={skip}>Pular</Button>
        </div>
        {openedId !== current.id && <p className="mt-2 text-xs text-slate-500">Abra a conversa antes de marcar a mensagem como enviada.</p>}
      </div>}
    </Card>
  </DashboardLayout>;
}

export default function NewSupportersPage() {
  return <ProtectedRoute allowedRoles={ALLOWED_ROLES}><NewSupportersQueue /></ProtectedRoute>;
}
