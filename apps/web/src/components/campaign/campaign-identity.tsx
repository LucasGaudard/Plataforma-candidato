'use client';
import { CampaignLogo } from './campaign-logo';
import { useCampaignTheme } from './campaign-theme-provider';
export function CampaignIdentity() {
  const campaign = useCampaignTheme();
  const name = campaign?.publicTitle || campaign?.name || 'Conecta Eleitor';
  return <span className="inline-flex items-center gap-2"><CampaignLogo logoUrl={campaign?.logoUrl} name={name} /><span className="text-xl font-bold text-brand-900">{name}</span></span>;
}
