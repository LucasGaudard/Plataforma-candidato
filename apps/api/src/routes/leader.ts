import type { FastifyInstance } from 'fastify';
import type { CreateSupporterRequest, LeaderDashboard } from '@platform/types';
import { Role } from '@platform/types';
import { normalizeSupporterInput, parsePagination, validateSupporterInput } from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toUserPublic } from '../lib/user-mapper';

export async function leaderRoutes(fastify: FastifyInstance) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  fastify.get(
    '/dashboard',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.LEADER)] },
    async (request, reply) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const leader = await prisma.user.findUnique({
        where: { id: request.user.sub },
      });

      if (!leader || !leader.leaderSlug) {
        return reply.status(404).send({ message: 'Líder não encontrado' });
      }

      const [totalSupporters, recentSupporters, supporters, total] = await Promise.all([
        prisma.user.count({ where: { leaderId: leader.id } }),
        prisma.user.count({
          where: { leaderId: leader.id, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.user.findMany({
          where: { leaderId: leader.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.user.count({ where: { leaderId: leader.id } }),
      ]);

      const dashboard: LeaderDashboard = {
        totalSupporters,
        recentSupporters,
        leaderSlug: leader.leaderSlug,
        referralLink: `${frontendUrl}/lider/${leader.leaderSlug}`,
        supporters: supporters.map(toUserPublic),
        supportersMeta: {
          page: 1,
          limit: 10,
          total,
          totalPages: Math.ceil(total / 10),
        },
      };

      return reply.send(dashboard);
    },
  );

  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      city?: string;
      state?: string;
    };
  }>(
    '/supporters',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.LEADER)] },
    async (request, reply) => {
      const { page, limit, skip } = parsePagination(request.query);
      const search = request.query.search?.trim();
      const city = request.query.city?.trim();
      const state = request.query.state?.trim().toUpperCase();

      const where = {
        leaderId: request.user.sub,
        ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
        ...(state ? { state } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { cpf: { contains: search.replace(/\D/g, '') } },
              ],
            }
          : {}),
      };

      const [supporters, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return reply.send({
        data: supporters.map(toUserPublic),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    if (slug === 'dashboard' || slug === 'supporters') {
      return reply.status(404).send({ message: 'Líder não encontrado' });
    }

    const leader = await prisma.user.findFirst({
      where: { leaderSlug: slug, role: Role.LEADER },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        leaderSlug: true,
      },
    });

    if (!leader) {
      return reply.status(404).send({ message: 'Líder não encontrado' });
    }

    return reply.send({
      id: leader.id,
      firstName: leader.firstName,
      lastName: leader.lastName,
      leaderSlug: leader.leaderSlug,
    });
  });

  fastify.post<{ Params: { slug: string }; Body: CreateSupporterRequest }>(
    '/:slug/supporters',
    async (request, reply) => {
      const { slug } = request.params;
      const body = request.body || ({} as CreateSupporterRequest);

      const leader = await prisma.user.findFirst({
        where: { leaderSlug: slug, role: Role.LEADER },
        select: { id: true, coordinatorId: true },
      });

      if (!leader) {
        return reply.status(404).send({ message: 'Líder não encontrado' });
      }

      const normalized = normalizeSupporterInput(body);
      const validation = validateSupporterInput(normalized);

      if (!validation.valid) {
        return reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
      }

      // Prevenir duplicidade do mesmo número para o mesmo líder
      const existing = await prisma.user.findFirst({
        where: { phone: normalized.phone, leaderId: leader.id },
      });

      if (existing) {
        return reply.status(409).send({ message: 'Você já está cadastrado com este WhatsApp para este líder.' });
      }

      // Gerar dados únicos falsos para campos obrigatórios do schema
      const cuid = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const fakeEmail = `supporter-${cuid}@whatsapp.local`;
      const fakeCpf = `SUPP-${cuid}`.substring(0, 14); // maxLength 14

      const supporter = await prisma.user.create({
        data: {
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          phone: normalized.phone,
          city: normalized.city,
          state: normalized.state,
          email: fakeEmail,
          cpf: fakeCpf,
          password: cuid, // random string, user cannot login
          address: 'Cadastro via WhatsApp',
          role: Role.USER,
          leaderId: leader.id,
          coordinatorId: leader.coordinatorId,
        },
      });

      return reply.status(201).send({ success: true, id: supporter.id });
    },
  );
}
