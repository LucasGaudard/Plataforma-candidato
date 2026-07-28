'use client';
import { createContext, useContext, useEffect, type CSSProperties, type ReactNode } from 'react';
import type { CampaignPublic, PublicCampaignSummary } from '@platform/types';

export const campaignThemeDefaults = {
  primaryColor: '#DB2777', secondaryColor: '#831843', accentColor: '#F472B6',
  backgroundColor: '#F8FAFC', textColor: '#0F172A',
};
type ThemeCampaign = CampaignPublic | PublicCampaignSummary;
const CampaignThemeContext = createContext<ThemeCampaign | null>(null);
const safe = (value: string | null | undefined, fallback: string) =>
  /^#[0-9A-F]{6}$/i.test(value || '') ? value! : fallback;

export function CampaignThemeProvider({ campaign, children }: { campaign?: ThemeCampaign | null; children: ReactNode }) {
  useEffect(() => {
    if (!campaign?.faviconUrl) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const previous = link?.href;
    if (link) link.href = campaign.faviconUrl;
    return () => { if (link && previous) link.href = previous; };
  }, [campaign?.faviconUrl]);
  const style = {
    '--campaign-primary': safe(campaign?.primaryColor, campaignThemeDefaults.primaryColor),
    '--campaign-secondary': safe(campaign?.secondaryColor, campaignThemeDefaults.secondaryColor),
    '--campaign-accent': safe(campaign?.accentColor, campaignThemeDefaults.accentColor),
    '--campaign-background': safe(campaign?.backgroundColor, campaignThemeDefaults.backgroundColor),
    '--campaign-text': safe(campaign?.textColor, campaignThemeDefaults.textColor),
  } as CSSProperties;
  return <CampaignThemeContext.Provider value={campaign || null}><div className="campaign-theme min-h-screen" style={style}>{children}</div></CampaignThemeContext.Provider>;
}

export const useCampaignTheme = () => useContext(CampaignThemeContext);
