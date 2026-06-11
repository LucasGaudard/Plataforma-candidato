import type { FastifyInstance } from 'fastify';
import type { CreateLiveRequest, UpdateLiveRequest } from '@platform/types';
import { NotificationType, Role } from '@platform/types';
import {
  parsePagination,
  sanitizeString,
  validateLiveInput,
} from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toLivePublic } from '../lib/mappers';
import { notifyAllUsers } from '../lib/notifications';

const authorSelect = { firstName: true, lastName: true };

export async function liveRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { page?: string; limit?: string } }>(
    '/',
    async (request, reply) => {
      const { page, limit, skip } = parsePagination(request.query);
      const where = { published: true };

      const [lives, total] = await Promise.all([
        prisma.live.findMany({
          where,
          include: { author: { select: authorSelect } },
          orderBy: { scheduledAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.live.count({ where }),
      ]);

      return reply.send({
        data: lives.map(toLivePublic),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const live = await prisma.live.findFirst({
      where: { id: request.params.id, published: true },
      include: { author: { select: authorSelect } },
    });

    if (!live) {
      return reply.status(404).send({ message: 'Live não encontrada' });
    }

    return reply.send(toLivePublic(live));
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
        },
        include: { author: { select: authorSelect } },
      });

      if (live.published) {
        await notifyAllUsers({
          title: 'Nova live disponível',
          message: live.title,
          type: NotificationType.LIVE,
          link: '/dashboard/lives',
        });
      }

      return reply.status(201).send(toLivePublic(live));
    },
  );

  fastify.put<{ Params: { id: string }; Body: UpdateLiveRequest }>(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const existing = await prisma.live.findUnique({ where: { id: request.params.id } });
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
      const existing = await prisma.live.findUnique({ where: { id: request.params.id } });
      if (!existing) {
        return reply.status(404).send({ message: 'Live não encontrada' });
      }

      await prisma.live.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    },
  );
}
