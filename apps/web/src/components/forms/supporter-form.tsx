'use client';

import { useState } from 'react';
import { Button, Input, Select, Alert } from '@platform/ui';
import { CITIES_BY_STATE, NEIGHBORHOODS_BY_CITY, formatPhone } from '@platform/utils';
import { api } from '@/lib/api';
import { submitPublicReferralRegistration } from '@/lib/public-referral-submit';
import { CityZoneSelect } from './city-zone-select';

interface SupporterFormProps {
  campaignSlug: string;
  referrerSlug: string;
  referrerName: string;
  referrerType: 'leader' | 'coordinator';
  onSuccess: () => void;
}

export function SupporterForm({ campaignSlug, referrerSlug, referrerName, referrerType, onSuccess }: SupporterFormProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    neighborhood: '',
    zone: undefined as import('@platform/types').CityZone | undefined,
    state: 'RJ', // State is implicitly RJ for the public registration
    lgpdConsent: false,
  });
  const [customNeighborhood, setCustomNeighborhood] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    let formatted = value;

    if (field === 'phone') {
      formatted = formatPhone(value);
    }

    setForm((prev) => {
      const next = { ...prev, [field]: formatted };
      if (field === 'city') {
        next.neighborhood = '';
        setCustomNeighborhood('');
      }
      return next;
    });

    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (field === 'city') delete next['neighborhood'];
      return next;
    });
  }

  const cityOptions = (() => {
    const rjCities = CITIES_BY_STATE['RJ'] || [];
    const opts = rjCities.map(c => ({ value: c, label: c }));
    if (form.city && !opts.some(o => o.value === form.city)) {
      opts.push({ value: form.city, label: form.city });
    }
    return [{ value: '', label: 'Selecione uma cidade' }, ...opts];
  })();

  const neighborhoodOptions = (() => {
    if (!form.city || !NEIGHBORHOODS_BY_CITY[form.city]) return [];
    const opts = NEIGHBORHOODS_BY_CITY[form.city].map(n => ({ value: n, label: n }));
    if (form.neighborhood && form.neighborhood !== 'Outro' && !opts.some(o => o.value === form.neighborhood)) {
      opts.push({ value: form.neighborhood, label: form.neighborhood });
    }
    return [{ value: '', label: 'Selecione um bairro/região' }, ...opts];
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setErrors({});
    setLoading(true);

    const finalNeighborhood = form.neighborhood === 'Outro' ? customNeighborhood : form.neighborhood;

    if (form.neighborhood === 'Outro' && !customNeighborhood.trim()) {
      setErrors((prev) => ({ ...prev, neighborhood: 'Por favor, informe o bairro' }));
      setLoading(false);
      return;
    }

    if (!form.lgpdConsent) {
      setErrors((prev) => ({ ...prev, lgpdConsent: 'É necessário autorizar o tratamento dos dados para concluir o cadastro.' }));
      setLoading(false);
      return;
    }

    try {
      const payload = { ...form, neighborhood: finalNeighborhood };
      await submitPublicReferralRegistration(api, {
        campaignSlug,
        referrerSlug,
        referrerType,
        payload,
      }, onSuccess);
    } catch (err) {
      const error = err as Error & { errors?: Record<string, string> };
      if (error.errors) {
        setErrors(error.errors);
      }
      setSubmitError(error.message || 'Erro ao realizar o cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {referrerName && (
        <Alert variant="info">
          Você foi indicado por <strong>{referrerName}</strong>
        </Alert>
      )}

      {submitError && <Alert variant="error">{submitError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nome *"
          name="firstName"
          value={form.firstName}
          onChange={(e) => updateField('firstName', e.target.value)}
          error={errors.firstName}
          placeholder="Seu nome"
          disabled={loading}
        />
        <Input
          label="Sobrenome *"
          name="lastName"
          value={form.lastName}
          onChange={(e) => updateField('lastName', e.target.value)}
          error={errors.lastName}
          placeholder="Seu sobrenome"
          disabled={loading}
        />
      </div>

      <Input
        label="WhatsApp *"
        name="phone"
        type="tel"
        value={form.phone}
        onChange={(e) => updateField('phone', e.target.value)}
        error={errors.phone}
        placeholder="(00) 00000-0000"
        maxLength={15}
        disabled={loading}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Cidade *"
          name="city"
          value={form.city}
          onChange={(e) => updateField('city', e.target.value)}
          error={errors.city}
          options={cityOptions}
          disabled={loading}
        />
        <CityZoneSelect value={form.zone} onChange={(zone) => setForm((prev) => ({ ...prev, zone }))} error={errors.zone} disabled={loading} />
        <div className="space-y-4">
          <Select
            label="Bairro/Região *"
            name="neighborhood"
            value={form.neighborhood}
            onChange={(e) => updateField('neighborhood', e.target.value)}
            error={errors.neighborhood}
            options={neighborhoodOptions}
            disabled={loading || !form.city || neighborhoodOptions.length === 0}
          />
          {form.neighborhood === 'Outro' && (
            <Input
              label="Qual o seu bairro? *"
              name="customNeighborhood"
              value={customNeighborhood}
              onChange={(e) => {
                setCustomNeighborhood(e.target.value);
                setErrors(prev => {
                  const next = { ...prev };
                  delete next['neighborhood'];
                  return next;
                });
              }}
              error={errors.neighborhood}
              placeholder="Digite o nome do bairro"
              disabled={loading}
            />
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border p-4 bg-slate-50 border-slate-200">
        <input
          type="checkbox"
          id="lgpdConsent"
          name="lgpdConsent"
          checked={form.lgpdConsent}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, lgpdConsent: e.target.checked }));
            setErrors((prev) => {
              const next = { ...prev };
              delete next['lgpdConsent'];
              return next;
            });
          }}
          disabled={loading}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600 cursor-pointer"
        />
        <div className="flex-1">
          <label htmlFor="lgpdConsent" className="text-sm text-slate-700 cursor-pointer select-none">
            Autorizo a utilização e o tratamento dos meus dados pessoais, de forma segura e transparente, em conformidade com a{' '}
            <a 
              href="/politica-de-privacidade" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:underline cursor-pointer font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              LGPD - Lei Geral de Proteção de Dados
            </a>
            , para realização do meu cadastro e para o envio de informações, ações, eventos e demais comunicações da campanha por e-mail, telefone e WhatsApp. Declaro estar ciente de que posso revogar esta autorização a qualquer momento. <span className="text-red-500">*</span>
          </label>
          {errors.lgpdConsent && (
            <p className="mt-1 text-sm font-medium text-red-600">{errors.lgpdConsent}</p>
          )}
        </div>
      </div>

      <div className="pt-2">
        <Button 
          type="submit" 
          loading={loading} 
          disabled={!form.lgpdConsent || loading}
          className={`w-full ${!form.lgpdConsent ? 'opacity-50 cursor-not-allowed' : ''}`} 
          size="lg"
        >
          Quero ser Apoiador
        </Button>
      </div>
    </form>
  );
}
