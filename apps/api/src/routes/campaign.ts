import type { FastifyInstance } from 'fastify';
import type { CampaignContent, ManualWhatsappQueueResponse, UpdateManualWhatsappConfigRequest } from '@platform/types';
import { DEFAULT_WHATSAPP_INITIAL_MESSAGE, Role, WhatsappStatus } from '@platform/types';
import { Role as PrismaRole } from '@prisma/client';
import { isValidCityZone, normalizeBrazilianPhone } from '@platform/utils';
import { prisma } from '../lib/prisma';
import { campaignContentSelect, normalizeCampaignContent, toCampaignContent } from '../lib/campaign-content';
import { manualWhatsappQueueWhere, partitionManualWhatsappQueue, supporterScope } from '../lib/supporter-management';

const INITIAL_MESSAGE_LIMIT = 1000;

export async function campaignRoutes(fastify: FastifyInstance) {
  const adminOnly = [fastify.authenticate, fastify.authorize(Role.ADMIN)];
  const campaignTeam = [fastify.authenticate, fastify.authorize(Role.ADMIN, Role.COORDINATOR, Role.LEADER)];

  fastify.get('/content', { preHandler: adminOnly }, async (request, reply) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: request.user.campaignId },
      select: campaignContentSelect,
    });
    if (!campaign) return reply.status(404).send({ message: 'Campanha não encontrada' });
    return reply.send(toCampaignContent(campaign));
  });

  fastify.patch<{ Body: Partial<CampaignContent> }>(
    '/content',
    { preHandler: adminOnly },
    async (request, reply) => {
      let data;
      try { data = normalizeCampaignContent(request.body || {}); }
      catch (error) { return reply.status(400).send({ message: (error as Error).message }); }
      const campaign = await prisma.campaign.update({
        where: { id: request.user.campaignId },
        data,
        select: campaignContentSelect,
      });
      return reply.send(toCampaignContent(campaign));
    },
  );

  fastify.get('/manual-whatsapp', { preHandler: campaignTeam }, async (request, reply) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: request.user.campaignId },
      select: { whatsappNumber: true, whatsappInitialMessage: true },
    });
    if (!campaign) return reply.status(404).send({ message: 'Campanha não encontrada' });
    return reply.send({
      officialNumber: campaign.whatsappNumber,
      initialMessage: campaign.whatsappInitialMessage || DEFAULT_WHATSAPP_INITIAL_MESSAGE,
    });
  });

  fastify.patch<{ Body: UpdateManualWhatsappConfigRequest }>(
    '/manual-whatsapp',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = request.body || {} as UpdateManualWhatsappConfigRequest;
      const officialNumber = body.officialNumber?.trim()
        ? normalizeBrazilianPhone(body.officialNumber)
        : null;
      if (body.officialNumber?.trim() && !officialNumber) {
        return reply.status(400).send({ message: 'Informe um telefone brasileiro válido.' });
      }
      const initialMessage = body.initialMessage?.trim().replace(/\s+/g, ' ');
      if (!initialMessage) return reply.status(400).send({ message: 'Informe a mensagem inicial.' });
      if (initialMessage.length > INITIAL_MESSAGE_LIMIT) {
        return reply.status(400).send({ message: `A mensagem deve ter no máximo ${INITIAL_MESSAGE_LIMIT} caracteres.` });
      }
      const campaign = await prisma.campaign.update({
        where: { id: request.user.campaignId },
        data: { whatsappNumber: officialNumber, whatsappInitialMessage: initialMessage },
        select: { whatsappNumber: true, whatsappInitialMessage: true },
      });
      return reply.send({ officialNumber: campaign.whatsappNumber, initialMessage: campaign.whatsappInitialMessage! });
    },
  );

  fastify.get<{
    Querystring: { leaderId?: string; coordinatorId?: string; zone?: string; neighborhood?: string };
  }>('/manual-whatsapp/queue', { preHandler: campaignTeam }, async (request, reply) => {
    const scope = supporterScope(
      request.user.role as unknown as PrismaRole,
      request.user.sub,
      request.user.campaignId,
    );
    if (!scope) return reply.status(403).send({ message: 'Acesso negado' });
    const filters = {
      leaderId: request.query.leaderId?.trim() || undefined,
      coordinatorId: request.query.coordinatorId?.trim() || undefined,
      zone: request.query.zone?.trim() || undefined,
      neighborhood: request.query.neighborhood?.trim() || undefined,
    };
    if (filters.zone && !isValidCityZone(filters.zone)) {
      return reply.status(400).send({ message: 'Zona inválida.' });
    }
    const where = manualWhatsappQueueWhere(scope, filters);
    const items: ManualWhatsappQueueResponse['items'] = [];
    let totalPending = 0;
    let totalSent = 0;
    let cursor: string | undefined;
    while (true) {
      const candidates = await prisma.user.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, phone: true, createdAt: true,
          whatsappInitialMessageSentAt: true, leaderId: true, coordinatorId: true,
          leader: { select: { firstName: true, lastName: true } },
          coordinator: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 1000,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const partitioned = partitionManualWhatsappQueue(candidates);
      totalPending += partitioned.pending.length;
      totalSent += partitioned.sent.length;
      for (const candidate of partitioned.pending.slice(0, Math.max(0, 100 - items.length))) {
        items.push({
          id: candidate.id, firstName: candidate.firstName, lastName: candidate.lastName,
          phone: candidate.phone, createdAt: candidate.createdAt.toISOString(),
          origin: candidate.leaderId ? 'LEADER' : candidate.coordinatorId ? 'COORDINATOR' : 'DIRECT',
          originName: candidate.leader
            ? `${candidate.leader.firstName} ${candidate.leader.lastName}`
            : candidate.coordinator ? `${candidate.coordinator.firstName} ${candidate.coordinator.lastName}` : null,
        });
      }
      if (candidates.length < 1000) break;
      cursor = candidates[candidates.length - 1].id;
    }
    const optionScope = manualWhatsappQueueWhere(scope, {});
    const [leaderRows, coordinatorRows, neighborhoodRows] = await Promise.all([
      prisma.user.findMany({ where: { AND: [optionScope, { leaderId: { not: null } }] }, distinct: ['leaderId'], select: { leader: { select: { id: true, firstName: true, lastName: true } } } }),
      prisma.user.findMany({ where: { AND: [optionScope, { coordinatorId: { not: null } }] }, distinct: ['coordinatorId'], select: { coordinator: { select: { id: true, firstName: true, lastName: true } } } }),
      prisma.user.findMany({ where: { AND: [optionScope, { neighborhood: { not: null } }] }, distinct: ['neighborhood'], select: { neighborhood: true } }),
    ]);
    const leaders = new Map(leaderRows.flatMap(({ leader }) => leader ? [[leader.id, `${leader.firstName} ${leader.lastName}`] as const] : []));
    const coordinators = new Map(coordinatorRows.flatMap(({ coordinator }) => coordinator ? [[coordinator.id, `${coordinator.firstName} ${coordinator.lastName}`] as const] : []));
    const neighborhoods = new Set(neighborhoodRows.map(({ neighborhood }) => neighborhood?.trim()).filter((value): value is string => Boolean(value)));
    const response: ManualWhatsappQueueResponse = {
      items,
      totalPending,
      totalSent,
      filters: {
        leaders: [...leaders].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        coordinators: [...coordinators].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        neighborhoods: [...neighborhoods].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      },
    };
    return reply.send(response);
  });

  fastify.patch<{ Params: { id: string } }>(
    '/supporters/:id/manual-whatsapp-sent',
    { preHandler: campaignTeam },
    async (request, reply) => {
      const scope = supporterScope(
        request.user.role as unknown as PrismaRole,
        request.user.sub,
        request.user.campaignId,
      );
      if (!scope) return reply.status(403).send({ message: 'Acesso negado' });
      const campaign = await prisma.campaign.findUnique({
        where: { id: request.user.campaignId },
        select: { whatsappNumber: true },
      });
      if (!campaign?.whatsappNumber) {
        return reply.status(409).send({ message: 'Configure primeiro o número oficial do WhatsApp Business.' });
      }
      const supporter = await prisma.user.findFirst({
        where: { ...scope, id: request.params.id },
        select: { id: true, phone: true, whatsappStatus: true, whatsappInitialMessageSentAt: true },
      });
      if (!supporter) return reply.status(404).send({ message: 'Apoiador não encontrado.' });
      if (!normalizeBrazilianPhone(supporter.phone)) return reply.status(400).send({ message: 'Apoiador sem telefone válido.' });
      if (supporter.whatsappStatus === WhatsappStatus.OPT_OUT) {
        return reply.status(409).send({ message: 'O apoiador não deseja receber mensagens.' });
      }
      if (!supporter.whatsappInitialMessageSentAt) {
        await prisma.user.updateMany({
          where: { AND: [scope, { id: supporter.id, whatsappInitialMessageSentAt: null }] },
          data: { whatsappInitialMessageSentAt: new Date() },
        });
      }
      const updated = await prisma.user.findFirst({
        where: { AND: [scope, { id: supporter.id }] },
        select: { whatsappInitialMessageSentAt: true },
      });
      if (!updated?.whatsappInitialMessageSentAt) {
        return reply.status(409).send({ message: 'O apoiador não está mais disponível neste escopo.' });
      }
      return reply.send({ sentAt: updated.whatsappInitialMessageSentAt.toISOString() });
    },
  );
}
