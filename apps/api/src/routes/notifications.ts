import type { FastifyInstance } from 'fastify';
import { parsePagination } from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toNotificationPublic } from '../lib/mappers';

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { page?: string; limit?: string; unreadOnly?: string } }>(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { page, limit, skip } = parsePagination(request.query);
      const unreadOnly = request.query.unreadOnly === 'true';

      const where = {
        userId: request.user.sub,
        ...(unreadOnly ? { read: false } : {}),
      };

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId: request.user.sub, read: false },
        }),
      ]);

      return reply.send({
        data: notifications.map(toNotificationPublic),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        unreadCount,
      });
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/:id/read',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const notification = await prisma.notification.findFirst({
        where: { id: request.params.id, userId: request.user.sub },
      });

      if (!notification) {
        return reply.status(404).send({ message: 'Notificação não encontrada' });
      }

      const updated = await prisma.notification.update({
        where: { id: notification.id },
        data: { read: true },
      });

      return reply.send(toNotificationPublic(updated));
    },
  );

  fastify.patch(
    '/read-all',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      await prisma.notification.updateMany({
        where: { userId: request.user.sub, read: false },
        data: { read: true },
      });

      return reply.send({ success: true });
    },
  );
}
