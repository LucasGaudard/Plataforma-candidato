'use client';

import { useState } from 'react';
import { Button, Input, Select, Alert } from '@platform/ui';
import { BRAZILIAN_STATES, CITIES_BY_STATE, formatPhone } from '@platform/utils';
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
    state: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const stateOptions = BRAZILIAN_STATES.map((s) => ({ value: s, label: s }));

  function updateField(field: keyof typeof form, value: string) {
    let formatted = value;

    if (field === 'phone') {
      formatted = formatPhone(value);
    }

    setForm((prev) => {
      const next = { ...prev, [field]: formatted };
      if (field === 'state') {
        next.city = '';
      }
      return next;
    });

    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (field === 'state') delete next['city'];
      return next;
    });
  }

  const cityOptions = (() => {
    if (!form.state || !CITIES_BY_STATE[form.state]) return [];
    const opts = CITIES_BY_STATE[form.state].map(c => ({ value: c, label: c }));
    if (form.city && !opts.some(o => o.value === form.city)) {
      opts.push({ value: form.city, label: form.city });
    }
    return [{ value: '', label: 'Selecione uma cidade' }, ...opts];
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setErrors({});
    setLoading(true);

    try {
      await api.createSupporter(leaderSlug, form);
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
          label="Estado *"
          name="state"
          value={form.state}
          onChange={(e) => updateField('state', e.target.value)}
          error={errors.state}
          options={[{ value: '', label: 'Selecione' }, ...stateOptions]}
          disabled={loading}
        />
        <Select
          label="Cidade *"
          name="city"
          value={form.city}
          onChange={(e) => updateField('city', e.target.value)}
          error={errors.city}
          options={cityOptions}
          disabled={loading || !form.state}
        />
      </div>

      <div className="pt-2">
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Quero ser Apoiador
        </Button>
      </div>
    </form>
  );
}
