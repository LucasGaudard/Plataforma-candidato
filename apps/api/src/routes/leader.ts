import type { FastifyInstance } from 'fastify';
import { CityZone as PrismaCityZone } from '@prisma/client';
import type { LeaderDashboard, SupporterListItem } from '@platform/types';
import { Role, SupporterStatus, WhatsappStatus } from '@platform/types';
import { isValidCityZone, parsePagination } from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toUserPublic } from '../lib/user-mapper';
import {
  deleteSupporterWithinScope,
  supporterIdPattern,
  supporterScope,
  supporterSearchWhere,
} from '../lib/supporter-management';

export async function leaderRoutes(fastify: FastifyInstance) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  fastify.get(
    '/dashboard',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.LEADER)] },
    async (request, reply) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const leader = await prisma.user.findFirst({
        where: {
          id: request.user.sub,
          campaignId: request.user.campaignId,
        },
        include: {
          campaign: { select: { slug: true } },
        },
      });

      if (!leader || !leader.leaderSlug) {
        return reply.status(404).send({ message: 'Líder não encontrado' });
      }

      const [totalSupporters, recentSupporters, supporters, total, statusCounts] = await Promise.all([
        prisma.user.count({
          where: {
            role: Role.USER,
            leaderId: leader.id,
            campaignId: request.user.campaignId,
          },
        }),
        prisma.user.count({
          where: {
            role: Role.USER,
            leaderId: leader.id,
            campaignId: request.user.campaignId,
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        prisma.user.findMany({
          where: {
            role: Role.USER,
            leaderId: leader.id,
            campaignId: request.user.campaignId,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.user.count({
          where: {
            role: Role.USER,
            leaderId: leader.id,
            campaignId: request.user.campaignId,
          },
        }),
        prisma.user.groupBy({
          by: ['status'],
          where: {
            role: Role.USER,
            leaderId: leader.id,
            campaignId: request.user.campaignId,
          },
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
        referralLink: `${frontendUrl}/campanhas/${leader.campaign?.slug}/lider/${leader.leaderSlug}`,
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
      neighborhood?: string;
      zone?: string;
    };
  }>(
    '/supporters',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.LEADER)] },
    async (request, reply) => {
      const { page, limit, skip } = parsePagination(request.query);
      const search = request.query.search?.trim();
      const city = request.query.city?.trim();
      const state = request.query.state?.trim().toUpperCase();
      const neighborhood = request.query.neighborhood?.trim();
      const zone = request.query.zone?.trim();
      const supporterSearch = supporterSearchWhere(search);
      if (zone && !isValidCityZone(zone)) return reply.status(400).send({ message: 'Zona inválida.' });

      const where = {
        role: Role.USER,
        leaderId: request.user.sub,
        campaignId: request.user.campaignId,
        ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
        ...(state ? { state } : {}),
        ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' as const } } : {}),
        ...(zone ? { zone: zone as PrismaCityZone } : {}),
        ...(supporterSearch || {}),
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
        neighborhood: s.neighborhood,
        zone: s.zone,
        status: s.status as SupporterStatus,
        whatsappStatus: s.whatsappStatus as WhatsappStatus,
        whatsappConfirmedAt: s.whatsappConfirmedAt?.toISOString() ?? null,
        whatsappInitialMessageSentAt: s.whatsappInitialMessageSentAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      }));

      return reply.send({
        data,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.get('/:slug', async (_request, reply) => {
    return reply.status(404).send({ message: 'Campanha não encontrada' });
    /*
    const { slug } = request.params as { slug: string };
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
    */
  });

  fastify.post(
    '/:slug/supporters',
    async (_request, reply) => {
      return reply.status(404).send({ message: 'Campanha não encontrada' });
      /*
      const { slug } = request.params;
      const body = request.body || ({} as CreateSupporterRequest);

      const leader = await prisma.user.findFirst({
        where: { leaderSlug: slug, role: Role.LEADER },
        select: { id: true, coordinatorId: true, campaignId: true },
      });

      if (!leader) {
        return reply.status(404).send({ message: 'Líder não encontrado' });
      }

      // Código legado desativado: rotas públicas agora exigem campaignSlug.
      body.state = body.state || 'RJ';

      const normalized = normalizeSupporterInput(body);
      const validation = validateSupporterInput(normalized);

      if (!validation.valid) {
        return reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
      }

      // Prevenir duplicidade do mesmo número na campanha inteira (role: USER)
      const existing = await prisma.user.findFirst({
        where: {
          phone: normalized.phone,
          role: Role.USER,
          campaignId: leader.campaignId,
        },
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
          neighborhood: normalized.neighborhood,
          email: fakeEmail,
          cpf: fakeCpf,
          password: cuid, // random string, user cannot login
          address: 'Cadastro via WhatsApp',
          role: Role.USER,
          leaderId: leader.id,
          coordinatorId: leader.coordinatorId,
          campaignId: leader.campaignId,
          lgpdConsent: true,
          lgpdConsentAt: new Date(),
          lgpdConsentText: LGPD_CONSENT_TEXT,
          lgpdConsentVersion: LGPD_CONSENT_VERSION,
        },
      });

      whatsappService.sendConfirmationMessage(supporter).catch(err => {
        fastify.log.error('Erro ao chamar whatsappService:', err);
      });

      return reply.status(201).send({ success: true, id: supporter.id });
      */
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
        where: {
          id,
          role: Role.USER,
          leaderId,
          campaignId: request.user.campaignId,
        },
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

  fastify.delete<{ Params: { id: string } }>(
    '/supporters/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.LEADER)] },
    async (request, reply) => {
      if (!supporterIdPattern.test(request.params.id)) {
        return reply.status(400).send({ message: 'ID de apoiador inválido.' });
      }
      const scope = supporterScope(Role.LEADER as import('@prisma/client').Role, request.user.sub, request.user.campaignId);
      if (!scope) return reply.status(403).send({ message: 'Acesso negado.' });
      const result = await deleteSupporterWithinScope({ id: request.params.id, ...scope });
      if (result.kind === 'not_found') return reply.status(404).send({ message: 'Apoiador não encontrado.' });
      if (result.kind === 'blocked') {
        return reply.status(409).send({
          message: 'Não foi possível excluir o apoiador porque existem registros vinculados.',
          dependencies: result.blockers,
        });
      }
      return reply.send({ success: true, message: 'Apoiador excluído permanentemente.', removed: result.removed });
    },
  );

  fastify.get<{
    Querystring: {
      verifiedOnly?: string;
      city?: string;
      state?: string;
      neighborhood?: string;
      zone?: string;
    };
  }>(
    '/communication/recipients/count',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.LEADER)] },
    async (request, reply) => {
      const leaderId = request.user.sub;
      const { verifiedOnly, city, state, neighborhood, zone } = request.query;
      if (zone && !isValidCityZone(zone)) return reply.status(400).send({ message: 'Zona inválida.' });

      const count = await prisma.user.count({
        where: {
          role: Role.USER,
          leaderId,
          campaignId: request.user.campaignId,
          ...(verifiedOnly === 'true' ? { status: SupporterStatus.VERIFIED } : {}),
          ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
          ...(state ? { state: state.toUpperCase() } : {}),
          ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' as const } } : {}),
          ...(zone ? { zone: zone as PrismaCityZone } : {}),
        },
      });

      return reply.send({ count });
    },
  );
}
