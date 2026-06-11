import type { NotificationType } from '@platform/types';
import { Role } from '@platform/types';
import { prisma } from './prisma';

interface NotifyAllParams {
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  roles?: Role[];
}

export async function notifyAllUsers({
  title,
  message,
  type,
  link,
  roles = [Role.ADMIN, Role.LEADER, Role.USER],
}: NotifyAllParams) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles } },
    select: { id: true },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      title,
      message,
      type,
      link,
    })),
  });
}

export async function notifyUser(
  userId: string,
  params: Omit<NotifyAllParams, 'roles'>,
) {
  await prisma.notification.create({
    data: {
      userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link,
    },
  });
}
