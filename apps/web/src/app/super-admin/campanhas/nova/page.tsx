'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CampaignStatus } from '@platform/types';
import { api } from '@/lib/api';
import { SuperAdminLayout } from '@/components/super-admin/super-admin-layout';

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', slug: '', candidateName: '', party: '', status: CampaignStatus.ACTIVE,
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function field(name: keyof typeof form) {
    return { value: form[name], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [name]: e.target.value }) };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      const hasAdmin = Boolean(form.adminEmail || form.adminFirstName || form.adminLastName || form.adminPassword);
      const result = await api.createSuperAdminCampaign({
        name: form.name, slug: form.slug || undefined, candidateName: form.candidateName || undefined,
        party: form.party || undefined, status: form.status,
        admin: hasAdmin ? {
          firstName: form.adminFirstName, lastName: form.adminLastName,
          email: form.adminEmail, password: form.adminPassword,
        } : undefined,
      });
      router.push(`/super-admin/campanhas/${result.campaign.id}`);
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  }

  return (
    <SuperAdminLayout>
      <h2 className="text-2xl font-bold">Nova campanha</h2>
      <form onSubmit={submit} className="mt-6 max-w-3xl space-y-6">
        <section className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
          <h3 className="sm:col-span-2 font-bold">Dados da campanha</h3>
          <label className="text-sm">Nome<input required {...field('name')} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="text-sm">Slug<input {...field('slug')} className="mt-1 w-full rounded-lg border p-2" placeholder="gerado pelo nome" /></label>
          <label className="text-sm">Candidato<input {...field('candidateName')} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="text-sm">Partido<input {...field('party')} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="text-sm">Status<select {...field('status')} className="mt-1 w-full rounded-lg border p-2">{Object.values(CampaignStatus).map((item) => <option key={item}>{item}</option>)}</select></label>
        </section>
        <section className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
          <div className="sm:col-span-2"><h3 className="font-bold">Primeiro administrador (opcional)</h3><p className="text-sm text-slate-500">Se preencher, informe todos os campos.</p></div>
          <label className="text-sm">Nome<input {...field('adminFirstName')} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="text-sm">Sobrenome<input {...field('adminLastName')} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="text-sm">E-mail<input type="email" {...field('adminEmail')} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="text-sm">Senha<input type="password" {...field('adminPassword')} className="mt-1 w-full rounded-lg border p-2" /></label>
        </section>
        {error && <p className="text-red-700">{error}</p>}
        <button disabled={saving} className="rounded-lg bg-cyan-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Criar campanha'}</button>
      </form>
    </SuperAdminLayout>
  );
}
