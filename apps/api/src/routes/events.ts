import type { FastifyInstance } from 'fastify';
import type { CreateEventRequest, UpdateEventRequest } from '@platform/types';
import { NotificationType, Role } from '@platform/types';
import {
  parsePagination,
  sanitizeString,
  validateEventInput,
} from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toEventPublic } from '../lib/mappers';
import { notifyAllUsers } from '../lib/notifications';

const authorSelect = { firstName: true, lastName: true };

export async function eventRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { page?: string; limit?: string } }>(
    '/',
    async (request, reply) => {
      const { page, limit, skip } = parsePagination(request.query);

      const where = { published: true };

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: { author: { select: authorSelect } },
          orderBy: { date: 'asc' },
          skip,
          take: limit,
        }),
        prisma.event.count({ where }),
      ]);

      return reply.send({
        data: events.map(toEventPublic),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: request.params.id, published: true },
      include: { author: { select: authorSelect } },
    });

    if (!event) {
      return reply.status(404).send({ message: 'Evento não encontrado' });
    }

    return reply.send(toEventPublic(event));
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
        },
        include: { author: { select: authorSelect } },
      });

      if (event.published) {
        await notifyAllUsers({
          title: 'Novo evento',
          message: event.title,
          type: NotificationType.EVENT,
          link: '/dashboard/eventos',
        });
      }

      return reply.status(201).send(toEventPublic(event));
    },
  );

  fastify.put<{ Params: { id: string }; Body: UpdateEventRequest }>(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const existing = await prisma.event.findUnique({ where: { id: request.params.id } });
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
      const existing = await prisma.event.findUnique({ where: { id: request.params.id } });
      if (!existing) {
        return reply.status(404).send({ message: 'Evento não encontrado' });
      }

      await prisma.event.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    },
  );
}
