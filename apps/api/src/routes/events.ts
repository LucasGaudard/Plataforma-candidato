import type { FastifyInstance } from 'fastify';
import type { CreateEventRequest, UpdateEventRequest } from '@platform/types';
import { NotificationType, Role } from '@platform/types';
import { sanitizeString, validateEventInput } from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toEventPublic } from '../lib/mappers';
import { notifyAllUsers } from '../lib/notifications';

const authorSelect = { firstName: true, lastName: true };

export async function eventRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { page?: string; limit?: string } }>(
    '/',
    async (_request, reply) => {
      return reply.status(404).send({ message: 'Campanha não encontrada' });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id', async (_request, reply) => {
    return reply.status(404).send({ message: 'Campanha não encontrada' });
  });

  fastify.post<{ Body: CreateEventRequest }>(
    '/',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const body = request.body || ({} as CreateEventRequest);
      const validation = validateEventInput(body);

      if (!validation.valid) {
        return reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
      }

      const event = await prisma.event.create({
        data: {
          title: sanitizeString(body.title),
          description: sanitizeString(body.description),
          location: sanitizeString(body.location),
          date: new Date(body.date),
          time: sanitizeString(body.time),
          published: body.published ?? true,
          authorId: request.user.sub,
          campaignId: request.user.campaignId,
        },
        include: { author: { select: authorSelect } },
      });

      if (event.published) {
        await notifyAllUsers({
          title: 'Novo evento',
          message: event.title,
          type: NotificationType.EVENT,
          link: '/dashboard/eventos',
          campaignId: request.user.campaignId,
        });
      }

      return reply.status(201).send(toEventPublic(event));
    },
  );

  fastify.put<{ Params: { id: string }; Body: UpdateEventRequest }>(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const existing = await prisma.event.findFirst({
        where: {
          id: request.params.id,
          campaignId: request.user.campaignId,
        },
      });
      if (!existing) {
        return reply.status(404).send({ message: 'Evento não encontrado' });
      }

      const body = request.body || {};
      const validation = validateEventInput({
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        location: body.location ?? existing.location,
        date: body.date ?? existing.date.toISOString(),
        time: body.time ?? existing.time,
      });

      if (!validation.valid) {
        return reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
      }

      const event = await prisma.event.update({
        where: { id: request.params.id },
        data: {
          ...(body.title !== undefined && { title: sanitizeString(body.title) }),
          ...(body.description !== undefined && { description: sanitizeString(body.description) }),
          ...(body.location !== undefined && { location: sanitizeString(body.location) }),
          ...(body.date !== undefined && { date: new Date(body.date) }),
          ...(body.time !== undefined && { time: sanitizeString(body.time) }),
          ...(body.published !== undefined && { published: body.published }),
        },
        include: { author: { select: authorSelect } },
      });

      return reply.send(toEventPublic(event));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const existing = await prisma.event.findFirst({
        where: {
          id: request.params.id,
          campaignId: request.user.campaignId,
        },
      });
      if (!existing) {
        return reply.status(404).send({ message: 'Evento não encontrado' });
      }

      await prisma.event.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    },
  );
}
