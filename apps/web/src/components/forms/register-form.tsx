'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Alert } from '@platform/ui';
import {
  BRAZILIAN_STATES,
  CITIES_BY_STATE,
  NEIGHBORHOODS_BY_CITY,
  formatCpf,
  formatPhone,
  validateRegisterInput,
} from '@platform/utils';
import { useAuth } from '@/contexts/auth-context';

interface RegisterFormProps {
  leaderSlug?: string;
  leaderName?: string;
}

export function RegisterForm({ leaderSlug, leaderName }: RegisterFormProps) {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    cpf: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    neighborhood: '',
    state: 'RJ', // Default to RJ for Paula's campaign
    password: '',
    confirmPassword: '',
  });
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const stateOptions = BRAZILIAN_STATES.map((s) => ({ value: s, label: s }));

  function updateField(field: string, value: string) {
    let formatted = value;

    if (field === 'cpf') formatted = formatCpf(value);
    if (field === 'phone') formatted = formatPhone(value);

    setForm((prev) => {
      const next = { ...prev, [field]: formatted };
      if (field === 'state') {
        next.city = '';
        next.neighborhood = '';
        setCustomNeighborhood('');
      }
      if (field === 'city') {
        next.neighborhood = '';
        setCustomNeighborhood('');
      }
      return next;
    });

    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (field === 'state') {
        delete next['city'];
        delete next['neighborhood'];
      }
      if (field === 'city') delete next['neighborhood'];
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

    const finalNeighborhood = form.neighborhood === 'Outro' ? customNeighborhood : form.neighborhood;

    const validation = validateRegisterInput({
      firstName: form.firstName,
      lastName: form.lastName,
      cpf: form.cpf,
      phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      state: form.state,
      password: form.password,
    });

    const fieldErrors = { ...validation.errors };

    if (form.neighborhood === 'Outro' && !customNeighborhood.trim()) {
      fieldErrors.neighborhood = 'Por favor, informe o bairro';
    }

    if (form.password !== form.confirmPassword) {
      fieldErrors.confirmPassword = 'As senhas não coincidem';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        cpf: form.cpf,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        neighborhood: finalNeighborhood,
        password: form.password,
        leaderSlug,
      });
      router.push('/dashboard');
    } catch (err) {
      const error = err as Error & { errors?: Record<string, string> };
      if (error.errors) {
        setErrors(error.errors);
      }
      setSubmitError(error.message || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {leaderName && (
        <Alert variant="info">
          Você está se cadastrando pelo link de <strong>{leaderName}</strong>
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
        />
        <Input
          label="Sobrenome *"
          name="lastName"
          value={form.lastName}
          onChange={(e) => updateField('lastName', e.target.value)}
          error={errors.lastName}
          placeholder="Seu sobrenome"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="CPF *"
          name="cpf"
          value={form.cpf}
          onChange={(e) => updateField('cpf', e.target.value)}
          error={errors.cpf}
          placeholder="000.000.000-00"
          maxLength={14}
        />
        <Input
          label="Telefone *"
          name="phone"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          error={errors.phone}
          placeholder="(00) 00000-0000"
          maxLength={15}
        />
      </div>

      <Input
        label="E-mail *"
        name="email"
        type="email"
        value={form.email}
        onChange={(e) => updateField('email', e.target.value)}
        error={errors.email}
        placeholder="seu@email.com"
      />

      <Input
        label="Endereço *"
        name="address"
        value={form.address}
        onChange={(e) => updateField('address', e.target.value)}
        error={errors.address}
        placeholder="Rua, número, complemento"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Estado *"
          name="state"
          value={form.state}
          onChange={(e) => updateField('state', e.target.value)}
          error={errors.state}
          options={[{ value: '', label: 'Selecione' }, ...stateOptions]}
        />
        <Select
          label="Cidade *"
          name="city"
          value={form.city}
          onChange={(e) => updateField('city', e.target.value)}
          error={errors.city}
          options={cityOptions}
          disabled={!form.state}
        />
      </div>

      <div className="space-y-4">
        {form.city && NEIGHBORHOODS_BY_CITY[form.city] ? (
          <Select
            label="Bairro/Região (Opcional)"
            name="neighborhood"
            value={form.neighborhood}
            onChange={(e) => updateField('neighborhood', e.target.value)}
            error={errors.neighborhood}
            options={neighborhoodOptions}
          />
        ) : (
          <Input
            label="Bairro/Região (Opcional)"
            name="customNeighborhood"
            value={customNeighborhood}
            onChange={(e) => {
              setCustomNeighborhood(e.target.value);
              updateField('neighborhood', 'Outro');
            }}
            placeholder="Digite o nome do bairro"
          />
        )}
        {form.neighborhood === 'Outro' && form.city && NEIGHBORHOODS_BY_CITY[form.city] && (
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
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Senha *"
          name="password"
          type="password"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={errors.password}
          placeholder="Mínimo 8 caracteres"
        />
        <Input
          label="Confirmar senha *"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          placeholder="Repita a senha"
        />
      </div>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Criar conta
      </Button>
    </form>
  );
}
