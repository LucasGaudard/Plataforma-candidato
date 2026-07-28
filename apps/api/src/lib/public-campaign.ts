import { CampaignStatus } from '@prisma/client';
import { isValidSlug } from '@platform/utils';
import { prisma } from './prisma';

export async function resolveActivePublicCampaign(slug: string) {
  const normalizedSlug = slug?.trim().toLowerCase();

  if (!normalizedSlug || !isValidSlug(normalizedSlug)) {
    return null;
  }

  return prisma.campaign.findFirst({
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
      primaryColor: true,
      secondaryColor: true,
    },
  });
}
