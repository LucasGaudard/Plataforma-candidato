'use client';

import { useEffect, useState } from 'react';
import { Role, SupporterStatus, type ManualCommunicationEligibleItem, type ManualCommunicationFilters, type ManualCommunicationOptions, type ManualCommunicationPreview, type ManualCommunicationRecipientStatus, type ManualCommunicationSession, type ManualWhatsappConfig } from '@platform/types';
import { CITY_ZONE_OPTIONS, formatPhone } from '@platform/utils';
import { Button, Card, EmptyState, Input, Pagination } from '@platform/ui';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { api } from '@/lib/api';
import { buildManualWhatsappLink } from '@/lib/manual-whatsapp';
import { applyManualRecipientAction } from '@/lib/manual-communication-session';
import { manualSelectionCount, updateManualSelection } from '@/lib/manual-communication-selection';

const ALLOWED_ROLES = [Role.ADMIN, Role.COORDINATOR, Role.LEADER];
const EMPTY_OPTIONS: ManualCommunicationOptions = { leaders: [], coordinators: [], cities: [], neighborhoods: [] };

function ManualCommunications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState<ManualCommunicationFilters>({});
  const [selectionMode, setSelectionMode] = useState<'IDS' | 'FIRST' | 'ALL_FILTERED'>('IDS');
  const [customQuantity, setCustomQuantity] = useState('');
  const [firstCount, setFirstCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [eligibleItems, setEligibleItems] = useState<ManualCommunicationEligibleItem[]>([]);
  const [eligiblePage, setEligiblePage] = useState(1);
  const [eligibleTotalPages, setEligibleTotalPages] = useState(1);
  const [preview, setPreview] = useState<ManualCommunicationPreview | null>(null);
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [config, setConfig] = useState<ManualWhatsappConfig | null>(null);
  const [sessions, setSessions] = useState<ManualCommunicationSession[]>([]);
  const [active, setActive] = useState<ManualCommunicationSession | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reloadHistory() {
    setSessions(await api.getManualCommunicationSessions());
  }

  useEffect(() => {
    Promise.all([api.getManualCommunicationOptions(), api.getManualWhatsappConfig(), api.getManualCommunicationSessions()])
      .then(([availableOptions, whatsappConfig, history]) => {
        setOptions(availableOptions); setConfig(whatsappConfig); setSessions(history);
        const savedDraft = sessionStorage.getItem('manualCommunicationDraft');
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft) as { title?: string; message?: string };
            if (draft.title) setTitle(draft.title);
            if (draft.message) setMessage(draft.message);
          } finally {
            sessionStorage.removeItem('manualCommunicationDraft');
          }
        }
      })
      .catch((error: Error) => toast(error.message, 'error'));
  }, [toast]);

  function updateFilter<K extends keyof ManualCommunicationFilters>(key: K, value: ManualCommunicationFilters[K] | '') {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
    setPreview(null);
    setEligibleItems([]); setSelectedIds(new Set()); setSelectionMode('IDS'); setFirstCount(0);
  }

  async function calculatePreview() {
    setBusy(true);
    try {
      const [previewData, eligibleData] = await Promise.all([
        api.previewManualCommunication(filters),
        api.getManualCommunicationEligible(filters, 1, 20),
      ]);
      setPreview(previewData); setEligibleItems(eligibleData.data);
      setEligiblePage(1); setEligibleTotalPages(eligibleData.meta.totalPages);
      setSelectedIds(new Set()); setSelectionMode('IDS'); setFirstCount(0);
    }
    catch (error) { toast((error as Error).message, 'error'); }
    finally { setBusy(false); }
  }

  async function changeEligiblePage(page: number) {
    setBusy(true);
    try {
      const result = await api.getManualCommunicationEligible(filters, page, 20);
      setEligibleItems(result.data); setEligiblePage(page); setEligibleTotalPages(result.meta.totalPages);
    } catch (error) { toast((error as Error).message, 'error'); }
    finally { setBusy(false); }
  }

  function selectFirst(count: number) {
    if (!Number.isInteger(count) || count < 1 || count > 5000) {
      toast('Informe uma quantidade entre 1 e 5000.', 'error');
      return;
    }
    setSelectionMode('FIRST'); setFirstCount(Math.min(count, preview?.eligible || 0)); setSelectedIds(new Set());
  }

  function clearSelection() {
    setSelectionMode('IDS'); setFirstCount(0); setSelectedIds(new Set());
  }

  const selectedCount = manualSelectionCount(selectionMode, preview?.eligible || 0, selectedIds, firstCount);

  async function createSession() {
    if (!preview) return toast('Calcule a prévia antes de criar a sessão.', 'error');
    if (selectedCount === 0) return toast('Selecione ao menos um apoiador.', 'error');
    const selection = selectionMode === 'IDS'
      ? { mode: 'IDS' as const, ids: [...selectedIds] }
      : selectionMode === 'FIRST'
        ? { mode: 'FIRST' as const, count: firstCount }
        : { mode: 'ALL_FILTERED' as const };
    setBusy(true);
    try {
      const created = await api.createManualCommunication({ title, message, filters, quantity: 'ALL', selection });
      setActive(created); setOpenedId(null); setTitle(''); setMessage(''); setPreview(null);
      setEligibleItems([]); clearSelection();
      await reloadHistory();
      toast('Sessão de comunicação criada.', 'success');
    } catch (error) { toast((error as Error).message, 'error'); }
    finally { setBusy(false); }
  }

  async function openSession(id: string, resume = false) {
    setBusy(true);
    try {
      if (resume) await api.updateManualCommunicationStatus(id, 'ACTIVE');
      setActive(await api.getManualCommunicationSession(id)); setOpenedId(null);
      if (resume) await reloadHistory();
    } catch (error) { toast((error as Error).message, 'error'); }
    finally { setBusy(false); }
  }

  async function pauseSession() {
    if (!active) return;
    setBusy(true);
    try {
      await api.updateManualCommunicationStatus(active.id, 'PAUSED');
      setActive({ ...active, status: 'PAUSED' }); await reloadHistory();
      toast('Sessão pausada.', 'success');
    } catch (error) { toast((error as Error).message, 'error'); }
    finally { setBusy(false); }
  }

  const current = active?.recipients?.find((recipient) => recipient.status === 'PENDING');

  function openWhatsapp() {
    if (!active || !current) return;
    if (!config?.officialNumber) return toast('Configure primeiro o número oficial do WhatsApp Business.', 'error');
    const link = buildManualWhatsappLink(current.phone, active.message);
    if (!link) return toast('Telefone inválido.', 'error');
    window.open(link, '_blank', 'noopener,noreferrer'); setOpenedId(current.id);
  }

  async function actOnRecipient(action: Exclude<ManualCommunicationRecipientStatus, 'PENDING'>) {
    if (!active || !current) return;
    if (action === 'OPT_OUT' && !window.confirm('Marcar este apoiador como não deseja receber novas mensagens?')) return;
    setBusy(true);
    try {
      await api.updateManualCommunicationRecipient(active.id, current.id, action);
      const updated = applyManualRecipientAction(active, current.id, action);
      const hasLoadedPending = updated.recipients?.some((recipient) => recipient.status === 'PENDING');
      setActive(updated.counts.PENDING > 0 && !hasLoadedPending
        ? await api.getManualCommunicationSession(active.id)
        : updated);
      setOpenedId(null);
      await reloadHistory();
      toast(action === 'SENT' ? 'Envio registrado.' : action === 'SKIPPED' ? 'Destinatário pulado.' : 'Apoiador marcado para não receber mais.', 'success');
    } catch (error) { toast((error as Error).message, 'error'); }
    finally { setBusy(false); }
  }

  const total = active ? Object.values(active.counts).reduce((sum, count) => sum + count, 0) : 0;
  const processed = active ? total - active.counts.PENDING : 0;

  return <DashboardLayout title="Comunicação manual" subtitle="Crie grupos segmentados e processe cada conversa pelo WhatsApp Business.">
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-6">
        <Card>
          <h2 className="text-lg font-bold">Nova sessão</h2>
          <div className="mt-4 grid gap-3">
            <Input id="communication-title" label="Título interno" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
            <label className="text-sm font-medium">Mensagem<textarea className="mt-1 w-full rounded-lg border p-3" rows={5} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="rounded-lg border p-2" value={filters.status || ''} onChange={(event) => updateFilter('status', event.target.value as ManualCommunicationFilters['status'] | '')}><option value="">Todos os status elegíveis</option>{Object.values(SupporterStatus).map((status) => <option key={status}>{status}</option>)}</select>
              <select className="rounded-lg border p-2" value={filters.zone || ''} onChange={(event) => updateFilter('zone', event.target.value as ManualCommunicationFilters['zone'] | '')}><option value="">Todas as zonas</option>{CITY_ZONE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              <select className="rounded-lg border p-2" value={filters.city || ''} onChange={(event) => updateFilter('city', event.target.value)}><option value="">Todas as cidades</option>{options.cities.map((item) => <option key={item}>{item}</option>)}</select>
              <select className="rounded-lg border p-2" value={filters.neighborhood || ''} onChange={(event) => updateFilter('neighborhood', event.target.value)}><option value="">Todos os bairros</option>{options.neighborhoods.map((item) => <option key={item}>{item}</option>)}</select>
              {user?.role === Role.ADMIN && <select className="rounded-lg border p-2" value={filters.coordinatorId || ''} onChange={(event) => updateFilter('coordinatorId', event.target.value)}><option value="">Todos os coordenadores</option>{options.coordinators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
              {user?.role !== Role.LEADER && <select className="rounded-lg border p-2" value={filters.leaderId || ''} onChange={(event) => updateFilter('leaderId', event.target.value)}><option value="">Todos os líderes</option>{options.leaders.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
              <label className="text-sm">Cadastro a partir de<input type="date" className="mt-1 w-full rounded-lg border p-2" value={filters.registeredFrom || ''} onChange={(event) => updateFilter('registeredFrom', event.target.value)} /></label>
              <label className="text-sm">Cadastro até<input type="date" className="mt-1 w-full rounded-lg border p-2" value={filters.registeredTo || ''} onChange={(event) => updateFilter('registeredTo', event.target.value)} /></label>
            </div>
            <Button type="button" variant="outline" disabled={busy} onClick={calculatePreview}>Calcular prévia</Button>
            {preview && <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-4"><span><strong>{preview.totalFound}</strong><br />encontrados</span><span className="text-emerald-700"><strong>{preview.eligible}</strong><br />elegíveis</span><span className="text-amber-700"><strong>{preview.excludedOptOut}</strong><br />OPT_OUT</span><span className="text-red-700"><strong>{preview.invalidPhone}</strong><br />sem telefone válido</span></div>}
            {preview && <div className="space-y-3 rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong>Selecionar apoiadores</strong><span className="text-sm text-brand-700">Selecionados: {selectedCount}</span></div>
              <div className="flex flex-wrap gap-2">
                {[25, 50, 100].map((count) => <Button key={count} type="button" size="sm" variant="outline" onClick={() => selectFirst(count)}>Primeiros {count}</Button>)}
                <Button type="button" size="sm" variant="outline" onClick={() => { setSelectionMode('ALL_FILTERED'); setSelectedIds(new Set()); setFirstCount(0); }}>Todos os {preview.eligible} filtrados</Button>
                <div className="flex gap-1"><input aria-label="Quantidade personalizada" type="number" min="1" max="5000" className="w-24 rounded-lg border p-2 text-sm" value={customQuantity} onChange={(event) => setCustomQuantity(event.target.value)} /><Button type="button" size="sm" variant="outline" onClick={() => selectFirst(Number(customQuantity))}>Selecionar</Button></div>
                <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>Limpar seleção</Button>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2"><input aria-label="Selecionar todos desta página" type="checkbox" checked={eligibleItems.length > 0 && eligibleItems.every((item) => selectedIds.has(item.id)) && selectionMode === 'IDS'} onChange={(event) => {
                setSelectionMode('IDS'); setFirstCount(0);
                setSelectedIds((current) => updateManualSelection(current, eligibleItems.map((item) => item.id), event.target.checked));
              }} /></th><th className="p-2">Nome</th><th className="p-2">Telefone</th><th className="p-2">Cidade / bairro / zona</th><th className="p-2">Coordenador / líder</th><th className="p-2">Cadastro</th></tr></thead><tbody>{eligibleItems.map((item) => <tr key={item.id} className="border-b"><td className="p-2"><input aria-label={`Selecionar ${item.name}`} type="checkbox" checked={selectionMode === 'IDS' && selectedIds.has(item.id)} onChange={(event) => { setSelectionMode('IDS'); setFirstCount(0); setSelectedIds((current) => updateManualSelection(current, [item.id], event.target.checked)); }} /></td><td className="p-2 font-medium">{item.name}</td><td className="p-2">{formatPhone(item.phone)}</td><td className="p-2">{item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''}{item.zone ? ` · ${item.zone}` : ''}</td><td className="p-2">{item.coordinatorName || '—'} / {item.leaderName || '—'}</td><td className="p-2">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table></div>
              {eligibleTotalPages > 1 && <Pagination page={eligiblePage} totalPages={eligibleTotalPages} onPageChange={changeEligiblePage} />}
            </div>}
            <Button type="button" disabled={busy || !preview || !title.trim() || !message.trim() || selectedCount === 0} onClick={createSession}>Criar sessão com {selectedCount} selecionado{selectedCount === 1 ? '' : 's'}</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Histórico</h2>
          <div className="mt-3 space-y-2">{sessions.length === 0 ? <p className="text-sm text-slate-500">Nenhuma sessão criada.</p> : sessions.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><strong>{session.title}</strong><p className="text-xs text-slate-500">{session.createdByName} · {new Date(session.createdAt).toLocaleString('pt-BR')} · {session.counts.SENT} enviados, {session.counts.PENDING} pendentes, {session.counts.SKIPPED} pulados</p></div><Button type="button" size="sm" variant="outline" onClick={() => openSession(session.id, session.status === 'PAUSED')}>{session.status === 'PAUSED' ? 'Retomar' : 'Abrir'}</Button></div>)}</div>
        </Card>
      </div>

      <Card className="self-start xl:sticky xl:top-4">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Fila da sessão</h2>{active?.status === 'ACTIVE' && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={pauseSession}>Pausar</Button>}</div>
        {!active ? <EmptyState icon="📨" title="Nenhuma sessão aberta" description="Crie uma sessão ou abra uma do histórico." /> : <div className="mt-4">
          <h3 className="font-bold">{active.title}</h3><p className="mt-1 text-sm text-slate-500">{processed} de {total} processados · {active.counts.PENDING} pendentes</p>
          {active.status === 'PAUSED' ? <div className="mt-5 rounded-lg bg-amber-50 p-4 text-amber-800">Sessão pausada. Retome pelo histórico para continuar.</div> : !current ? <div className="mt-5"><EmptyState icon="✅" title="Sessão concluída" description={`${active.counts.SENT} enviados, ${active.counts.SKIPPED} pulados e ${active.counts.OPT_OUT} opt-outs.`} /></div> : <div className="mt-5 rounded-xl border p-4"><p className="text-xs uppercase text-brand-600">Próximo destinatário</p><p className="mt-1 text-xl font-bold">{current.supporterName}</p><p className="text-sm text-slate-500">{formatPhone(current.phone)}</p><div className="mt-4 flex flex-wrap gap-2"><Button type="button" onClick={openWhatsapp}>Abrir no WhatsApp</Button><Button type="button" variant="outline" disabled={busy || openedId !== current.id} onClick={() => actOnRecipient('SENT')}>Marcar como enviado</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => actOnRecipient('SKIPPED')}>Pular</Button><Button type="button" variant="danger" disabled={busy} onClick={() => actOnRecipient('OPT_OUT')}>Não enviar mais</Button></div>{openedId !== current.id && <p className="mt-2 text-xs text-slate-500">Abra a conversa antes de registrar o envio.</p>}</div>}
        </div>}
      </Card>
    </div>
  </DashboardLayout>;
}

export default function ManualCommunicationPage() {
  return <ProtectedRoute allowedRoles={ALLOWED_ROLES}><ManualCommunications /></ProtectedRoute>;
}
