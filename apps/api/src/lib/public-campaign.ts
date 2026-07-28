import { CampaignStatus } from '@prisma/client';
import { isValidSlug, normalizeHexColor, normalizeHttpUrl } from '@platform/utils';
import { prisma } from './prisma';

export async function resolveActivePublicCampaign(slug: string) {
  const normalizedSlug = slug?.trim().toLowerCase();

  if (!normalizedSlug || !isValidSlug(normalizedSlug)) {
    return null;
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      slug: normalizedSlug,
      status: CampaignStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      candidateName: true,
      party: true,
      logoUrl: true,
      faviconUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      backgroundColor: true,
      textColor: true,
      publicTitle: true,
      publicDescription: true,
      contactEmail: true,
      contactPhone: true,
      instagramUrl: true,
      facebookUrl: true,
      youtubeUrl: true,
      heroTitle: true,
      heroSubtitle: true,
      heroDescription: true,
      ctaTitle: true,
      ctaDescription: true,
      ctaButtonText: true,
      aboutTitle: true,
      aboutText: true,
      proposalTitle: true,
      proposalItems: true,
      areasTitle: true,
      areaItems: true,
      bannerImageUrl: true,
      footerText: true,
      showHero: true,
      showAbout: true,
      showProposals: true,
      showAreas: true,
      showContact: true,
    },
  });
  if (!campaign) return null;
  const safeUrl = (value: string | null) => {
    try { return normalizeHttpUrl(value); } catch { return null; }
  };
  const safeColor = (value: string | null) => {
    try { return normalizeHexColor(value); } catch { return null; }
  };
  return {
    ...campaign,
    logoUrl: safeUrl(campaign.logoUrl),
    faviconUrl: safeUrl(campaign.faviconUrl),
    instagramUrl: safeUrl(campaign.instagramUrl),
    facebookUrl: safeUrl(campaign.facebookUrl),
    youtubeUrl: safeUrl(campaign.youtubeUrl),
    bannerImageUrl: safeUrl(campaign.bannerImageUrl),
    primaryColor: safeColor(campaign.primaryColor),
    secondaryColor: safeColor(campaign.secondaryColor),
    accentColor: safeColor(campaign.accentColor),
    backgroundColor: safeColor(campaign.backgroundColor),
    textColor: safeColor(campaign.textColor),
  };
}
