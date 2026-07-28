'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CampaignStatus, type SuperAdminCampaignDetail } from '@platform/types';
import { api } from '@/lib/api';
import { SuperAdminLayout } from '@/components/super-admin/super-admin-layout';

export default function CampaignDetailPage() {
  const id = useParams<{ id: string }>().id;
  const [campaign, setCampaign] = useState<SuperAdminCampaignDetail | null>(null);
  const [error, setError] = useState('');
  const [admin, setAdmin] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const load = useCallback(() => api.getSuperAdminCampaign(id).then(setCampaign).catch((err: Error) => setError(err.message)), [id]);
  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!campaign) return;
    try {
      await api.updateSuperAdminCampaign(id, {
        name: campaign.name, slug: campaign.slug, candidateName: campaign.candidateName, party: campaign.party,
      });
      await load();
    } catch (err) { setError((err as Error).message); }
  }

  async function changeStatus(status: CampaignStatus) {
    try { await api.updateSuperAdminCampaignStatus(id, status); await load(); }
    catch (err) { setError((err as Error).message); }
  }

  async function createAdmin(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createSuperAdminCampaignAdmin(id, admin);
      setAdmin({ firstName: '', lastName: '', email: '', password: '' });
      await load();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <SuperAdminLayout>
      {!campaign && !error && <p>Carregando...</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      {campaign && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-2xl font-bold">{campaign.name}</h2><p className="text-slate-500">/{campaign.slug}</p></div>
            <select value={campaign.status} onChange={(e) => void changeStatus(e.target.value as CampaignStatus)} className="rounded-lg border bg-white p-2">
              {Object.values(CampaignStatus).map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {Object.entries({ Usuários: campaign._count.users, Posts: campaign._count.posts, Eventos: campaign._count.events, Lives: campaign._count.lives }).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <form onSubmit={save} className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
              <h3 className="font-bold sm:col-span-2">Dados da campanha</h3>
              {(['name', 'slug', 'candidateName', 'party'] as const).map((key) => (
                <label key={key} className="text-sm">{key}<input value={campaign[key] || ''} onChange={(e) => setCampaign({ ...campaign, [key]: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
              ))}
              <button className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white sm:col-span-2">Salvar alterações</button>
            </form>
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="font-bold">Administradores</h3>
              <div className="mt-3 divide-y">{campaign.users.map((item) => <p key={item.id} className="py-2 text-sm">{item.firstName} {item.lastName} · {item.email}</p>)}</div>
              <form onSubmit={createAdmin} className="mt-5 grid gap-3 sm:grid-cols-2">
                {(['firstName', 'lastName', 'email', 'password'] as const).map((key) => (
                  <input key={key} required type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'} value={admin[key]} onChange={(e) => setAdmin({ ...admin, [key]: e.target.value })} placeholder={key} className="rounded-lg border p-2" />
                ))}
                <button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white sm:col-span-2">Adicionar administrador</button>
              </form>
            </section>
          </div>
        </>
      )}
    </SuperAdminLayout>
  );
}
