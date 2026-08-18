'use client';
import { FormEvent, useEffect, useState } from 'react';
import { DEFAULT_WHATSAPP_INITIAL_MESSAGE, Role, type CampaignContent, type CampaignProposalItem, type ManualWhatsappConfig } from '@platform/types';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CampaignLogo } from '@/components/campaign/campaign-logo';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { campaignContentDefaults } from '@/lib/campaign-content-defaults';

const textSections = [
  ['Hero', ['heroTitle', 'heroSubtitle', 'heroDescription', 'bannerImageUrl']],
  ['CTA', ['ctaTitle', 'ctaDescription', 'ctaButtonText']],
  ['Sobre', ['aboutTitle', 'aboutText']],
  ['Rodapé', ['footerText']],
] as const;

export default function CampaignContentPage() {
  const { user } = useAuth();
  const [content, setContent] = useState<CampaignContent>(campaignContentDefaults);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [manualWhatsapp, setManualWhatsapp] = useState<ManualWhatsappConfig>({
    officialNumber: null,
    initialMessage: DEFAULT_WHATSAPP_INITIAL_MESSAGE,
  });
  useEffect(() => {
    Promise.all([api.getCampaignContent(), api.getManualWhatsappConfig()])
      .then(([contentData, whatsappData]) => { setContent(contentData); setManualWhatsapp(whatsappData); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const value = (key: keyof CampaignContent) => (content[key] as string | null) || '';
  const setText = (key: keyof CampaignContent, next: string) => setContent({ ...content, [key]: next || null });
  const proposals = content.proposalItems || campaignContentDefaults.proposalItems || [];
  const areas = content.areaItems || campaignContentDefaults.areaItems || [];
  const preview = { ...campaignContentDefaults, ...Object.fromEntries(Object.entries(content).map(([key, item]) => [key, item ?? campaignContentDefaults[key as keyof CampaignContent]])) } as CampaignContent;

  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      const [savedContent, savedWhatsapp] = await Promise.all([
        api.updateCampaignContent(content),
        api.updateManualWhatsappConfig(manualWhatsapp),
      ]);
      setContent(savedContent); setManualWhatsapp(savedWhatsapp); setMessage('Configurações salvas com sucesso.');
    }
    catch (e) { setError((e as Error).message); }
  }

  return <ProtectedRoute allowedRoles={[Role.ADMIN]}><DashboardLayout title="Conteúdo público" subtitle="Configure a landing page da sua campanha.">
    {loading ? <p>Carregando...</p> : <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <div className="space-y-5">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">WhatsApp Business manual</h2>
          <p className="mt-1 text-sm text-slate-500">Configure o número oficial da equipe e a mensagem aberta para novos apoiadores.</p>
          <div className="mt-4 grid gap-3">
            <label className="text-sm">Número oficial do WhatsApp Business
              <input value={manualWhatsapp.officialNumber || ''} onChange={(e) => setManualWhatsapp({ ...manualWhatsapp, officialNumber: e.target.value || null })} className="mt-1 w-full rounded-lg border p-2" placeholder="(11) 99999-9999" inputMode="tel" />
            </label>
            <label className="text-sm">Mensagem inicial para novos apoiadores
              <textarea value={manualWhatsapp.initialMessage} onChange={(e) => setManualWhatsapp({ ...manualWhatsapp, initialMessage: e.target.value })} rows={5} maxLength={1000} className="mt-1 w-full rounded-lg border p-2" />
              <span className="text-xs text-slate-500">{manualWhatsapp.initialMessage.length}/1000 caracteres</span>
            </label>
          </div>
        </section>
        {textSections.map(([title, fields]) => <section key={title} className="rounded-xl bg-white p-5 shadow-sm"><h2 className="font-bold">{title}</h2><div className="mt-4 grid gap-3">{fields.map((key) => <label key={key} className="text-sm">{key}<textarea rows={key.includes('Description') || key === 'aboutText' ? 3 : 1} value={value(key)} onChange={(e) => setText(key, e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>)}</div></section>)}
        <section className="rounded-xl bg-white p-5 shadow-sm"><h2 className="font-bold">Propostas</h2><input value={value('proposalTitle')} onChange={(e) => setText('proposalTitle', e.target.value)} className="mt-3 w-full rounded-lg border p-2" placeholder="Título da seção" /><div className="mt-4 grid gap-3 sm:grid-cols-2">{proposals.slice(0,4).map((item,index)=><div key={index} className="rounded-lg border p-3"><input value={item.title} onChange={(e)=>{const next=[...proposals];next[index]={...item,title:e.target.value};setContent({...content,proposalItems:next})}} className="w-full rounded border p-2" placeholder="Título" /><textarea value={item.description} onChange={(e)=>{const next=[...proposals];next[index]={...item,description:e.target.value};setContent({...content,proposalItems:next})}} className="mt-2 w-full rounded border p-2" placeholder="Descrição" /></div>)}</div></section>
        <section className="rounded-xl bg-white p-5 shadow-sm"><h2 className="font-bold">Áreas de atuação</h2><input value={value('areasTitle')} onChange={(e)=>setText('areasTitle',e.target.value)} className="mt-3 w-full rounded-lg border p-2" /><textarea value={areas.join('\n')} onChange={(e)=>setContent({...content,areaItems:e.target.value.split('\n').slice(0,6)})} rows={6} className="mt-3 w-full rounded-lg border p-2" /><p className="text-xs text-slate-500">Uma área por linha, máximo de seis.</p></section>
        <section className="rounded-xl bg-white p-5 shadow-sm"><h2 className="font-bold">Visibilidade</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{(['showHero','showAbout','showProposals','showAreas','showContact'] as const).map((key)=><label key={key} className="flex gap-2"><input type="checkbox" checked={content[key]} onChange={(e)=>setContent({...content,[key]:e.target.checked})}/>{key}</label>)}</div></section>
        {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{message && <p className="rounded-lg bg-green-50 p-3 text-green-700">{message}</p>}
        <button className="rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white">Salvar configurações</button>
      </div>
      <aside className="xl:sticky xl:top-4 xl:self-start"><div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="gradient-hero p-6 text-white"><div className="flex items-center gap-2"><CampaignLogo logoUrl={user?.campaign?.logoUrl} name={user?.campaign?.name || 'Campanha'} /><strong>{user?.campaign?.publicTitle || user?.campaign?.name}</strong></div>{preview.showHero&&<><h2 className="mt-6 text-3xl font-bold">{preview.heroTitle}</h2><p className="mt-2">{preview.heroDescription}</p></>}</div>{preview.showProposals&&<div className="grid gap-2 p-5 sm:grid-cols-2">{preview.proposalItems?.map((item: CampaignProposalItem,index)=><div key={index} className="rounded-lg border p-3"><strong>{item.title}</strong><p className="text-xs">{item.description}</p></div>)}</div>}{preview.showAreas&&<div className="p-5"><strong>{preview.areasTitle}</strong><p className="mt-2 text-sm">{preview.areaItems?.join(' · ')}</p></div>}<footer className="border-t p-4 text-xs">{preview.footerText}</footer></div></aside>
    </form>}
  </DashboardLayout></ProtectedRoute>;
}
