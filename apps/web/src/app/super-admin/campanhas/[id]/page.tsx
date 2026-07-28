'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CampaignStatus, type SuperAdminCampaignDetail } from '@platform/types';
import { api } from '@/lib/api';
import { SuperAdminLayout } from '@/components/super-admin/super-admin-layout';
import { CampaignLogo } from '@/components/campaign/campaign-logo';
import { CampaignThemeProvider } from '@/components/campaign/campaign-theme-provider';

function contrastRatio(first?: string | null, second?: string | null) {
  const luminance = (hex?: string | null) => {
    if (!/^#[0-9A-F]{6}$/i.test(hex || '')) return null;
    const channels = [1, 3, 5].map((index) => parseInt(hex!.slice(index, index + 2), 16) / 255)
      .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const a = luminance(first); const b = luminance(second);
  return a === null || b === null ? null : (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export default function CampaignDetailPage() {
  const id = useParams<{ id: string }>().id;
  const [campaign, setCampaign] = useState<SuperAdminCampaignDetail | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [admin, setAdmin] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const contrast = campaign ? contrastRatio(campaign.textColor || '#0F172A', campaign.backgroundColor || '#F8FAFC') : null;
  const load = useCallback(() => api.getSuperAdminCampaign(id).then(setCampaign).catch((err: Error) => setError(err.message)), [id]);
  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!campaign) return;
    try {
      setError(''); setSuccess('');
      await api.updateSuperAdminCampaign(id, {
        name: campaign.name, slug: campaign.slug, candidateName: campaign.candidateName, party: campaign.party,
        logoUrl: campaign.logoUrl, faviconUrl: campaign.faviconUrl,
        primaryColor: campaign.primaryColor, secondaryColor: campaign.secondaryColor,
        accentColor: campaign.accentColor, backgroundColor: campaign.backgroundColor, textColor: campaign.textColor,
        publicTitle: campaign.publicTitle, publicDescription: campaign.publicDescription,
        contactEmail: campaign.contactEmail, contactPhone: campaign.contactPhone,
        instagramUrl: campaign.instagramUrl, facebookUrl: campaign.facebookUrl, youtubeUrl: campaign.youtubeUrl,
        heroTitle: campaign.heroTitle, heroSubtitle: campaign.heroSubtitle, heroDescription: campaign.heroDescription,
        ctaTitle: campaign.ctaTitle, ctaDescription: campaign.ctaDescription, ctaButtonText: campaign.ctaButtonText,
        aboutTitle: campaign.aboutTitle, aboutText: campaign.aboutText, proposalTitle: campaign.proposalTitle,
        proposalItems: campaign.proposalItems, areasTitle: campaign.areasTitle, areaItems: campaign.areaItems,
        bannerImageUrl: campaign.bannerImageUrl, footerText: campaign.footerText,
        showHero: campaign.showHero, showAbout: campaign.showAbout, showProposals: campaign.showProposals,
        showAreas: campaign.showAreas, showContact: campaign.showContact,
      });
      await load();
      setSuccess('Identidade visual salva com sucesso.');
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
      {success && <p className="mb-4 rounded-lg bg-green-50 p-4 text-green-700">{success}</p>}
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
          <form onSubmit={save} className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <h3 className="font-bold">Identidade visual</h3>
            <p className="mt-1 text-sm text-slate-500">Cores em hexadecimal e URLs apenas HTTP/HTTPS.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(['logoUrl','faviconUrl','publicTitle','publicDescription','contactEmail','contactPhone','instagramUrl','facebookUrl','youtubeUrl'] as const).map((key) => (
                <label key={key} className="text-sm">{key}<input value={campaign[key] || ''} onChange={(e) => setCampaign({ ...campaign, [key]: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
              ))}
              {(['primaryColor','secondaryColor','accentColor','backgroundColor','textColor'] as const).map((key) => (
                <label key={key} className="text-sm">{key}<div className="mt-1 flex gap-2"><input type="color" value={campaign[key] || '#DB2777'} onChange={(e) => setCampaign({ ...campaign, [key]: e.target.value.toUpperCase() })} className="h-10 w-12 rounded border" /><input value={campaign[key] || ''} onChange={(e) => setCampaign({ ...campaign, [key]: e.target.value })} placeholder="#RRGGBB" className="min-w-0 flex-1 rounded-lg border p-2" /></div></label>
              ))}
            </div>
            <CampaignThemeProvider campaign={campaign}>
              <div className="mt-5 rounded-xl border bg-white p-5">
                <div className="flex items-center gap-3"><CampaignLogo logoUrl={campaign.logoUrl} name={campaign.name} /><div><p className="text-xl font-bold text-brand-700">{campaign.publicTitle || campaign.name}</p><p>{campaign.publicDescription || 'Preview da identidade da campanha.'}</p></div></div>
                <button type="button" className="mt-4 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white">Botão de destaque</button>
              </div>
            </CampaignThemeProvider>
            {contrast !== null && contrast < 4.5 && <p className="mt-3 text-sm font-medium text-amber-700">Aviso: contraste baixo ({contrast.toFixed(2)}:1). Recomendado: pelo menos 4.5:1.</p>}
            <button className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white">Salvar identidade visual</button>
          </form>
          <form onSubmit={save} className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <h3 className="font-bold">Conteúdo da landing page</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(['heroTitle','heroSubtitle','heroDescription','bannerImageUrl','ctaTitle','ctaDescription','ctaButtonText','aboutTitle','aboutText','proposalTitle','areasTitle','footerText'] as const).map((key) => (
                <label key={key} className="text-sm">{key}<textarea rows={key.endsWith('Description') || key === 'aboutText' ? 3 : 1} value={campaign[key] || ''} onChange={(e) => setCampaign({ ...campaign, [key]: e.target.value || null })} className="mt-1 w-full rounded-lg border p-2" /></label>
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div><h4 className="text-sm font-semibold">Cards de propostas</h4>{(campaign.proposalItems || Array.from({ length: 4 }, () => ({ title: '', description: '' }))).slice(0, 4).map((item, index, items) => <div key={index} className="mt-2 rounded-lg border p-3"><input value={item.title} onChange={(e) => { const next = [...items]; next[index] = { ...item, title: e.target.value }; setCampaign({ ...campaign, proposalItems: next }); }} className="w-full rounded border p-2" placeholder="Título" /><textarea value={item.description} onChange={(e) => { const next = [...items]; next[index] = { ...item, description: e.target.value }; setCampaign({ ...campaign, proposalItems: next }); }} className="mt-2 w-full rounded border p-2" placeholder="Descrição" /></div>)}</div>
              <label className="text-sm font-semibold">Áreas de atuação<textarea rows={8} value={(campaign.areaItems || []).join('\n')} onChange={(e) => setCampaign({ ...campaign, areaItems: e.target.value.split('\n').slice(0, 6) })} className="mt-2 w-full rounded-lg border p-2" /><span className="text-xs font-normal text-slate-500">Uma por linha, máximo de seis.</span></label>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(['showHero','showAbout','showProposals','showAreas','showContact'] as const).map((key) => <label key={key} className="flex gap-2 text-sm"><input type="checkbox" checked={campaign[key]} onChange={(e) => setCampaign({ ...campaign, [key]: e.target.checked })} />{key}</label>)}
            </div>
            <button className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white">Salvar conteúdo</button>
          </form>
        </>
      )}
    </SuperAdminLayout>
  );
}
