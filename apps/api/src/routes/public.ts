import type { FastifyInstance, FastifyReply } from 'fastify';
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
  reply: FastifyReply,
) {
  const normalized = normalizeSupporterInput(body || ({} as CreateSupporterRequest));
  const validation = validateSupporterInput(normalized);
  if (!validation.valid) {
    reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
    return null;
  }
  const existing = await prisma.user.findFirst({
    where: { phone: normalized.phone, role: Role.USER, campaignId },
  });
  if (existing) {
    reply.status(409).send({ message: 'Este WhatsApp já está cadastrado como apoiador.' });
    return null;
  }
  const cuid = Date.now().toString(36) + Math.random().toString(36).substring(2);
  return prisma.user.create({
    data: {
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      phone: normalized.phone,
      city: normalized.city,
      state: normalized.state,
      neighborhood: normalized.neighborhood,
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
    },
  });
}

export async function publicRoutes(fastify: FastifyInstance) {
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

    const supporter = await createAttributedSupporter(
      campaign.id,
      request.body,
      { leaderId: leader.id, coordinatorId: leader.coordinatorId ?? undefined },
      reply,
    );
    if (!supporter) return;

    whatsappService.sendConfirmationMessage(supporter).catch((error) => {
      fastify.log.error(error, 'Erro ao chamar whatsappService');
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
    const supporter = await createAttributedSupporter(
      campaign.id,
      request.body,
      { coordinatorId: coordinator.id },
      reply,
    );
    if (!supporter) return;
    whatsappService.sendConfirmationMessage(supporter).catch((error) => {
      fastify.log.error(error, 'Erro ao chamar whatsappService');
    });
    return reply.status(201).send({ success: true, id: supporter.id });
  });
}
