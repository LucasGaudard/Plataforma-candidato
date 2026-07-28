'use client';
import { useCampaignTheme } from './campaign-theme-provider';
export function CampaignRegistrationCopy({ leaderName }: { leaderName?: string }) {
  const campaign = useCampaignTheme();
  const ctaTitle = campaign && 'ctaTitle' in campaign ? campaign.ctaTitle : null;
  const ctaDescription = campaign && 'ctaDescription' in campaign ? campaign.ctaDescription : null;
  return <>
    <h1 className="text-2xl font-bold text-brand-900">{ctaTitle || 'Faça parte desta campanha'}</h1>
    <p className="mt-1 text-sm text-slate-500">{leaderName ? `Indicação de ${leaderName}. ` : ''}{ctaDescription || campaign?.publicDescription || 'Preencha seus dados para participar.'}</p>
  </>;
}
