import type { FastifyInstance } from 'fastify';
import type { CreateSupporterRequest, LeaderDashboard, SupporterListItem } from '@platform/types';
import { Role, SupporterStatus } from '@platform/types';
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

      const [totalSupporters, recentSupporters, supporters, total, statusCounts] = await Promise.all([
        prisma.user.count({ where: { role: Role.USER, leaderId: leader.id } }),
        prisma.user.count({
          where: { role: Role.USER, leaderId: leader.id, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.user.findMany({
          where: { role: Role.USER, leaderId: leader.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.user.count({ where: { role: Role.USER, leaderId: leader.id } }),
        prisma.user.groupBy({
          by: ['status'],
          where: { role: Role.USER, leaderId: leader.id },
          _count: { status: true },
        }),
      ]);

      const dashboard: LeaderDashboard = {
        totalSupporters,
        totalPending: statusCounts.find((s) => s.status === SupporterStatus.PENDING)?._count.status || 0,
        totalVerified: statusCounts.find((s) => s.status === SupporterStatus.VERIFIED)?._count.status || 0,
        totalInvalid: statusCounts.find((s) => s.status === SupporterStatus.INVALID)?._count.status || 0,
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
        role: Role.USER,
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

      const data: SupporterListItem[] = supporters.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        city: s.city,
        state: s.state,
        status: s.status as SupporterStatus,
        createdAt: s.createdAt.toISOString(),
      }));

      return reply.send({
        data,
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

      // Prevenir duplicidade do mesmo número na campanha inteira (role: USER)
      const existing = await prisma.user.findFirst({
        where: { phone: normalized.phone, role: Role.USER },
      });

      if (existing) {
        return reply.status(409).send({ message: 'Este WhatsApp já está cadastrado como apoiador.' });
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

  fastify.patch<{ Params: { id: string }; Body: { status: SupporterStatus } }>(
    '/supporters/:id/status',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.LEADER)] },
    async (request, reply) => {
      const leaderId = request.user.sub;
      const { id } = request.params;
      const { status } = request.body;

      if (!Object.values(SupporterStatus).includes(status)) {
        return reply.status(400).send({ message: 'Status inválido' });
      }

      const existing = await prisma.user.findFirst({
        where: { id, role: Role.USER, leaderId },
      });

      if (!existing) {
        return reply.status(404).send({ message: 'Apoiador não encontrado ou não pertence a você' });
      }

      await prisma.user.update({
        where: { id },
        data: { status },
      });

      return reply.send({ success: true, status });
    },
  );

  fastify.get<{
    Querystring: {
      verifiedOnly?: string;
      city?: string;
      state?: string;
    };
  }>(
    '/communication/recipients/count',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.LEADER)] },
    async (request, reply) => {
      const leaderId = request.user.sub;
      const { verifiedOnly, city, state } = request.query;

      const count = await prisma.user.count({
        where: {
          role: Role.USER,
          leaderId,
          ...(verifiedOnly === 'true' ? { status: SupporterStatus.VERIFIED } : {}),
          ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
          ...(state ? { state: state.toUpperCase() } : {}),
        },
      });

      return reply.send({ count });
    },
  );
}
