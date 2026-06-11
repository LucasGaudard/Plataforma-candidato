import type { FastifyInstance } from 'fastify';
import type { CreatePostRequest, UpdatePostRequest } from '@platform/types';
import { NotificationType, PostCategory, Role } from '@platform/types';
import {
  parsePagination,
  sanitizeString,
  validatePostInput,
} from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toPostPublic } from '../lib/mappers';
import { notifyAllUsers } from '../lib/notifications';

const authorSelect = { firstName: true, lastName: true };

export async function postRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { page?: string; limit?: string; category?: string } }>(
    '/',
    async (request, reply) => {
      const { page, limit, skip } = parsePagination(request.query);
      const category = request.query.category as PostCategory | undefined;

      const where = {
        published: true,
        ...(category && Object.values(PostCategory).includes(category)
          ? { category }
          : {}),
      };

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          include: { author: { select: authorSelect } },
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.post.count({ where }),
      ]);

      return reply.send({
        data: posts.map(toPostPublic),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const post = await prisma.post.findFirst({
      where: { id: request.params.id, published: true },
      include: { author: { select: authorSelect } },
    });

    if (!post) {
      return reply.status(404).send({ message: 'Post não encontrado' });
    }

    return reply.send(toPostPublic(post));
  });

  fastify.post<{ Body: CreatePostRequest }>(
    '/',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const body = request.body || ({} as CreatePostRequest);
      const validation = validatePostInput({
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        videoUrl: body.videoUrl,
        category: body.category,
      });

      if (!validation.valid) {
        return reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
      }

      const post = await prisma.post.create({
        data: {
          title: sanitizeString(body.title),
          description: sanitizeString(body.description),
          imageUrl: body.imageUrl?.trim() || null,
          videoUrl: body.videoUrl?.trim() || null,
          category: (body.category as PostCategory) || PostCategory.GERAL,
          publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
          published: body.published ?? true,
          authorId: request.user.sub,
        },
        include: { author: { select: authorSelect } },
      });

      if (post.published) {
        await notifyAllUsers({
          title: 'Novo conteúdo publicado',
          message: post.title,
          type: NotificationType.POST,
          link: '/dashboard',
        });
      }

      return reply.status(201).send(toPostPublic(post));
    },
  );

  fastify.put<{ Params: { id: string }; Body: UpdatePostRequest }>(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const existing = await prisma.post.findUnique({ where: { id: request.params.id } });
      if (!existing) {
        return reply.status(404).send({ message: 'Post não encontrado' });
      }

      const body = request.body || {};
      const validation = validatePostInput({
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        imageUrl: body.imageUrl ?? existing.imageUrl ?? undefined,
        videoUrl: body.videoUrl ?? existing.videoUrl ?? undefined,
        category: body.category ?? existing.category,
      });

      if (!validation.valid) {
        return reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
      }

      const post = await prisma.post.update({
        where: { id: request.params.id },
        data: {
          ...(body.title !== undefined && { title: sanitizeString(body.title) }),
          ...(body.description !== undefined && { description: sanitizeString(body.description) }),
          ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl?.trim() || null }),
          ...(body.videoUrl !== undefined && { videoUrl: body.videoUrl?.trim() || null }),
          ...(body.category !== undefined && { category: body.category as PostCategory }),
          ...(body.publishedAt !== undefined && { publishedAt: new Date(body.publishedAt) }),
          ...(body.published !== undefined && { published: body.published }),
        },
        include: { author: { select: authorSelect } },
      });

      return reply.send(toPostPublic(post));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const existing = await prisma.post.findUnique({ where: { id: request.params.id } });
      if (!existing) {
        return reply.status(404).send({ message: 'Post não encontrado' });
      }

      await prisma.post.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    },
  );
}
