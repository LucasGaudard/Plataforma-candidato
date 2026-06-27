'use client';

import { useState } from 'react';
import { Button, Input, Select, Alert } from '@platform/ui';
import { CITIES_BY_STATE, NEIGHBORHOODS_BY_CITY, formatPhone } from '@platform/utils';
import { api } from '@/lib/api';

interface SupporterFormProps {
  leaderSlug: string;
  leaderName: string;
  onSuccess: () => void;
}

export function SupporterForm({ leaderSlug, leaderName, onSuccess }: SupporterFormProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    neighborhood: '',
    state: 'RJ', // State is implicitly RJ for the public registration
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

    try {
      await api.createSupporter(leaderSlug, {
        ...form,
        neighborhood: finalNeighborhood,
      });
      onSuccess();
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
      {leaderName && (
        <Alert variant="info">
          Você foi indicado por <strong>{leaderName}</strong>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Cidade *"
          name="city"
          value={form.city}
          onChange={(e) => updateField('city', e.target.value)}
          error={errors.city}
          options={cityOptions}
          disabled={loading}
        />
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

      <div className="pt-2">
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Quero ser Apoiador
        </Button>
      </div>
    </form>
  );
}
