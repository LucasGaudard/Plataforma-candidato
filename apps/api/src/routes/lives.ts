import type { FastifyInstance } from 'fastify';
import type { CreateLiveRequest, UpdateLiveRequest } from '@platform/types';
import { NotificationType, Role } from '@platform/types';
import { sanitizeString, validateLiveInput } from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toLivePublic } from '../lib/mappers';
import { notifyAllUsers } from '../lib/notifications';

const authorSelect = { firstName: true, lastName: true };

export async function liveRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { page?: string; limit?: string } }>(
    '/',
    async (_request, reply) => {
      return reply.status(404).send({ message: 'Campanha não encontrada' });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id', async (_request, reply) => {
    return reply.status(404).send({ message: 'Campanha não encontrada' });
  });

  fastify.post<{ Body: CreateLiveRequest }>(
    '/',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const body = request.body || ({} as CreateLiveRequest);
      const validation = validateLiveInput(body);

      if (!validation.valid) {
        return reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
      }

      const live = await prisma.live.create({
        data: {
          title: sanitizeString(body.title),
          description: sanitizeString(body.description),
          thumbnailUrl: body.thumbnailUrl?.trim() || null,
          youtubeUrl: body.youtubeUrl.trim(),
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          published: body.published ?? true,
          authorId: request.user.sub,
          campaignId: request.user.campaignId,
        },
        include: { author: { select: authorSelect } },
      });

      if (live.published) {
        await notifyAllUsers({
          title: 'Nova live disponível',
          message: live.title,
          type: NotificationType.LIVE,
          link: '/dashboard/lives',
          campaignId: request.user.campaignId,
        });
      }

      return reply.status(201).send(toLivePublic(live));
    },
  );

  fastify.put<{ Params: { id: string }; Body: UpdateLiveRequest }>(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const existing = await prisma.live.findFirst({
        where: {
          id: request.params.id,
          campaignId: request.user.campaignId,
        },
      });
      if (!existing) {
        return reply.status(404).send({ message: 'Live não encontrada' });
      }

      const body = request.body || {};
      const validation = validateLiveInput({
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        thumbnailUrl: body.thumbnailUrl ?? existing.thumbnailUrl ?? undefined,
        youtubeUrl: body.youtubeUrl ?? existing.youtubeUrl,
      });

      if (!validation.valid) {
        return reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
      }

      const live = await prisma.live.update({
        where: { id: request.params.id },
        data: {
          ...(body.title !== undefined && { title: sanitizeString(body.title) }),
          ...(body.description !== undefined && { description: sanitizeString(body.description) }),
          ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl?.trim() || null }),
          ...(body.youtubeUrl !== undefined && { youtubeUrl: body.youtubeUrl.trim() }),
          ...(body.scheduledAt !== undefined && {
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          }),
          ...(body.published !== undefined && { published: body.published }),
        },
        include: { author: { select: authorSelect } },
      });

      return reply.send(toLivePublic(live));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const existing = await prisma.live.findFirst({
        where: {
          id: request.params.id,
          campaignId: request.user.campaignId,
        },
      });
      if (!existing) {
        return reply.status(404).send({ message: 'Live não encontrada' });
      }

      await prisma.live.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    },
  );
}
