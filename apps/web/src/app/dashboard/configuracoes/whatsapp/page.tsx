'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Role, type WhatsappConfigStatus } from '@platform/types';
import { Button, Card } from '@platform/ui';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useToast } from '@/contexts/toast-context';

const emptyForm = {
  phoneNumberId: '',
  businessAccountId: '',
  displayPhoneNumber: '',
  accessToken: '',
  apiVersion: 'v25.0',
  enabled: false,
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('pt-BR') : 'Nunca';
}

function WhatsappConfigContent() {
  const { toast } = useToast();
  const [config, setConfig] = useState<WhatsappConfigStatus | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [recipient, setRecipient] = useState('');
  const [messageId, setMessageId] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const value = await api.getWhatsappConfigStatus();
      setConfig(value);
      setForm((current) => ({
        ...current,
        phoneNumberId: value.phoneNumberId,
        businessAccountId: value.businessAccountId,
        displayPhoneNumber: value.displayPhoneNumber || '',
        accessToken: '',
        apiVersion: value.apiVersion,
        enabled: value.enabled,
      }));
    } catch (error) {
      toast((error as Error).message, 'error');
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy('save');
    try {
      await api.updateWhatsappConfig({
        phoneNumberId: form.phoneNumberId,
        businessAccountId: form.businessAccountId,
        displayPhoneNumber: form.displayPhoneNumber,
        apiVersion: form.apiVersion,
        enabled: form.enabled,
        ...(form.accessToken.trim() ? { accessToken: form.accessToken } : {}),
      });
      setForm((current) => ({ ...current, accessToken: '' }));
      await load();
      toast('Configuração salva com segurança.', 'success');
    } catch (error) { toast((error as Error).message, 'error'); }
    finally { setBusy(''); }
  }

  async function testConnection() {
    setBusy('connection');
    try { const result = await api.testWhatsappConnection(); await load(); toast(result.message || 'Conexão validada.', 'success'); }
    catch (error) { await load(); toast((error as Error).message, 'error'); }
    finally { setBusy(''); }
  }

  async function subscribe() {
    setBusy('subscribe');
    try { const result = await api.subscribeWhatsappWebhook(); toast(result.message, 'success'); }
    catch (error) { toast((error as Error).message, 'error'); }
    finally { setBusy(''); }
  }

  async function sendTest(event: FormEvent) {
    event.preventDefault();
    setBusy('message'); setMessageId('');
    try {
      const result = await api.testWhatsappMessage({ to: recipient, mode: 'template' });
      setMessageId(result.messageId);
      await load();
      toast('Template hello_world enviado.', 'success');
    } catch (error) { toast((error as Error).message, 'error'); }
    finally { setBusy(''); }
  }

  const statusLabel = !config?.configured
    ? 'Não configurado'
    : ({ NOT_TESTED: 'Não testado', CONNECTED: 'Conectado', ERROR: 'Erro' } as const)[config.connectionStatus];

  return (
    <DashboardLayout title="Config WhatsApp">
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Config WhatsApp</h1><p className="text-slate-500">Integração exclusiva desta campanha com a WhatsApp Cloud API.</p></div>

        <Card>
          <h2 className="text-lg font-bold">Status da integração</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-slate-500">Status</p><p className="font-semibold">{statusLabel}</p></div>
            <div><p className="text-xs text-slate-500">Último teste</p><p className="text-sm">{formatDate(config?.lastConnectionAt || null)}</p></div>
            <div><p className="text-xs text-slate-500">Último webhook</p><p className="text-sm">{formatDate(config?.lastWebhookAt || null)}</p></div>
            <div><p className="text-xs text-slate-500">Último envio</p><p className="text-sm">{formatDate(config?.lastTestMessageAt || null)}</p></div>
          </div>
          {config?.lastConnectionError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{config.lastConnectionError}</p>}
        </Card>

        <form onSubmit={save}>
          <Card>
            <h2 className="text-lg font-bold">Credenciais da Meta</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm">Phone Number ID<input required inputMode="numeric" value={form.phoneNumberId} onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
              <label className="text-sm">WhatsApp Business Account ID<input required inputMode="numeric" value={form.businessAccountId} onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
              <label className="text-sm">Número de exibição<input placeholder="+5521999999999" value={form.displayPhoneNumber} onChange={(e) => setForm({ ...form, displayPhoneNumber: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
              <label className="text-sm">Versão da API<input required value={form.apiVersion} onChange={(e) => setForm({ ...form, apiVersion: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
              <label className="text-sm md:col-span-2">Access Token<input type="password" autoComplete="new-password" required={!config?.hasAccessToken} value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} placeholder={config?.hasAccessToken ? `Token configurado ••••${config.accessTokenLastFour || ''} — deixe vazio para manter` : 'Cole o token da campanha'} className="mt-1 w-full rounded-lg border p-2" /></label>
              <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />Habilitar integração (exige conexão validada)</label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="submit" disabled={Boolean(busy)}>{busy === 'save' ? 'Salvando...' : 'Salvar configuração'}</Button>
              <Button type="button" onClick={testConnection} disabled={!config?.configured || Boolean(busy)}>{busy === 'connection' ? 'Testando...' : 'Testar conexão'}</Button>
              <Button type="button" onClick={subscribe} disabled={config?.connectionStatus !== 'CONNECTED' || Boolean(busy)}>{busy === 'subscribe' ? 'Assinando...' : 'Assinar webhook'}</Button>
            </div>
          </Card>
        </form>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={sendTest}>
            <Card>
              <h2 className="text-lg font-bold">Mensagem de teste</h2>
              <label className="mt-4 block text-sm">Destinatário com DDI<input required value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="5521999999999" className="mt-1 w-full rounded-lg border p-2" /></label>
              <label className="mt-4 block text-sm">Template<select disabled className="mt-1 w-full rounded-lg border bg-slate-50 p-2"><option>hello_world · en_US</option></select></label>
              <Button className="mt-4" disabled={!config?.enabled || Boolean(busy)}>{busy === 'message' ? 'Enviando...' : 'Enviar mensagem de teste'}</Button>
              {messageId && <p className="mt-3 break-all rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Message ID: {messageId}</p>}
            </Card>
          </form>

          <Card>
            <h2 className="text-lg font-bold">Webhook</h2>
            <p className="mt-3 text-sm text-slate-600">Cole esta URL de callback no painel da Meta. O token de verificação permanece somente no ambiente da API.</p>
            <code className="mt-3 block break-all rounded-lg bg-slate-100 p-3 text-sm">{config?.webhookUrl || 'Configure API_PUBLIC_URL na API'}</code>
            <p className="mt-3 text-sm text-slate-500">Depois que a Meta validar o callback, use “Assinar webhook” para inscrever esta WABA.</p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function WhatsappConfigPage() {
  return <ProtectedRoute allowedRoles={[Role.ADMIN]}><WhatsappConfigContent /></ProtectedRoute>;
}
