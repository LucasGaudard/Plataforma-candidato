'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicCampaignSummary } from '@platform/types';
import { api } from '@/lib/api';
import { CampaignThemeProvider } from './campaign-theme-provider';
import { CampaignLogo } from './campaign-logo';
import { resolveCampaignContent } from '@/lib/campaign-content-defaults';
import { useAuth } from '@/contexts/auth-context';

export function CampaignLanding({ campaignSlug }: { campaignSlug: string }) {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<PublicCampaignSummary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api.getPublicCampaign(campaignSlug).then(setCampaign).catch((e: Error) => setError(e.message)); }, [campaignSlug]);
  if (error) return <main className="flex min-h-screen items-center justify-center"><p>{error}</p></main>;
  if (!campaign) return <main className="flex min-h-screen items-center justify-center"><p>Carregando campanha...</p></main>;
  const content = resolveCampaignContent(campaign);
  const title = campaign.publicTitle || campaign.name;
  return (
    <CampaignThemeProvider campaign={campaign}>
      <header className="border-b bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          {user ? (
            <span className="flex items-center gap-3"><CampaignLogo logoUrl={campaign.logoUrl} name={title} /><strong className="text-brand-700">{title}</strong></span>
          ) : (
            <Image
              src="/Images/conecta-eleitor-horizontal.png"
              alt="Logo do Conecta Eleitor"
              width={1536}
              height={1024}
              priority
              className="h-[56px] w-auto object-contain sm:h-[72px]"
            />
          )}
          <Link href={`/login?campaign=${campaign.slug}`} className="font-semibold text-brand-700">Entrar</Link>
        </div>
      </header>
      <main>
        {content.showHero && <section className="gradient-hero px-5 py-20 text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
            <div><p className="font-semibold">{content.heroSubtitle}</p><h1 className="mt-3 text-4xl font-extrabold md:text-5xl">{content.heroTitle}</h1><p className="mt-5 text-lg text-white/85">{content.heroDescription}</p><Link href={`/campanhas/${campaign.slug}/cadastro`} className="mt-7 inline-block rounded-xl bg-white px-6 py-3 font-bold text-brand-700">{content.ctaButtonText}</Link></div>
            {/* URL externa configurável; img permite qualquer host HTTP seguro validado pela API. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {content.bannerImageUrl && <img src={content.bannerImageUrl} alt={`Imagem da campanha ${title}`} className="max-h-96 w-full rounded-2xl object-cover shadow-xl" />}
          </div>
        </section>}
        {content.showAbout && <section className="mx-auto max-w-4xl px-5 py-16 text-center"><h2 className="text-3xl font-bold text-brand-900">{content.aboutTitle}</h2><p className="mt-4 text-lg">{content.aboutText}</p></section>}
        {content.showProposals && <section className="bg-white px-5 py-16"><div className="mx-auto max-w-6xl"><h2 className="text-center text-3xl font-bold text-brand-900">{content.proposalTitle}</h2><div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{content.proposalItems?.map((item, index) => <article key={index} className="rounded-2xl border border-brand-100 p-5"><h3 className="font-bold text-brand-700">{item.title}</h3><p className="mt-2 text-sm">{item.description}</p></article>)}</div></div></section>}
        {content.showAreas && <section className="mx-auto max-w-5xl px-5 py-16 text-center"><h2 className="text-3xl font-bold text-brand-900">{content.areasTitle}</h2><div className="mt-7 flex flex-wrap justify-center gap-3">{content.areaItems?.map((area) => <span key={area} className="rounded-full border border-brand-100 bg-white px-5 py-2">{area}</span>)}</div></section>}
        {content.showContact && <section className="gradient-brand px-5 py-14 text-center text-white"><h2 className="text-3xl font-bold">{content.ctaTitle}</h2><p className="mt-3">{content.ctaDescription}</p><Link href={`/campanhas/${campaign.slug}/cadastro`} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-brand-700">{content.ctaButtonText}</Link></section>}
      </main>
      <footer className="bg-white px-5 py-7 text-center text-sm"><p>{content.footerText}</p></footer>
    </CampaignThemeProvider>
  );
}
