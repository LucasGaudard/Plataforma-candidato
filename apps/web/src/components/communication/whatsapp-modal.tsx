'use client';

import { useEffect, useState } from 'react';
import type { CommunicationFilters } from '@platform/types';
import { BRAZILIAN_STATES, CITIES_BY_STATE } from '@platform/utils';
import { Button, Input, Select } from '@platform/ui';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/toast-context';

export interface WhatsappModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    type: 'POST' | 'EVENTO' | 'LIVE';
    title: string;
    description: string;
  } | null;
}

export function WhatsappModal({ isOpen, onClose, content }: WhatsappModalProps) {
  const { toast } = useToast();

  const [filters, setFilters] = useState<CommunicationFilters>({
    verifiedOnly: false,
    city: '',
    state: '',
  });

  const [testPhone, setTestPhone] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    if (!isOpen || !content) return;
    
    // Na Etapa 8, sabemos que apenas o ADMIN pode abrir isso (através do ContentManager).
    // Mesmo assim, usaremos a rota de admin para manter a coesão do plano.
    setLoadingCount(true);
    api
      .getAdminRecipientCount(filters)
      .then((res) => setRecipientCount(res.count))
      .catch((err) => toast((err as Error).message, 'error'))
      .finally(() => setLoadingCount(false));
  }, [isOpen, filters, content, toast]);

  if (!isOpen || !content) return null;

  const cityFilterOptions = (() => {
    if (!filters.state || !CITIES_BY_STATE[filters.state]) return [];
    const opts = CITIES_BY_STATE[filters.state].map(c => ({ value: c, label: c }));
    if (filters.city && !opts.some(o => o.value === filters.city)) {
      opts.push({ value: filters.city, label: filters.city });
    }
    return [{ value: '', label: 'Todas as cidades' }, ...opts];
  })();

  const previewMessage = `Olá!

Temos uma nova atualização da campanha:

${content.title}

${content.description}

Acompanhe as novidades.`;

  function handleTestSend() {
    if (!testPhone) {
      toast('Informe um número para teste.', 'error');
      return;
    }
    const cleanPhone = testPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast('Número inválido.', 'error');
      return;
    }
    
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(previewMessage)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="text-xl font-bold text-brand-900">
            Enviar WhatsApp: {content.type}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Esquerda: Segmentação e Contagem */}
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-semibold text-slate-800">1. Segmentação</h3>
                <div className="space-y-4 rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.verifiedOnly}
                      onChange={(e) => setFilters({ ...filters, verifiedOnly: e.target.checked })}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Apenas apoiadores VERIFIED
                  </label>
                  
                  <Select
                    label="Por Estado"
                    options={[
                      { value: '', label: 'Todos os estados' },
                      ...BRAZILIAN_STATES.map((s) => ({ value: s, label: s })),
                    ]}
                    value={filters.state || ''}
                    onChange={(e) => setFilters({ ...filters, state: e.target.value, city: '' })}
                  />

                  <Select
                    label="Por Cidade"
                    value={filters.city || ''}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    options={cityFilterOptions}
                    disabled={!filters.state}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-slate-800">2. Destinatários</h3>
                <div className="flex items-center justify-between rounded-lg bg-brand-50 p-4 border border-brand-100">
                  <span className="text-sm font-medium text-brand-800">
                    Encontrados na base:
                  </span>
                  <span className="text-2xl font-bold text-brand-900">
                    {loadingCount ? '...' : recipientCount ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Direita: Preview e Teste */}
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-semibold text-slate-800">Prévia da Mensagem</h3>
                <div className="rounded-lg bg-[#e5ddd5] p-4 text-sm text-slate-800 shadow-inner">
                  <div className="whitespace-pre-wrap rounded-md bg-white p-3 shadow-sm">
                    {previewMessage}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-slate-800">3. Teste de WhatsApp</h3>
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <Input
                    placeholder="Ex: 11999999999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                  <Button onClick={handleTestSend} className="w-full">
                    Enviar teste
                  </Button>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 p-5 bg-slate-50">
          <p className="text-xs text-slate-500">
            Modo demonstração. Disparo em massa não habilitado nesta etapa.
          </p>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
