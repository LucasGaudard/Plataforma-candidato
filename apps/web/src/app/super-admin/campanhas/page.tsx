'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CampaignStatus, type SuperAdminCampaignListItem } from '@platform/types';
import { api } from '@/lib/api';
import { SuperAdminLayout } from '@/components/super-admin/super-admin-layout';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<SuperAdminCampaignListItem[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CampaignStatus | ''>('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      api.getSuperAdminCampaigns({ search, status: status || undefined, limit: 50 })
        .then((result) => setCampaigns(result.data))
        .catch((err: Error) => setError(err.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, status]);

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Campanhas</h2><p className="text-slate-600">Gerencie todos os tenants da plataforma.</p></div>
        <Link href="/super-admin/campanhas/nova" className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white">Nova campanha</Link>
      </div>
      <div className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou slug" className="flex-1 rounded-lg border px-3 py-2" />
        <select value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus | '')} className="rounded-lg border px-3 py-2">
          <option value="">Todos os status</option>
          {Object.values(CampaignStatus).map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {error && <p className="mt-4 text-red-700">{error}</p>}
      <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Campanha</th><th>Status</th><th>Usuários</th><th>Conteúdo</th></tr></thead>
          <tbody className="divide-y">
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td className="p-4"><Link className="font-semibold text-cyan-700" href={`/super-admin/campanhas/${campaign.id}`}>{campaign.name}</Link><p className="text-slate-400">/{campaign.slug}</p></td>
                <td>{campaign.status}</td><td>{campaign.users}</td><td>{campaign.posts + campaign.events + campaign.lives}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SuperAdminLayout>
  );
}
