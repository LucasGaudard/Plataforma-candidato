import type { Campaign, User } from '@prisma/client';
import type {
  AuthenticatedUserPublic,
  CampaignPublic,
  CampaignStatus,
  Role,
  UserPublic,
} from '@platform/types';
import { normalizeHexColor, normalizeHttpUrl } from '@platform/utils';

type UserWithCampaign = User & { campaign: Campaign | null };

export function toCampaignPublic(campaign: Campaign): CampaignPublic {
  const safeUrl = (value: string | null) => {
    try { return normalizeHttpUrl(value); } catch { return null; }
  };
  const safeColor = (value: string | null) => {
    try { return normalizeHexColor(value); } catch { return null; }
  };
  return {
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    candidateName: campaign.candidateName,
    party: campaign.party,
    logoUrl: safeUrl(campaign.logoUrl),
    faviconUrl: safeUrl(campaign.faviconUrl),
    primaryColor: safeColor(campaign.primaryColor),
    secondaryColor: safeColor(campaign.secondaryColor),
    accentColor: safeColor(campaign.accentColor),
    backgroundColor: safeColor(campaign.backgroundColor),
    textColor: safeColor(campaign.textColor),
    publicTitle: campaign.publicTitle,
    publicDescription: campaign.publicDescription,
    contactEmail: campaign.contactEmail,
    contactPhone: campaign.contactPhone,
    instagramUrl: safeUrl(campaign.instagramUrl),
    facebookUrl: safeUrl(campaign.facebookUrl),
    youtubeUrl: safeUrl(campaign.youtubeUrl),
    whatsappNumber: campaign.whatsappNumber,
    status: campaign.status as CampaignStatus,
  };
}

export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    cpf: user.cpf,
    phone: user.phone,
    address: user.address,
    city: user.city,
    state: user.state,
    neighborhood: user.neighborhood,
    role: user.role as Role,
    leaderSlug: user.leaderSlug,
    leaderId: user.leaderId,
    coordinatorId: user.coordinatorId,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toAuthenticatedUserPublic(
  user: UserWithCampaign,
): AuthenticatedUserPublic {
  return {
    ...toUserPublic(user),
    campaignId: user.campaignId,
    campaign: user.campaign ? toCampaignPublic(user.campaign) : null,
  };
}
