import { Role as PrismaRole } from '@prisma/client';
import type { NotificationType } from '@platform/types';
import { Role } from '@platform/types';
import { prisma } from './prisma';

interface NotifyAllParams {
  campaignId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  roles?: Role[];
}

export async function notifyAllUsers({
  campaignId,
  title,
  message,
  type,
  link,
  roles = [Role.ADMIN, Role.COORDINATOR, Role.LEADER, Role.USER],
}: NotifyAllParams) {
  const dbRoles = roles.filter((role): role is PrismaRole =>
    Object.values(PrismaRole).includes(role as any)
  );

  const users = await prisma.user.findMany({
    where: {
      campaignId,
      role: { in: dbRoles },
    },
    select: { id: true },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      campaignId,
      title,
      message,
      type,
      link,
    })),
  });
}

export async function notifyUser(
  userId: string,
  params: Omit<NotifyAllParams, 'roles' | 'campaignId'>,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { campaignId: true },
  });

  if (!user) return;

  await prisma.notification.create({
    data: {
      userId,
      campaignId: user.campaignId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link,
    },
  });
}
