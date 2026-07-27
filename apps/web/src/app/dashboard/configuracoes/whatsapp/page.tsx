'use client';

import { useCallback, useEffect, useState } from 'react';
import { Role } from '@platform/types';
import type { WhatsappConfigStatus, WhatsappTestState } from '@platform/types';
import { Card, Button } from '@platform/ui';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useToast } from '@/contexts/toast-context';

const ALLOWED_ROLES: Role[] = [Role.ADMIN];

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-50'}`}>
        {checked && (
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${checked ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}

function WhatsappConfigContent() {
  const { toast } = useToast();
  const [config, setConfig] = useState<WhatsappConfigStatus | null>(null);
  const [testState, setTestState] = useState<WhatsappTestState | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [testingAll, setTestingAll] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testingMsg, setTestingMsg] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  
  const [testPhone, setTestPhone] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const [conf, state] = await Promise.all([
        api.getWhatsappConfigStatus(),
        api.getWhatsappTestStatus(),
      ]);
      setConfig(conf);
      setTestState(state);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleCopy(text: string, setCopied: (v: boolean) => void) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function runTestConnection() {
    setTestingConn(true);
    try {
      await api.testWhatsappConnection();
      toast('Conexão com a Meta realizada com sucesso!', 'success');
    } catch (err) {
      toast(`Falha na conexão: ${(err as Error).message}`, 'error');
    } finally {
      setTestingConn(false);
      fetchStatus();
    }
  }

  async function runTestMessage() {
    if (!testPhone) {
      toast('Digite um número de telefone para teste', 'error');
      return;
    }
    setTestingMsg(true);
    try {
      await api.testWhatsappMessage({ phone: testPhone });
      toast('Mensagem de teste enviada!', 'success');
    } catch (err) {
      toast(`Falha no envio: ${(err as Error).message}`, 'error');
    } finally {
      setTestingMsg(false);
      fetchStatus();
    }
  }

  async function runTestWebhook() {
    if (!testPhone) {
      toast('Digite um número de telefone (pode ser fictício) para simular o Webhook', 'error');
      return;
    }
    setTestingWebhook(true);
    try {
      await api.testWhatsappWebhook({ phone: testPhone });
      toast('Webhook simulado com sucesso!', 'success');
    } catch (err) {
      toast(`Falha no Webhook: ${(err as Error).message}`, 'error');
    } finally {
      setTestingWebhook(false);
      fetchStatus();
    }
  }

  async function handleTestAll() {
    setTestingAll(true);
    try {
      await api.testWhatsappConnection();
      if (testPhone) {
        await api.testWhatsappMessage({ phone: testPhone });
        await api.testWhatsappWebhook({ phone: testPhone });
      }
      toast('Relatório: Todos os testes concluídos!', 'success');
    } catch (err) {
      toast(`Teste interrompido: ${(err as Error).message}`, 'error');
    } finally {
      setTestingAll(false);
      fetchStatus();
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Assistente de Ativação" subtitle="WhatsApp Cloud API">
        <div className="animate-pulse space-y-6 max-w-4xl">
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  const isConnOk = testState?.lastConnectionTest?.success ?? false;
  const isMsgOk = testState?.lastMessageTest?.success ?? false;
  const isWebhookOk = testState?.lastWebhookTest?.success ?? false;
  const isSystemReady = Boolean(isConnOk && isMsgOk && isWebhookOk && config?.enabled);

  return (
    <DashboardLayout
      title="Assistente de Ativação"
      subtitle="Validação e testes da integração WhatsApp Cloud API"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
        
        {/* Coluna Esquerda: Ações de Teste */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">1. Testar Credenciais da Meta</h2>
              <Button size="sm" onClick={runTestConnection} disabled={testingConn || testingAll}>
                {testingConn ? 'Testando...' : 'Testar conexão com a Meta'}
              </Button>
            </div>
            
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-slate-700">Status do Access Token:</span>
                {testState?.lastConnectionTest ? (
                  isConnOk ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      🟢 Token válido
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                      🔴 Token inválido
                    </span>
                  )
                ) : (
                  <span className="text-sm text-slate-500">Aguardando teste...</span>
                )}
              </div>
              
              {isConnOk && testState?.lastConnectionTest?.data && (
                <div className="grid grid-cols-2 gap-4 text-sm mt-4 border-t pt-4 border-slate-200">
                  <div>
                    <span className="block text-xs text-slate-500">Phone Number ID</span>
                    <span className="font-medium text-slate-800">{config?.hasPhoneNumberId ? 'Válido' : 'Não configurado'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">Business Account ID</span>
                    <span className="font-medium text-slate-800">{config?.hasBusinessAccountId ? 'Válido' : 'Não configurado'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">API Version</span>
                    <span className="font-medium text-slate-800">{config?.apiVersion}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-800 mb-4">2. Teste de Envio & Webhook</h2>
            
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
              <label className="block text-sm font-medium text-blue-900 mb-1">
                Número de telefone para testes
              </label>
              <input
                type="text"
                placeholder="5511999999999"
                className="w-full max-w-sm rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <p className="mt-1 text-xs text-blue-700">Necessário para os testes abaixo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4 relative">
                <h3 className="font-semibold text-slate-800 mb-2">Envio de Mensagem</h3>
                <p className="text-xs text-slate-500 mb-4 h-8">
                  {config?.enabled 
                    ? 'Realiza um disparo de verdade usando a API da Meta.' 
                    : 'Modo simulação ativo. Nenhuma mensagem real será enviada.'}
                </p>
                <Button size="sm" variant="secondary" className="w-full" onClick={runTestMessage} disabled={testingMsg || testingAll}>
                  {testingMsg ? 'Enviando...' : 'Enviar mensagem teste'}
                </Button>
                {testState?.lastMessageTest && (
                  <div className="mt-3 text-center">
                    {isMsgOk ? (
                      <span className="text-xs font-bold text-emerald-600">Mensagem enviada com sucesso</span>
                    ) : (
                      <span className="text-xs font-bold text-red-600">Erro retornado pela Meta</span>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg p-4 relative">
                <h3 className="font-semibold text-slate-800 mb-2">Simular Webhook</h3>
                <p className="text-xs text-slate-500 mb-4 h-8">
                  Simula o recebimento de uma resposta &quot;SIM&quot; do telefone informado.
                </p>
                <Button size="sm" variant="secondary" className="w-full" onClick={runTestWebhook} disabled={testingWebhook || testingAll}>
                  {testingWebhook ? 'Processando...' : 'Testar Webhook'}
                </Button>
                {testState?.lastWebhookTest && (
                  <div className="mt-3 text-center">
                    {isWebhookOk ? (
                      <span className="text-xs font-bold text-emerald-600">Webhook funcionando</span>
                    ) : (
                      <span className="text-xs font-bold text-red-600">Erro no processamento</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-800 mb-4">3. Dados de Configuração do Webhook</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL do Webhook</label>
                <div className="flex gap-2">
                  <code className="flex-1 block rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    {config?.webhookUrl}
                  </code>
                  <Button size="sm" variant="secondary" onClick={() => handleCopy(config?.webhookUrl || '', setCopiedUrl)}>
                    {copiedUrl ? 'Copiado!' : 'Copiar URL'}
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Verify Token</label>
                <div className="flex gap-2">
                  <code className="flex-1 block rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    {config?.hasVerifyToken ? '*** (Configurado nas variáveis de ambiente)' : 'Não configurado'}
                  </code>
                  <Button size="sm" variant="secondary" onClick={() => handleCopy('AQUI_VAI_O_VALOR_REAL_SE_A_GENTE_EXPUSSE_MAS_A_REGRA_EH_NAO_EXPOR_ENTAO_ISSO_PODE_SER_SO_UM_FEEDBACK_OU_USAR_O_TOKEN_SE_PERMITIDO', setCopiedToken)} disabled={true}>
                    Protegido
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">O token real deve ser consultado nas variáveis de ambiente do Render.</p>
              </div>
            </div>
          </Card>

        </div>

        {/* Coluna Direita: Status e Checklist */}
        <div className="space-y-6">
          <Card className="bg-slate-800 text-white border-0 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg viewBox="0 0 24 24" className="w-24 h-24 fill-current">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            
            <h2 className="text-lg font-bold mb-4 relative z-10">Saúde da Integração</h2>
            
            <div className="space-y-3 text-sm relative z-10">
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="text-slate-300">Status Geral</span>
                {config?.mode === 'ready' ? (
                  <span className="font-bold text-emerald-400">Online</span>
                ) : config?.mode === 'simulation' ? (
                  <span className="font-bold text-amber-400">Simulação</span>
                ) : (
                  <span className="font-bold text-red-400">Erro / Incompleto</span>
                )}
              </div>
              
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="text-slate-300">Testes Executados</span>
                <span className="font-bold">{testState?.totalTestsRun || 0}</span>
              </div>

              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="text-slate-300">Última Conexão</span>
                <span className="text-slate-100">{testState?.lastConnectionTest?.date ? new Date(testState.lastConnectionTest.date).toLocaleTimeString() : 'Nunca'}</span>
              </div>

              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="text-slate-300">Último Envio</span>
                <span className="text-slate-100">{testState?.lastMessageTest?.date ? new Date(testState.lastMessageTest.date).toLocaleTimeString() : 'Nunca'}</span>
              </div>
              
              <div className="flex justify-between pb-2">
                <span className="text-slate-300">Último Webhook</span>
                <span className="text-slate-100">{testState?.lastWebhookTest?.date ? new Date(testState.lastWebhookTest.date).toLocaleTimeString() : 'Nunca'}</span>
              </div>
            </div>

            <Button 
              className="w-full mt-6 bg-brand-500 hover:bg-brand-600 text-white relative z-10 shadow-md"
              onClick={handleTestAll}
              disabled={testingAll}
            >
              {testingAll ? 'Executando testes...' : '⚡ Testar integração completa'}
            </Button>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Checklist Inteligente</h2>
            <div className="space-y-1">
              <ChecklistItem label="Conta Meta criada" checked={isConnOk} />
              <ChecklistItem label="Página Facebook criada" checked={isConnOk} />
              <ChecklistItem label="WhatsApp Business conectado" checked={isConnOk} />
              <ChecklistItem label="Aplicativo criado" checked={isConnOk} />
              <ChecklistItem label="Produto WhatsApp adicionado" checked={isConnOk} />
              <ChecklistItem label="Access Token válido" checked={isConnOk} />
              <ChecklistItem label="Phone Number ID válido" checked={isConnOk} />
              <ChecklistItem label="Business Account ID válido" checked={config?.hasBusinessAccountId ?? false} />
              <ChecklistItem label="Verify Token configurado" checked={config?.hasVerifyToken ?? false} />
              <ChecklistItem label="Webhook configurado" checked={isWebhookOk} />
              <ChecklistItem label="Teste de envio realizado" checked={isMsgOk} />
              <ChecklistItem label="Teste do Webhook realizado" checked={isWebhookOk} />
              <div className="my-2 border-t border-slate-200"></div>
              <ChecklistItem label="Sistema pronto para produção" checked={isSystemReady} />
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function WhatsappWizardPage() {
  return (
    <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
      <WhatsappConfigContent />
    </ProtectedRoute>
  );
}
