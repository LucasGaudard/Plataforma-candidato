'use client';

import { useCallback, useEffect, useState } from 'react';
import { Role } from '@platform/types';
import type { WhatsappConfigStatus } from '@platform/types';
import { Card, Button } from '@platform/ui';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useToast } from '@/contexts/toast-context';

const ALLOWED_ROLES: Role[] = [Role.ADMIN];

function CheckItem({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          configured
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-red-100 text-red-600'
        }`}
      >
        {configured ? (
          <>
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-emerald-600" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
            </svg>
            Configurado
          </>
        ) : (
          <>
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-red-500" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
            Não configurado
          </>
        )}
      </span>
    </div>
  );
}

function ModeCard({ mode }: { mode: 'simulation' | 'ready' | 'incomplete' | null }) {
  if (!mode) return null;

  const config = {
    simulation: {
      label: 'Modo Simulação',
      description: 'WHATSAPP_ENABLED=false. Nenhuma mensagem é enviada. Apenas logs no console.',
      bg: 'bg-amber-50 border-amber-200',
      badge: 'bg-amber-100 text-amber-800',
      icon: '🟡',
    },
    ready: {
      label: 'Pronto para ativar',
      description: 'Todas as credenciais estão configuradas e WHATSAPP_ENABLED=true. O sistema está enviando mensagens.',
      bg: 'bg-emerald-50 border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800',
      icon: '🟢',
    },
    incomplete: {
      label: 'Incompleto',
      description: 'WHATSAPP_ENABLED=true mas uma ou mais credenciais estão ausentes. Mensagens não serão enviadas.',
      bg: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-800',
      icon: '🔴',
    },
  }[mode];

  return (
    <div className={`rounded-xl border-2 p-5 ${config.bg}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div>
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${config.badge}`}>
            {config.label}
          </span>
          <p className="mt-2 text-sm text-slate-600">{config.description}</p>
        </div>
      </div>
    </div>
  );
}

function WhatsappConfigContent() {
  const { toast } = useToast();
  const [config, setConfig] = useState<WhatsappConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await api.getWhatsappConfigStatus();
      setConfig(data);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleTest() {
    setTesting(true);
    try {
      const data = await api.getWhatsappConfigStatus();
      setConfig(data);
      if (data.mode === 'ready') {
        toast('✅ Configuração pronta para ativar!', 'success');
      } else if (data.mode === 'simulation') {
        toast('🟡 Sistema em modo simulação (WHATSAPP_ENABLED=false)', 'info');
      } else {
        toast('❌ Ainda faltam credenciais para ativar o envio real', 'error');
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setTesting(false);
    }
  }

  async function handleCopy() {
    if (!config?.webhookUrl) return;
    await navigator.clipboard.writeText(config.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <DashboardLayout
      title="Configurações WhatsApp"
      subtitle="Status da integração com WhatsApp Cloud API da Meta"
    >
      <div className="space-y-6 max-w-2xl">
        {/* Status geral */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-800">Status Geral</h2>
          {loading ? (
            <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <ModeCard mode={config?.mode ?? null} />
          )}
        </Card>

        {/* Checklist de credenciais */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-800">Credenciais</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : config ? (
            <div className="space-y-3">
              <CheckItem label="WHATSAPP_ENABLED" configured={config.enabled} />
              <CheckItem label="WHATSAPP_ACCESS_TOKEN" configured={config.hasAccessToken} />
              <CheckItem label="WHATSAPP_PHONE_NUMBER_ID" configured={config.hasPhoneNumberId} />
              <CheckItem label="WHATSAPP_BUSINESS_ACCOUNT_ID" configured={config.hasBusinessAccountId} />
              <CheckItem label="WHATSAPP_VERIFY_TOKEN" configured={config.hasVerifyToken} />
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">WHATSAPP_API_VERSION</span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {config.apiVersion}
                </span>
              </div>
            </div>
          ) : null}
        </Card>

        {/* URL do Webhook */}
        <Card>
          <h2 className="mb-1 text-base font-semibold text-slate-800">URL do Webhook</h2>
          <p className="mb-4 text-sm text-slate-500">
            Esta URL deve ser cadastrada no painel da Meta for Developers ao configurar o webhook do WhatsApp.
          </p>
          {loading ? (
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ) : config ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <code className="flex-1 break-all text-sm text-slate-700">{config.webhookUrl}</code>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                {copied ? '✅ Copiado!' : 'Copiar'}
              </button>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-slate-400">
            No campo <strong>Verify Token</strong> do Meta for Developers, use exatamente o valor de <code>WHATSAPP_VERIFY_TOKEN</code> configurado no Render.
          </p>
        </Card>

        {/* Instruções de ativação */}
        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-800">Como ativar quando as credenciais chegarem</h2>
          <ol className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">1</span>
              Receba os dados da conta WhatsApp Business da Paula Quintanilha.
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">2</span>
              Configure as 4 variáveis de ambiente no painel do Render e faça redeploy da API.
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">3</span>
              Clique em <strong>Testar configuração</strong> aqui. Todos os campos devem mostrar ✅ Configurado.
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">4</span>
              No Meta for Developers, cadastre a URL do Webhook acima com o Verify Token correto.
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">5</span>
              Altere <code>WHATSAPP_ENABLED=true</code> no Render e faça o redeploy final.
            </li>
          </ol>
        </Card>

        {/* Botão Testar */}
        <div className="flex justify-end">
          <Button onClick={handleTest} disabled={testing || loading}>
            {testing ? 'Verificando...' : '🔍 Testar configuração'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function WhatsappConfigPage() {
  return (
    <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
      <WhatsappConfigContent />
    </ProtectedRoute>
  );
}
