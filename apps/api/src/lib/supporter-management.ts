import { CityZone, Prisma, Role } from '@prisma/client';
import { normalizeBrazilianPhone } from '@platform/utils';
import { prisma } from './prisma';

export const supporterIdPattern = /^[A-Za-z0-9_-]{10,64}$/;

export function supporterSearchWhere(value: string | undefined): Prisma.UserWhereInput | undefined {
  const search = value?.trim().replace(/\s+/g, ' ').normalize('NFC');
  if (!search) return undefined;

  const terms = search.split(' ');
  const rawDigits = search.replace(/\D/g, '');
  const digits = normalizeBrazilianPhone(search) ?? rawDigits;
  const nameMatch: Prisma.UserWhereInput = {
    AND: terms.map((term) => ({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
      ],
    })),
  };

  return digits
    ? { OR: [nameMatch, { phone: { contains: digits } }] }
    : nameMatch;
}

export function supporterScope(
  role: Role,
  actorId: string,
  campaignId: string,
): Prisma.UserWhereInput | null {
  const base = { role: Role.USER, campaignId } as const;
  if (role === Role.ADMIN) return base;
  if (role === Role.LEADER) return { ...base, leaderId: actorId };
  if (role === Role.COORDINATOR) {
    return {
      ...base,
      OR: [
        { leaderId: null, coordinatorId: actorId },
        {
          leaderId: { not: null },
          leader: { coordinatorId: actorId, campaignId, role: Role.LEADER },
        },
      ],
    };
  }
  return null;
}

export function manualWhatsappQueueWhere(
  scope: Prisma.UserWhereInput,
  filters: { leaderId?: string; coordinatorId?: string; zone?: string; neighborhood?: string },
): Prisma.UserWhereInput {
  return {
    AND: [
      scope,
      { whatsappStatus: { not: 'OPT_OUT' } },
      ...(filters.leaderId ? [{ leaderId: filters.leaderId }] : []),
      ...(filters.coordinatorId ? [{ coordinatorId: filters.coordinatorId }] : []),
      ...(filters.zone ? [{ zone: filters.zone as CityZone }] : []),
      ...(filters.neighborhood
        ? [{ neighborhood: { equals: filters.neighborhood, mode: 'insensitive' as const } }]
        : []),
    ],
  };
}

export function partitionManualWhatsappQueue<T extends {
  phone: string;
  whatsappInitialMessageSentAt: Date | null;
}>(candidates: T[]) {
  const valid = candidates.filter((candidate) => normalizeBrazilianPhone(candidate.phone));
  return {
    pending: valid.filter((candidate) => !candidate.whatsappInitialMessageSentAt),
    sent: valid.filter((candidate) => candidate.whatsappInitialMessageSentAt !== null),
  };
}

type SupporterDependencyCounts = {
  posts: number;
  events: number;
  lives: number;
  supporters: number;
  leaders: number;
};

export function supporterDeletionBlockers(counts: SupporterDependencyCounts) {
  return [
    { type: 'posts', label: 'publicações', count: counts.posts },
    { type: 'events', label: 'eventos', count: counts.events },
    { type: 'lives', label: 'lives', count: counts.lives },
    { type: 'supporters', label: 'apoiadores vinculados', count: counts.supporters },
    { type: 'leaders', label: 'líderes vinculados', count: counts.leaders },
  ].filter((dependency) => dependency.count > 0);
}

export async function deleteSupporterWithinScope(
  where: Prisma.UserWhereInput,
  database: Pick<typeof prisma, '$transaction'> = prisma,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await database.$transaction(async (tx) => {
        const supporter = await tx.user.findFirst({
          where,
          select: {
            id: true,
            _count: {
              select: {
                posts: true,
                events: true,
                lives: true,
                notifications: true,
                supporters: true,
                leaders: true,
              },
            },
          },
        });
        if (!supporter) return { kind: 'not_found' as const };

        const blockers = supporterDeletionBlockers(supporter._count);
        if (blockers.length > 0) return { kind: 'blocked' as const, blockers };

        const notifications = await tx.notification.deleteMany({ where: { userId: supporter.id } });
        await tx.user.delete({ where: { id: supporter.id } });
        return { kind: 'deleted' as const, removed: { notifications: notifications.count } };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') return { kind: 'not_found' as const };
        if (error.code === 'P2034' && attempt === 0) continue;
      }
      throw error;
    }
  }
  return { kind: 'not_found' as const };
}
