'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { PublicCampaignSummary } from '@platform/types';
import { api } from '@/lib/api';
import { CampaignThemeProvider } from './campaign-theme-provider';

export function PublicCampaignTheme({ campaignSlug, children }: { campaignSlug: string; children: ReactNode }) {
  const [campaign, setCampaign] = useState<PublicCampaignSummary | null>(null);
  useEffect(() => {
    let active = true;
    api.getPublicCampaign(campaignSlug).then((data) => active && setCampaign(data)).catch(() => active && setCampaign(null));
    return () => { active = false; };
  }, [campaignSlug]);
  return <CampaignThemeProvider campaign={campaign}>{children}</CampaignThemeProvider>;
}
