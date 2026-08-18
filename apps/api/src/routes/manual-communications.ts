import type { FastifyInstance } from 'fastify';
import { ManualCommunicationRecipientStatus, ManualCommunicationSessionStatus, Prisma, Role as PrismaRole, SupporterStatus } from '@prisma/client';
import { Role, type CreateManualCommunicationSessionRequest, type ManualCommunicationEligibleResponse, type ManualCommunicationFilters } from '@platform/types';
import { isValidCityZone, normalizeBrazilianPhone } from '@platform/utils';
import { prisma } from '../lib/prisma';
import { canProcessManualRecipient, classifyManualCommunicationAudience, manualCommunicationAudienceWhere, manualCommunicationSessionOwnerWhere, normalizeManualSelection, resolveManualCommunicationLimit } from '../lib/manual-communication';
import { supporterScope } from '../lib/supporter-management';

const teamRoles = [Role.ADMIN, Role.COORDINATOR, Role.LEADER];
const PREVIEW_BATCH_SIZE = 1000;
const CREATION_BATCH_SIZE = 500;
const RECIPIENT_PAGE_SIZE = 100;

function validateFilters(filters: ManualCommunicationFilters) {
  if (filters.status && !Object.values(SupporterStatus).includes(filters.status as SupporterStatus)) throw new Error('Status inválido.');
  if (filters.zone && !isValidCityZone(filters.zone)) throw new Error('Zona inválida.');
  for (const value of [filters.registeredFrom, filters.registeredTo]) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Data de cadastro inválida.');
  }
  if (filters.registeredFrom && filters.registeredTo && filters.registeredFrom > filters.registeredTo) {
    throw new Error('A data inicial deve ser anterior à data final.');
  }
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')) as ManualCommunicationFilters;
}

function scopeFor(request: { user: { role: Role; sub: string; campaignId: string } }) {
  return supporterScope(request.user.role as unknown as PrismaRole, request.user.sub, request.user.campaignId);
}

function emptyCounts() {
  return Object.fromEntries(Object.values(ManualCommunicationRecipientStatus).map((status) => [status, 0])) as Record<ManualCommunicationRecipientStatus, number>;
}

function countsFromGroups(groups: Array<{ status: ManualCommunicationRecipientStatus; _count: { _all: number } }>) {
  const counts = emptyCounts();
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}

function toSession(session: any, counts: Record<ManualCommunicationRecipientStatus, number>, recipients?: any[]) {
  return {
    id: session.id, title: session.title, message: session.message,
    filters: session.filters, requestedQuantity: session.requestedQuantity,
    status: session.status, createdByUserId: session.createdByUserId,
    createdByName: session.createdByName, createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(), counts,
    ...(recipients ? { recipients: recipients.map((item) => ({
      id: item.id, supporterId: item.supporterId, supporterName: item.supporterName,
      phone: item.phone, status: item.status, sentAt: item.sentAt?.toISOString() ?? null,
      skippedAt: item.skippedAt?.toISOString() ?? null, optOutAt: item.optOutAt?.toISOString() ?? null,
    })) } : {}),
  };
}

export async function manualCommunicationRoutes(fastify: FastifyInstance) {
  const team = [fastify.authenticate, fastify.authorize(...teamRoles)];

  fastify.get('/options', { preHandler: team }, async (request, reply) => {
    const scope = scopeFor(request);
    if (!scope) return reply.status(403).send({ message: 'Acesso negado' });
    const [leaderRows, coordinatorRows, cityRows, neighborhoodRows] = await Promise.all([
      prisma.user.findMany({ where: { AND: [scope, { leaderId: { not: null } }] }, distinct: ['leaderId'], select: { leader: { select: { id: true, firstName: true, lastName: true } } } }),
      prisma.user.findMany({ where: { AND: [scope, { coordinatorId: { not: null } }] }, distinct: ['coordinatorId'], select: { coordinator: { select: { id: true, firstName: true, lastName: true } } } }),
      prisma.user.findMany({ where: scope, distinct: ['city'], select: { city: true } }),
      prisma.user.findMany({ where: { AND: [scope, { neighborhood: { not: null } }] }, distinct: ['neighborhood'], select: { neighborhood: true } }),
    ]);
    const leaders = new Map(leaderRows.flatMap(({ leader }) => leader ? [[leader.id, `${leader.firstName} ${leader.lastName}`] as const] : []));
    const coordinators = new Map(coordinatorRows.flatMap(({ coordinator }) => coordinator ? [[coordinator.id, `${coordinator.firstName} ${coordinator.lastName}`] as const] : []));
    const cities = new Set(cityRows.map(({ city }) => city.trim()).filter(Boolean));
    const neighborhoods = new Set(neighborhoodRows.map(({ neighborhood }) => neighborhood?.trim()).filter((value): value is string => Boolean(value)));
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'pt-BR');
    return reply.send({
      leaders: [...leaders].map(([id, name]) => ({ id, name })).sort(byName),
      coordinators: [...coordinators].map(([id, name]) => ({ id, name })).sort(byName),
      cities: [...cities].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      neighborhoods: [...neighborhoods].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    });
  });

  fastify.post<{ Body: { filters?: ManualCommunicationFilters } }>('/preview', { preHandler: team }, async (request, reply) => {
    const scope = scopeFor(request);
    if (!scope) return reply.status(403).send({ message: 'Acesso negado' });
    let filters;
    try { filters = validateFilters(request.body?.filters || {}); }
    catch (error) { return reply.status(400).send({ message: (error as Error).message }); }
    const totals = { totalFound: 0, eligible: 0, excludedOptOut: 0, invalidPhone: 0 };
    let cursor: string | undefined;
    while (true) {
      const candidates = await prisma.user.findMany({
        where: manualCommunicationAudienceWhere(scope, filters),
        select: { id: true, phone: true, whatsappStatus: true },
        orderBy: { id: 'asc' }, take: PREVIEW_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const classified = classifyManualCommunicationAudience(candidates);
      totals.totalFound += classified.totalFound;
      totals.eligible += classified.eligible.length;
      totals.excludedOptOut += classified.excludedOptOut;
      totals.invalidPhone += classified.invalidPhone;
      if (candidates.length < PREVIEW_BATCH_SIZE) break;
      cursor = candidates[candidates.length - 1].id;
    }
    return reply.send(totals);
  });

  fastify.post<{
    Querystring: { page?: string; limit?: string };
    Body: { filters?: ManualCommunicationFilters };
  }>('/eligible', { preHandler: team }, async (request, reply) => {
    const scope = scopeFor(request);
    if (!scope) return reply.status(403).send({ message: 'Acesso negado' });
    let filters;
    try { filters = validateFilters(request.body?.filters || {}); }
    catch (error) { return reply.status(400).send({ message: (error as Error).message }); }
    const page = Math.max(1, Number.parseInt(request.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit || '20', 10) || 20));
    const start = (page - 1) * limit;
    const data: ManualCommunicationEligibleResponse['data'] = [];
    let eligibleIndex = 0;
    let cursor: string | undefined;
    while (true) {
      const candidates = await prisma.user.findMany({
        where: manualCommunicationAudienceWhere(scope, filters),
        select: {
          id: true, firstName: true, lastName: true, phone: true, city: true,
          neighborhood: true, createdAt: true, whatsappStatus: true,
          leader: { select: { firstName: true, lastName: true } },
          coordinator: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: PREVIEW_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const candidate of classifyManualCommunicationAudience(candidates).eligible) {
        if (eligibleIndex >= start && data.length < limit) {
          data.push({
            id: candidate.id, name: `${candidate.firstName} ${candidate.lastName}`,
            phone: normalizeBrazilianPhone(candidate.phone)!, city: candidate.city,
            neighborhood: candidate.neighborhood,
            coordinatorName: candidate.coordinator ? `${candidate.coordinator.firstName} ${candidate.coordinator.lastName}` : null,
            leaderName: candidate.leader ? `${candidate.leader.firstName} ${candidate.leader.lastName}` : null,
            createdAt: candidate.createdAt.toISOString(),
          });
        }
        eligibleIndex += 1;
      }
      if (candidates.length < PREVIEW_BATCH_SIZE) break;
      cursor = candidates[candidates.length - 1].id;
    }
    const response: ManualCommunicationEligibleResponse = {
      data,
      meta: { page, limit, total: eligibleIndex, totalPages: Math.max(1, Math.ceil(eligibleIndex / limit)) },
    };
    return reply.send(response);
  });

  fastify.post<{ Body: CreateManualCommunicationSessionRequest }>('/', { preHandler: team }, async (request, reply) => {
    const scope = scopeFor(request);
    if (!scope) return reply.status(403).send({ message: 'Acesso negado' });
    const title = request.body?.title?.trim().replace(/\s+/g, ' ');
    const message = request.body?.message?.trim();
    if (!title || title.length > 120) return reply.status(400).send({ message: 'Informe um título de até 120 caracteres.' });
    if (!message || message.length > 2000) return reply.status(400).send({ message: 'Informe uma mensagem de até 2000 caracteres.' });
    let filters: ManualCommunicationFilters;
    try { filters = validateFilters(request.body.filters || {}); }
    catch (error) { return reply.status(400).send({ message: (error as Error).message }); }
    let selection;
    try { selection = normalizeManualSelection(request.body.selection); }
    catch (error) { return reply.status(400).send({ message: (error as Error).message }); }
    let maximumRecipients = Number.POSITIVE_INFINITY;
    try {
      if (selection?.mode === 'IDS') maximumRecipients = selection.ids.length;
      else if (selection?.mode === 'FIRST') maximumRecipients = selection.count;
      else if (!selection && request.body.quantity !== 'ALL') maximumRecipients = resolveManualCommunicationLimit(request.body.quantity, 5000);
    } catch (error) { return reply.status(400).send({ message: (error as Error).message }); }
    try {
      const created = await prisma.$transaction(async (tx) => {
        const creator = await tx.user.findFirstOrThrow({
          where: { id: request.user.sub, campaignId: request.user.campaignId },
          select: { firstName: true, lastName: true },
        });
        const session = await tx.manualCommunicationSession.create({
          data: {
            campaignId: request.user.campaignId, createdByUserId: request.user.sub,
            createdByName: `${creator.firstName} ${creator.lastName}`, title, message,
            filters: filters as Prisma.InputJsonValue, requestedQuantity: 0,
          },
        });
        let cursor: string | undefined;
        let selected = 0;
        const audienceWhere = manualCommunicationAudienceWhere(scope, filters);
        const selectedAudienceWhere = selection?.mode === 'IDS'
          ? { AND: [audienceWhere, { id: { in: selection.ids } }] }
          : selection?.mode === 'ALL_FILTERED' && selection.excludedIds.length
            ? { AND: [audienceWhere, { id: { notIn: selection.excludedIds } }] }
            : audienceWhere;
        while (selected < maximumRecipients) {
          const candidates = await tx.user.findMany({
            where: selectedAudienceWhere,
            select: { id: true, firstName: true, lastName: true, phone: true, whatsappStatus: true },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: CREATION_BATCH_SIZE,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          });
          const remaining = maximumRecipients === Number.POSITIVE_INFINITY
            ? CREATION_BATCH_SIZE
            : Math.max(0, maximumRecipients - selected);
          const eligible = classifyManualCommunicationAudience(candidates).eligible.slice(0, remaining);
          if (eligible.length) {
            const inserted = await tx.manualCommunicationRecipient.createMany({
              data: eligible.map((item) => ({
                sessionId: session.id, supporterId: item.id,
                supporterName: `${item.firstName} ${item.lastName}`,
                phone: normalizeBrazilianPhone(item.phone)!,
              })),
              skipDuplicates: true,
            });
            selected += inserted.count;
          }
          if (candidates.length < CREATION_BATCH_SIZE) break;
          cursor = candidates[candidates.length - 1].id;
        }
        if (selected === 0) throw new Error('Nenhum apoiador elegível para criar a sessão.');
        const updatedSession = await tx.manualCommunicationSession.update({
          where: { id: session.id }, data: { requestedQuantity: selected },
        });
        const recipients = await tx.manualCommunicationRecipient.findMany({
          where: { sessionId: session.id, status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: RECIPIENT_PAGE_SIZE,
        });
        return { session: updatedSession, recipients, selected };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000 });
      return reply.status(201).send(toSession(
        created.session,
        { ...emptyCounts(), PENDING: created.selected },
        created.recipients,
      ));
    } catch (error) {
      const message = error instanceof Error && error.message === 'Nenhum apoiador elegível para criar a sessão.'
        ? error.message : 'Não foi possível criar a sessão.';
      return reply.status(400).send({ message });
    }
  });

  fastify.get('/', { preHandler: team }, async (request, reply) => {
    const sessions = await prisma.manualCommunicationSession.findMany({
      where: manualCommunicationSessionOwnerWhere(request.user.campaignId, request.user.sub),
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    const groups = sessions.length ? await prisma.manualCommunicationRecipient.groupBy({
      by: ['sessionId', 'status'],
      where: { sessionId: { in: sessions.map((session) => session.id) } },
      _count: { _all: true },
    }) : [];
    return reply.send(sessions.map((session) => toSession(
      session,
      countsFromGroups(groups.filter((group) => group.sessionId === session.id)),
    )));
  });

  fastify.get<{ Params: { id: string } }>('/:id', { preHandler: team }, async (request, reply) => {
    const session = await prisma.manualCommunicationSession.findFirst({
      where: manualCommunicationSessionOwnerWhere(request.user.campaignId, request.user.sub, request.params.id),
    });
    if (!session) return reply.status(404).send({ message: 'Sessão não encontrada.' });
    const [groups, recipients] = await Promise.all([
      prisma.manualCommunicationRecipient.groupBy({
        by: ['status'], where: { sessionId: session.id }, _count: { _all: true },
      }),
      prisma.manualCommunicationRecipient.findMany({
        where: { sessionId: session.id, status: 'PENDING' },
        orderBy: { createdAt: 'asc' }, take: RECIPIENT_PAGE_SIZE,
      }),
    ]);
    return reply.send(toSession(session, countsFromGroups(groups), recipients));
  });

  fastify.patch<{ Params: { id: string }; Body: { status: 'ACTIVE' | 'PAUSED' } }>('/:id/status', { preHandler: team }, async (request, reply) => {
    if (!['ACTIVE', 'PAUSED'].includes(request.body?.status)) return reply.status(400).send({ message: 'Status inválido.' });
    const updated = await prisma.manualCommunicationSession.updateMany({
      where: { ...manualCommunicationSessionOwnerWhere(request.user.campaignId, request.user.sub, request.params.id), status: { not: ManualCommunicationSessionStatus.COMPLETED } },
      data: { status: request.body.status },
    });
    if (!updated.count) return reply.status(404).send({ message: 'Sessão ativa não encontrada.' });
    return reply.send({ status: request.body.status });
  });

  fastify.patch<{ Params: { id: string; recipientId: string }; Body: { action: 'SENT' | 'SKIPPED' | 'OPT_OUT' } }>('/:id/recipients/:recipientId', { preHandler: team }, async (request, reply) => {
    const action = request.body?.action;
    if (!['SENT', 'SKIPPED', 'OPT_OUT'].includes(action)) return reply.status(400).send({ message: 'Ação inválida.' });
    const scope = scopeFor(request);
    if (!scope) return reply.status(403).send({ message: 'Acesso negado' });
    const result = await prisma.$transaction(async (tx) => {
      const recipient = await tx.manualCommunicationRecipient.findFirst({
        where: { id: request.params.recipientId, sessionId: request.params.id,
          session: { campaignId: request.user.campaignId, createdByUserId: request.user.sub } },
      });
      if (!recipient) return null;
      if (recipient.status === action) return recipient;
      if (recipient.status !== ManualCommunicationRecipientStatus.PENDING) return null;
      const lockedSession = await tx.manualCommunicationSession.updateMany({
        where: { id: request.params.id, campaignId: request.user.campaignId, createdByUserId: request.user.sub, status: ManualCommunicationSessionStatus.ACTIVE },
        data: { updatedAt: new Date() },
      });
      if (!lockedSession.count) return null;
      const supporter = await tx.user.findFirst({
        where: { AND: [scope, { id: recipient.supporterId }] },
        select: { id: true, whatsappStatus: true },
      });
      if (!canProcessManualRecipient(supporter)) return null;
      const now = new Date();
      const claimed = await tx.manualCommunicationRecipient.updateMany({
        where: { id: recipient.id, status: ManualCommunicationRecipientStatus.PENDING },
        data: { status: action, updatedByUserId: request.user.sub,
          ...(action === 'SENT' ? { sentAt: now } : action === 'SKIPPED' ? { skippedAt: now } : { optOutAt: now }) },
      });
      if (!claimed.count) {
        const concurrent = await tx.manualCommunicationRecipient.findUnique({ where: { id: recipient.id } });
        return concurrent?.status === action ? concurrent : null;
      }
      if (action === 'OPT_OUT') await tx.user.update({ where: { id: supporter.id }, data: { whatsappStatus: 'OPT_OUT' } });
      const updated = await tx.manualCommunicationRecipient.findUniqueOrThrow({ where: { id: recipient.id } });
      const pending = await tx.manualCommunicationRecipient.count({ where: { sessionId: request.params.id, status: 'PENDING' } });
      if (pending === 0) await tx.manualCommunicationSession.update({ where: { id: request.params.id }, data: { status: 'COMPLETED' } });
      return updated;
    });
    if (!result) return reply.status(409).send({ message: 'Destinatário indisponível ou sessão pausada/concluída.' });
    return reply.send({ status: result.status });
  });
}
