import type { Campaign, User } from '@prisma/client';
import type {
  AuthenticatedUserPublic,
  CampaignPublic,
  CampaignStatus,
  Role,
  UserPublic,
} from '@platform/types';

type UserWithCampaign = User & { campaign: Campaign };

export function toCampaignPublic(campaign: Campaign): CampaignPublic {
  return {
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    candidateName: campaign.candidateName,
    party: campaign.party,
    logoUrl: campaign.logoUrl,
    primaryColor: campaign.primaryColor,
    secondaryColor: campaign.secondaryColor,
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
    campaign: toCampaignPublic(user.campaign),
  };
}
