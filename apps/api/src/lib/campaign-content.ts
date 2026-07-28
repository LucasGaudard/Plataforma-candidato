import type { Campaign } from '@prisma/client';
import type { CampaignContent, CampaignProposalItem } from '@platform/types';
import { normalizeHttpUrl } from '@platform/utils';

export type CampaignContentInput = Partial<CampaignContent>;

export const campaignContentSelect = {
  heroTitle: true, heroSubtitle: true, heroDescription: true,
  ctaTitle: true, ctaDescription: true, ctaButtonText: true,
  aboutTitle: true, aboutText: true, proposalTitle: true, proposalItems: true,
  areasTitle: true, areaItems: true, bannerImageUrl: true, footerText: true,
  showHero: true, showAbout: true, showProposals: true, showAreas: true, showContact: true,
} as const;

const textFields = [
  'heroTitle', 'heroSubtitle', 'heroDescription', 'ctaTitle', 'ctaDescription', 'ctaButtonText',
  'aboutTitle', 'aboutText', 'proposalTitle', 'areasTitle', 'footerText',
] as const;
const visibilityFields = ['showHero', 'showAbout', 'showProposals', 'showAreas', 'showContact'] as const;

function cleanText(value: unknown, limit = 3000) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('Conteúdo inválido');
  const cleaned = value.trim();
  if (cleaned.length > limit) throw new Error(`Conteúdo excede ${limit} caracteres`);
  return cleaned || null;
}

export function normalizeCampaignContent(input: CampaignContentInput) {
  const data: Record<string, unknown> = {};
  for (const field of textFields) {
    if (input[field] !== undefined) data[field] = cleanText(input[field]);
  }
  for (const field of visibilityFields) {
    if (input[field] !== undefined) {
      if (typeof input[field] !== 'boolean') throw new Error('Visibilidade inválida');
      data[field] = input[field];
    }
  }
  if (input.bannerImageUrl !== undefined) data.bannerImageUrl = normalizeHttpUrl(input.bannerImageUrl);
  if (input.proposalItems !== undefined) {
    if (input.proposalItems !== null && !Array.isArray(input.proposalItems)) throw new Error('Propostas inválidas');
    const items = (input.proposalItems || []).slice(0, 4).map((item) => ({
      title: cleanText(item?.title, 150) || '',
      description: cleanText(item?.description, 600) || '',
    })).filter((item) => item.title || item.description);
    data.proposalItems = items.length ? items : null;
  }
  if (input.areaItems !== undefined) {
    if (input.areaItems !== null && !Array.isArray(input.areaItems)) throw new Error('Áreas inválidas');
    const items = (input.areaItems || []).slice(0, 6).map((item) => cleanText(item, 100)).filter(Boolean);
    data.areaItems = items.length ? items : null;
  }
  return data;
}

export function toCampaignContent(campaign: Pick<Campaign, keyof CampaignContent>): CampaignContent {
  return {
    heroTitle: campaign.heroTitle, heroSubtitle: campaign.heroSubtitle, heroDescription: campaign.heroDescription,
    ctaTitle: campaign.ctaTitle, ctaDescription: campaign.ctaDescription, ctaButtonText: campaign.ctaButtonText,
    aboutTitle: campaign.aboutTitle, aboutText: campaign.aboutText, proposalTitle: campaign.proposalTitle,
    proposalItems: Array.isArray(campaign.proposalItems) ? campaign.proposalItems as unknown as CampaignProposalItem[] : null,
    areasTitle: campaign.areasTitle,
    areaItems: Array.isArray(campaign.areaItems) ? campaign.areaItems.filter((item): item is string => typeof item === 'string') : null,
    bannerImageUrl: campaign.bannerImageUrl, footerText: campaign.footerText,
    showHero: campaign.showHero, showAbout: campaign.showAbout, showProposals: campaign.showProposals,
    showAreas: campaign.showAreas, showContact: campaign.showContact,
  };
}
