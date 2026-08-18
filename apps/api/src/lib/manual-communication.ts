import { CityZone, Prisma, SupporterStatus } from '@prisma/client';
import { normalizeBrazilianPhone } from '@platform/utils';

export type ManualAudienceFilters = {
  status?: string;
  zone?: string;
  neighborhood?: string;
  city?: string;
  coordinatorId?: string;
  leaderId?: string;
  registeredFrom?: string;
  registeredTo?: string;
};

export function manualCommunicationAudienceWhere(
  scope: Prisma.UserWhereInput,
  filters: ManualAudienceFilters,
): Prisma.UserWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.registeredFrom) createdAt.gte = new Date(`${filters.registeredFrom}T00:00:00.000Z`);
  if (filters.registeredTo) createdAt.lte = new Date(`${filters.registeredTo}T23:59:59.999Z`);
  return {
    AND: [
      scope,
      ...(filters.status ? [{ status: filters.status as SupporterStatus }] : []),
      ...(filters.zone ? [{ zone: filters.zone as CityZone }] : []),
      ...(filters.neighborhood ? [{ neighborhood: { contains: filters.neighborhood, mode: 'insensitive' as const } }] : []),
      ...(filters.city ? [{ city: { contains: filters.city, mode: 'insensitive' as const } }] : []),
      ...(filters.coordinatorId ? [{ coordinatorId: filters.coordinatorId }] : []),
      ...(filters.leaderId ? [{ leaderId: filters.leaderId }] : []),
      ...(Object.keys(createdAt).length ? [{ createdAt }] : []),
    ],
  };
}

export function classifyManualCommunicationAudience<T extends { phone: string; whatsappStatus: string }>(candidates: T[]) {
  const excludedOptOut = candidates.filter((item) => item.whatsappStatus === 'OPT_OUT');
  const available = candidates.filter((item) => item.whatsappStatus !== 'OPT_OUT');
  const eligible = available.filter((item) => normalizeBrazilianPhone(item.phone));
  return {
    totalFound: candidates.length,
    eligible,
    excludedOptOut: excludedOptOut.length,
    invalidPhone: available.length - eligible.length,
  };
}

export function resolveManualCommunicationLimit(quantity: number | 'ALL', eligibleCount: number): number {
  if (quantity === 'ALL') return eligibleCount;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5000) {
    throw new Error('Quantidade deve ser um inteiro entre 1 e 5000.');
  }
  return Math.min(quantity, eligibleCount);
}

export function selectUniqueManualRecipients<T extends { id: string }>(candidates: T[], limit: number): T[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  }).slice(0, limit);
}

export function manualCommunicationSessionOwnerWhere(campaignId: string, userId: string, id?: string) {
  return { ...(id ? { id } : {}), campaignId, createdByUserId: userId };
}

export function canProcessManualRecipient(
  supporter: { whatsappStatus: string } | null,
): supporter is { whatsappStatus: string } {
  return supporter !== null && supporter.whatsappStatus !== 'OPT_OUT';
}
