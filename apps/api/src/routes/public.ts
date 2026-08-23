import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import type { CreateSupporterRequest } from '@platform/types';
import { LGPD_CONSENT_TEXT, LGPD_CONSENT_VERSION, PostCategory, Role } from '@platform/types';
import {
  normalizeSupporterInput,
  parsePagination,
  validateSupporterInput,
} from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toEventPublic, toLivePublic, toPostPublic } from '../lib/mappers';
import { resolveActivePublicCampaign } from '../lib/public-campaign';
import { whatsappService } from '../services/whatsapp.service';
import { verifyTurnstileToken } from '../services/turnstile.service';
import {
  hashRegistrationIp,
  isHoneypotTriggered,
  publicRegistrationRateLimiter,
  registrationRiskFlags,
} from '../lib/public-registration-abuse';

const authorSelect = { firstName: true, lastName: true };

async function resolveCampaignOr404(
  campaignSlug: string,
  reply: FastifyReply,
) {
  const campaign = await resolveActivePublicCampaign(campaignSlug);
  if (!campaign) {
    reply.status(404).send({ message: 'Campanha não encontrada' });
    return null;
  }
  return campaign;
}

async function createAttributedSupporter(
  campaignId: string,
  body: CreateSupporterRequest,
  attribution: { leaderId?: string; coordinatorId?: string },
  context: { request: FastifyRequest; fastify: FastifyInstance; sourceType: 'LEADER' | 'COORDINATOR'; linkId: string },
  reply: FastifyReply,
) {
  const normalized = normalizeSupporterInput(body || ({} as CreateSupporterRequest));
  const ipHash = hashRegistrationIp(context.request.ip);
  const logRejected = (reason: string, suspicious = true) => {
    context.fastify.log.warn({
      campaignId, sourceType: context.sourceType, leaderId: attribution.leaderId,
      coordinatorId: attribution.coordinatorId, ipHash, result: 'REJECTED', reason, suspicious,
    }, 'Cadastro público rejeitado');
  };
  if (isHoneypotTriggered(body?.website)) {
    logRejected('HONEYPOT');
    reply.status(400).send({ message: 'Não foi possível concluir o cadastro. Verifique os dados informados.' });
    return null;
  }
  const validation = validateSupporterInput(normalized);
  if (!validation.valid) {
    logRejected('INVALID_DATA', false);
    reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
    return null;
  }

  const ipRate = publicRegistrationRateLimiter.checkAndRecord('ip', ipHash);
  if (!ipRate.allowed) {
    logRejected('RATE_LIMIT');
    reply.status(429).send({ message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
    return null;
  }

  if (!await verifyTurnstileToken(body.turnstileToken, context.request.ip)) {
    logRejected('TURNSTILE');
    reply.status(400).send({ message: 'Não foi possível concluir o cadastro. Verifique os dados informados.' });
    return null;
  }

  const linkRate = publicRegistrationRateLimiter.checkAndRecord('link', `${campaignId}:${context.linkId}`);
  const phoneRate = publicRegistrationRateLimiter.checkAndRecord('phone', `${campaignId}:${normalized.phone}`);
  if (!linkRate.allowed || !phoneRate.allowed) {
    logRejected('RATE_LIMIT');
    reply.status(429).send({ message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
    return null;
  }

  const riskFlags = registrationRiskFlags({
    ipAttempts: ipRate.count, linkAttempts: linkRate.count, formStartedAt: body.formStartedAt,
  });
  const cuid = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const data = {
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      phone: normalized.phone,
      city: normalized.city,
      state: normalized.state,
      neighborhood: normalized.neighborhood,
      zone: normalized.zone,
      email: `supporter-${cuid}@whatsapp.local`,
      cpf: `SUPP-${cuid}`.substring(0, 14),
      password: cuid,
      address: 'Cadastro via WhatsApp',
      role: Role.USER,
      leaderId: attribution.leaderId,
      coordinatorId: attribution.coordinatorId,
      campaignId,
      lgpdConsent: true,
      lgpdConsentAt: new Date(),
      lgpdConsentText: LGPD_CONSENT_TEXT,
      lgpdConsentVersion: LGPD_CONSENT_VERSION,
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findFirst({ where: { phone: normalized.phone, role: Role.USER, campaignId } });
        if (existing) return null;
        return tx.user.create({ data });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (!result) {
        logRejected('DUPLICATE', false);
        reply.status(409).send({ message: 'Este WhatsApp já está cadastrado como apoiador.' });
        return null;
      }
      return { supporter: result, security: { ipHash, riskFlags } };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt === 0) continue;
      throw error;
    }
  }
  return null;
}

function logPublicSupporterCreated(
  fastify: FastifyInstance,
  input: {
    campaignId: string;
    supporterId: string;
    sourceType: 'LEADER' | 'COORDINATOR';
    leaderId?: string;
    coordinatorId?: string;
    ipHash: string;
    riskFlags: string[];
  },
) {
  fastify.log.info({ ...input, result: 'CREATED', statusHttp: 201, suspicious: input.riskFlags.length > 0 }, 'Apoiador público cadastrado');
}

export async function publicRoutes(fastify: FastifyInstance) {
  fastify.get('/anti-abuse/config', async (_request, reply) => {
    const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() || '';
    const secretConfigured = Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
    const configured = Boolean(siteKey) && secretConfigured;
    const production = process.env.NODE_ENV === 'production';
    return reply.send({ required: production || configured, available: configured, siteKey: configured ? siteKey : '' });
  });
  fastify.get<{ Params: { campaignSlug: string } }>(
    '/campaigns/:campaignSlug',
    async (request, reply) => {
      const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
      if (!campaign) return;

      const { id: _id, ...publicCampaign } = campaign;
      return reply.send(publicCampaign);
    },
  );

  fastify.get<{
    Params: { campaignSlug: string };
    Querystring: { page?: string; limit?: string; category?: string };
  }>('/campaigns/:campaignSlug/posts', async (request, reply) => {
    const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
    if (!campaign) return;

    const { page, limit, skip } = parsePagination(request.query);
    const category = request.query.category as PostCategory | undefined;
    const where = {
      campaignId: campaign.id,
      published: true,
      ...(category && Object.values(PostCategory).includes(category) ? { category } : {}),
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
  });

  fastify.get<{ Params: { campaignSlug: string; postId: string } }>(
    '/campaigns/:campaignSlug/posts/:postId',
    async (request, reply) => {
      const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
      if (!campaign) return;

      const post = await prisma.post.findFirst({
        where: {
          id: request.params.postId,
          campaignId: campaign.id,
          published: true,
        },
        include: { author: { select: authorSelect } },
      });
      if (!post) return reply.status(404).send({ message: 'Post não encontrado' });
      return reply.send(toPostPublic(post));
    },
  );

  fastify.get<{
    Params: { campaignSlug: string };
    Querystring: { page?: string; limit?: string };
  }>('/campaigns/:campaignSlug/events', async (request, reply) => {
    const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
    if (!campaign) return;

    const { page, limit, skip } = parsePagination(request.query);
    const where = { campaignId: campaign.id, published: true };
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
  });

  fastify.get<{ Params: { campaignSlug: string; eventId: string } }>(
    '/campaigns/:campaignSlug/events/:eventId',
    async (request, reply) => {
      const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
      if (!campaign) return;

      const event = await prisma.event.findFirst({
        where: {
          id: request.params.eventId,
          campaignId: campaign.id,
          published: true,
        },
        include: { author: { select: authorSelect } },
      });
      if (!event) return reply.status(404).send({ message: 'Evento não encontrado' });
      return reply.send(toEventPublic(event));
    },
  );

  fastify.get<{
    Params: { campaignSlug: string };
    Querystring: { page?: string; limit?: string };
  }>('/campaigns/:campaignSlug/lives', async (request, reply) => {
    const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
    if (!campaign) return;

    const { page, limit, skip } = parsePagination(request.query);
    const where = { campaignId: campaign.id, published: true };
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
  });

  fastify.get<{ Params: { campaignSlug: string; liveId: string } }>(
    '/campaigns/:campaignSlug/lives/:liveId',
    async (request, reply) => {
      const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
      if (!campaign) return;

      const live = await prisma.live.findFirst({
        where: {
          id: request.params.liveId,
          campaignId: campaign.id,
          published: true,
        },
        include: { author: { select: authorSelect } },
      });
      if (!live) return reply.status(404).send({ message: 'Live não encontrada' });
      return reply.send(toLivePublic(live));
    },
  );

  fastify.get<{ Params: { campaignSlug: string; leaderSlug: string } }>(
    '/campaigns/:campaignSlug/leaders/:leaderSlug',
    async (request, reply) => {
      const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
      if (!campaign) return;

      const leader = await prisma.user.findFirst({
        where: {
          leaderSlug: request.params.leaderSlug,
          role: Role.LEADER,
          campaignId: campaign.id,
        },
        select: { id: true, firstName: true, lastName: true, leaderSlug: true },
      });
      if (!leader) return reply.status(404).send({ message: 'Líder não encontrado' });
      return reply.send(leader);
    },
  );

  fastify.post<{
    Params: { campaignSlug: string; leaderSlug: string };
    Body: CreateSupporterRequest;
  }>('/campaigns/:campaignSlug/leaders/:leaderSlug/supporters', async (request, reply) => {
    const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
    if (!campaign) return;

    const leader = await prisma.user.findFirst({
      where: {
        leaderSlug: request.params.leaderSlug,
        role: Role.LEADER,
        campaignId: campaign.id,
      },
      select: { id: true, coordinatorId: true },
    });
    if (!leader) return reply.status(404).send({ message: 'Líder não encontrado' });

    const created = await createAttributedSupporter(
      campaign.id,
      request.body,
      { leaderId: leader.id, coordinatorId: leader.coordinatorId ?? undefined },
      { request, fastify, sourceType: 'LEADER', linkId: leader.id },
      reply,
    );
    if (!created) return;
    const { supporter, security } = created;

    logPublicSupporterCreated(fastify, {
      campaignId: campaign.id,
      supporterId: supporter.id,
      sourceType: 'LEADER',
      leaderId: leader.id,
      coordinatorId: leader.coordinatorId ?? undefined,
      ...security,
    });

    whatsappService.sendConfirmationMessage(supporter).catch((error) => {
      fastify.log.error({
        userId: supporter.id,
        error: error instanceof Error ? error.message : 'Falha desconhecida',
      }, 'Falha no envio da confirmação do WhatsApp');
    });

    return reply.status(201).send({ success: true, id: supporter.id });
  });

  fastify.get<{ Params: { campaignSlug: string; coordinatorSlug: string } }>(
    '/campaigns/:campaignSlug/coordinators/:coordinatorSlug',
    async (request, reply) => {
      const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
      if (!campaign) return;
      const coordinator = await prisma.user.findFirst({
        where: {
          coordinatorSlug: request.params.coordinatorSlug,
          role: Role.COORDINATOR,
          campaignId: campaign.id,
        },
        select: { id: true, firstName: true, lastName: true, coordinatorSlug: true },
      });
      if (!coordinator) return reply.status(404).send({ message: 'Coordenador não encontrado' });
      return reply.send(coordinator);
    },
  );

  fastify.post<{
    Params: { campaignSlug: string; coordinatorSlug: string };
    Body: CreateSupporterRequest;
  }>('/campaigns/:campaignSlug/coordinators/:coordinatorSlug/supporters', async (request, reply) => {
    const campaign = await resolveCampaignOr404(request.params.campaignSlug, reply);
    if (!campaign) return;
    const coordinator = await prisma.user.findFirst({
      where: {
        coordinatorSlug: request.params.coordinatorSlug,
        role: Role.COORDINATOR,
        campaignId: campaign.id,
      },
      select: { id: true },
    });
    if (!coordinator) return reply.status(404).send({ message: 'Coordenador não encontrado' });
    const created = await createAttributedSupporter(
      campaign.id,
      request.body,
      { coordinatorId: coordinator.id },
      { request, fastify, sourceType: 'COORDINATOR', linkId: coordinator.id },
      reply,
    );
    if (!created) return;
    const { supporter, security } = created;
    logPublicSupporterCreated(fastify, {
      campaignId: campaign.id,
      supporterId: supporter.id,
      sourceType: 'COORDINATOR',
      coordinatorId: coordinator.id,
      ...security,
    });
    whatsappService.sendConfirmationMessage(supporter).catch((error) => {
      fastify.log.error({
        userId: supporter.id,
        error: error instanceof Error ? error.message : 'Falha desconhecida',
      }, 'Falha no envio da confirmação do WhatsApp');
    });
    return reply.status(201).send({ success: true, id: supporter.id });
  });
}
