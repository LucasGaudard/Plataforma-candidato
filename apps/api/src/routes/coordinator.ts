import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { CityZone as PrismaCityZone } from '@prisma/client';
import type { CoordinatorSupporterItem, CreateLeaderRequest, UpdateLeaderRequest } from '@platform/types';
import { Role, SupporterStatus, WhatsappStatus } from '@platform/types';
import {
  generateSlug,
  normalizeRegisterInput,
  parsePagination,
  sanitizeString,
  validateRegisterInput,
  isValidCityZone,
} from '@platform/utils';
import { prisma } from '../lib/prisma';
import {
  deleteSupporterWithinScope,
  supporterIdPattern,
  supporterScope,
  supporterSearchWhere,
} from '../lib/supporter-management';

// Campos retornados nas listagens de líderes
const leaderSelect = (campaignId: string) => ({
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  city: true,
  state: true,
  neighborhood: true,
  zone: true,
  leaderSlug: true,
  createdAt: true,
  _count: {
    select: {
      supporters: { where: { campaignId } },
    },
  },
});

// Gera slug único para o líder (incrementa sufixo se houver conflito)
async function generateUniqueLeaderSlug(firstName: string, lastName: string): Promise<string> {
  const base = generateSlug(firstName, lastName);
  let slug = base;
  let attempt = 1;
  while (true) {
    const existing = await prisma.user.findUnique({ where: { leaderSlug: slug } });
    if (!existing) return slug;
    slug = `${base}-${attempt}`;
    attempt++;
  }
}

// Converte registro do banco para o shape público CoordinatorLeaderItem
function toLeaderItem(leader: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  neighborhood: string | null;
  zone: import('@prisma/client').CityZone | null;
  leaderSlug: string | null;
  createdAt: Date;
  _count: { supporters: number };
}) {
  return {
    id: leader.id,
    firstName: leader.firstName,
    lastName: leader.lastName,
    email: leader.email,
    phone: leader.phone,
    city: leader.city,
    state: leader.state,
    neighborhood: leader.neighborhood,
    zone: leader.zone,
    leaderSlug: leader.leaderSlug,
    supporterCount: leader._count.supporters,
    createdAt: leader.createdAt.toISOString(),
  };
}

export async function coordinatorRoutes(fastify: FastifyInstance) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // ─────────────────────────────────────────────────────────
  // GET /coordinator/dashboard
  // Retorna estatísticas agregadas do coordenador autenticado
  // ─────────────────────────────────────────────────────────
  fastify.get(
    '/dashboard',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      const coordinatorId = request.user.sub;
      const campaignId = request.user.campaignId;

      const coordinator = await prisma.user.findFirst({
        where: { id: coordinatorId, role: Role.COORDINATOR, campaignId },
        select: {
          coordinatorSlug: true,
          campaign: { select: { slug: true } },
        },
      });
      if (!coordinator?.coordinatorSlug || !coordinator.campaign) {
        return reply.status(404).send({ message: 'Coordenador não encontrado' });
      }

      const structureWhere = {
        role: Role.USER,
        campaignId,
        OR: [
          { leaderId: null, coordinatorId },
          { leaderId: { not: null }, leader: { coordinatorId, campaignId, role: Role.LEADER } },
        ],
      };

      const [totalLeaders, totalSupporters, leaderSupporters, statusCounts] = await Promise.all([
        prisma.user.count({
          where: { role: Role.LEADER, coordinatorId, campaignId },
        }),
        prisma.user.count({
          where: structureWhere,
        }),
        prisma.user.count({
          where: {
            role: Role.USER,
            campaignId,
            leaderId: { not: null },
            leader: { coordinatorId, campaignId, role: Role.LEADER },
          },
        }),
        prisma.user.groupBy({
          by: ['status'],
          where: structureWhere,
          _count: { status: true },
        }),
      ]);

      const averageSupportersPerLeader =
        totalLeaders > 0 ? Math.round(leaderSupporters / totalLeaders) : 0;

      return reply.send({
        totalLeaders,
        totalSupporters,
        totalPending: statusCounts.find((s) => s.status === SupporterStatus.PENDING)?._count.status || 0,
        totalVerified: statusCounts.find((s) => s.status === SupporterStatus.VERIFIED)?._count.status || 0,
        totalInvalid: statusCounts.find((s) => s.status === SupporterStatus.INVALID)?._count.status || 0,
        averageSupportersPerLeader,
        coordinatorSlug: coordinator.coordinatorSlug,
        referralLink: `${frontendUrl}/campanhas/${coordinator.campaign.slug}/coordenador/${coordinator.coordinatorSlug}`,
      });
    },
  );

  // ─────────────────────────────────────────────────────────
  // GET /coordinator/leaders
  // Lista paginada dos líderes vinculados ao coordenador
  // ─────────────────────────────────────────────────────────
  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string };
  }>(
    '/leaders',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      const coordinatorId = request.user.sub;
      const { page, limit, skip } = parsePagination(request.query);
      const search = request.query.search?.trim();

      const where = {
        role: Role.LEADER,
        coordinatorId,
        campaignId: request.user.campaignId,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const [leaders, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: leaderSelect(request.user.campaignId),
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return reply.send({
        data: leaders.map(toLeaderItem),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  // ─────────────────────────────────────────────────────────
  // POST /coordinator/leaders
  // Cria um novo LEADER vinculado ao coordenador autenticado.
  // O coordinatorId é sempre extraído do JWT — nunca do body.
  // ─────────────────────────────────────────────────────────
  fastify.post<{ Body: CreateLeaderRequest }>(
    '/leaders',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      const coordinatorId = request.user.sub;
      const body = request.body || ({} as CreateLeaderRequest);

      const sanitized = {
        firstName: sanitizeString(body.firstName || ''),
        lastName: sanitizeString(body.lastName || ''),
        email: sanitizeString(body.email || ''),
        address: sanitizeString(body.address || ''),
        city: sanitizeString(body.city || ''),
        state: sanitizeString(body.state || ''),
        neighborhood: sanitizeString(body.neighborhood || ''),
        zone: body.zone,
        cpf: body.cpf || '',
        phone: body.phone || '',
        password: body.password || '',
      };

      const normalized = normalizeRegisterInput(sanitized);
      const validation = validateRegisterInput(normalized);

      if (!validation.valid) {
        return reply.status(400).send({ message: 'Dados inválidos', errors: validation.errors });
      }

      const [existingEmail, existingCpf] = await Promise.all([
        prisma.user.findUnique({ where: { email: normalized.email } }),
        prisma.user.findUnique({ where: { cpf: normalized.cpf } }),
      ]);

      if (existingEmail) return reply.status(409).send({ message: 'E-mail já cadastrado' });
      if (existingCpf) return reply.status(409).send({ message: 'CPF já cadastrado' });

      const hashedPassword = await bcrypt.hash(normalized.password, 12);
      const leaderSlug = await generateUniqueLeaderSlug(normalized.firstName, normalized.lastName);

      const leader = await prisma.user.create({
        data: {
          email: normalized.email,
          password: hashedPassword,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          cpf: normalized.cpf,
          phone: normalized.phone,
          address: normalized.address,
          city: normalized.city,
          state: normalized.state,
          neighborhood: normalized.neighborhood,
          zone: normalized.zone,
          role: Role.LEADER,
          leaderSlug,
          coordinatorId,
          campaignId: request.user.campaignId,
        },
        select: leaderSelect(request.user.campaignId),
      });

      return reply.status(201).send(toLeaderItem(leader));
    },
  );

  // ─────────────────────────────────────────────────────────
  // PUT /coordinator/leaders/:id
  // Edita líder — valida posse por coordinatorId antes de salvar
  // ─────────────────────────────────────────────────────────
  fastify.put<{ Params: { id: string }; Body: UpdateLeaderRequest }>(
    '/leaders/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      const coordinatorId = request.user.sub;
      const { id } = request.params;

      // Segurança: garante que o líder pertence ao coordenador autenticado
      const existing = await prisma.user.findFirst({
        where: {
          id,
          role: Role.LEADER,
          coordinatorId,
          campaignId: request.user.campaignId,
        },
      });

      if (!existing) {
        return reply.status(404).send({ message: 'Líder não encontrado' });
      }

      const body = request.body || {};
      const updateData: Record<string, unknown> = {};

      if (body.firstName !== undefined) updateData.firstName = sanitizeString(body.firstName);
      if (body.lastName !== undefined) updateData.lastName = sanitizeString(body.lastName);
      if (body.phone !== undefined) updateData.phone = body.phone.replace(/\D/g, '');
      if (body.address !== undefined) updateData.address = sanitizeString(body.address);
      if (body.city !== undefined) updateData.city = sanitizeString(body.city);
      if (body.state !== undefined) updateData.state = body.state.trim().toUpperCase();
      if (body.neighborhood !== undefined) {
        const neighborhood = sanitizeString(body.neighborhood);
        if (neighborhood.length > 100) return reply.status(400).send({ message: 'Bairro deve ter no máximo 100 caracteres.' });
        updateData.neighborhood = neighborhood;
      }
      if (body.zone !== undefined) {
        if (body.zone !== null && !isValidCityZone(body.zone)) return reply.status(400).send({ message: 'Zona inválida.' });
        updateData.zone = body.zone;
      }

      // Regenera slug se o nome foi alterado
      if (body.firstName !== undefined || body.lastName !== undefined) {
        const newFirst = (updateData.firstName as string) ?? existing.firstName;
        const newLast = (updateData.lastName as string) ?? existing.lastName;
        // Remove slug atual antes de gerar novo (evita conflito consigo mesmo)
        await prisma.user.update({ where: { id }, data: { leaderSlug: null } });
        updateData.leaderSlug = await generateUniqueLeaderSlug(newFirst, newLast);
      }

      const leader = await prisma.user.update({
        where: { id },
        data: updateData,
        select: leaderSelect(request.user.campaignId),
      });

      return reply.send(toLeaderItem(leader));
    },
  );

  // ─────────────────────────────────────────────────────────
  // PATCH /coordinator/leaders/:id/deactivate
  // Desativa líder removendo o leaderSlug (impede captação de apoiadores).
  // Valida posse por coordinatorId antes de qualquer alteração.
  // ─────────────────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/leaders/:id/deactivate',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      const coordinatorId = request.user.sub;
      const { id } = request.params;

      // Segurança: garante que o líder pertence ao coordenador autenticado
      const existing = await prisma.user.findFirst({
        where: {
          id,
          role: Role.LEADER,
          coordinatorId,
          campaignId: request.user.campaignId,
        },
      });

      if (!existing) {
        return reply.status(404).send({ message: 'Líder não encontrado' });
      }

      if (!existing.leaderSlug) {
        return reply.status(409).send({ message: 'Líder já está desativado' });
      }

      await prisma.user.update({
        where: { id },
        data: { leaderSlug: null },
      });

      return reply.send({ success: true, message: 'Líder desativado com sucesso' });
    },
  );

  // ─────────────────────────────────────────────────────────
  // GET /coordinator/supporters
  // Lista paginada dos apoiadores diretos e dos líderes atualmente vinculados.
  // ─────────────────────────────────────────────────────────
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      city?: string;
      state?: string;
      neighborhood?: string;
      zone?: string;
      origin?: string;
      leaderId?: string;
      order?: string;
    };
  }>(
    '/supporters',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      const coordinatorId = request.user.sub;
      const { page, limit, skip } = parsePagination(request.query);
      const search = request.query.search?.trim();
      const city = request.query.city?.trim();
      const state = request.query.state?.trim().toUpperCase();
      const neighborhood = request.query.neighborhood?.trim();
      const zone = request.query.zone?.trim();
      const campaignId = request.user.campaignId;
      const origin = request.query.origin?.trim().toUpperCase();
      const leaderId = request.query.leaderId?.trim();
      const order = request.query.order?.trim().toLowerCase() || 'desc';
      const supporterSearch = supporterSearchWhere(search);

      if (origin && origin !== 'COORDINATOR' && origin !== 'LEADER') {
        return reply.status(400).send({ message: 'Filtro de origem inválido.' });
      }
      if (order !== 'asc' && order !== 'desc') {
        return reply.status(400).send({ message: 'Ordenação inválida.' });
      }
      if (zone && !isValidCityZone(zone)) return reply.status(400).send({ message: 'Zona inválida.' });

      const directScope = { leaderId: null, coordinatorId };
      const leaderScope = {
        leaderId: { not: null },
        leader: { coordinatorId, campaignId, role: Role.LEADER },
      };
      const structureScope = origin === 'COORDINATOR'
        ? directScope
        : origin === 'LEADER'
          ? leaderScope
          : { OR: [directScope, leaderScope] };

      const where = {
        role: Role.USER,
        campaignId,
        ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
        ...(state ? { state } : {}),
        ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' as const } } : {}),
        ...(zone ? { zone: zone as PrismaCityZone } : {}),
        AND: [
          structureScope,
          ...(leaderId ? [{ leaderId, leader: { coordinatorId, campaignId, role: Role.LEADER } }] : []),
          ...(supporterSearch ? [supporterSearch] : []),
        ],
      };

      const [users, total, direct, fromLeaders] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            city: true,
            state: true,
            neighborhood: true,
            zone: true,
            status: true,
            whatsappStatus: true,
            whatsappConfirmedAt: true,
            leaderId: true,
            createdAt: true,
            leader: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: order as 'asc' | 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
        prisma.user.count({ where: { role: Role.USER, campaignId, ...directScope } }),
        prisma.user.count({ where: { role: Role.USER, campaignId, ...leaderScope } }),
      ]);

      const data: CoordinatorSupporterItem[] = users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        email: u.email.endsWith('@whatsapp.local') ? undefined : u.email,
        city: u.city,
        state: u.state,
        neighborhood: u.neighborhood,
        zone: u.zone,
        status: u.status as SupporterStatus,
        whatsappStatus: u.whatsappStatus as WhatsappStatus,
        whatsappConfirmedAt: u.whatsappConfirmedAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        origin: u.leaderId ? 'LEADER' : 'COORDINATOR',
        leaderName: u.leader ? `${u.leader.firstName} ${u.leader.lastName}` : undefined,
        leader: u.leader
          ? { id: u.leader.id, name: `${u.leader.firstName} ${u.leader.lastName}` }
          : null,
      }));

      return reply.send({
        data,
        summary: { total: direct + fromLeaders, direct, fromLeaders },
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.patch<{ Params: { id: string }; Body: { status: SupporterStatus } }>(
    '/supporters/:id/status',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      const coordinatorId = request.user.sub;
      const { id } = request.params;
      const { status } = request.body;

      if (!Object.values(SupporterStatus).includes(status)) {
        return reply.status(400).send({ message: 'Status inválido' });
      }

      const existing = await prisma.user.findFirst({
        where: {
          id,
          role: Role.USER,
          campaignId: request.user.campaignId,
          OR: [
            { leaderId: null, coordinatorId },
            {
              leaderId: { not: null },
              leader: { coordinatorId, campaignId: request.user.campaignId, role: Role.LEADER },
            },
          ],
        },
      });

      if (!existing) {
        return reply.status(404).send({ message: 'Apoiador não encontrado ou não pertence aos seus líderes' });
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
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      if (!supporterIdPattern.test(request.params.id)) {
        return reply.status(400).send({ message: 'ID de apoiador inválido.' });
      }
      const scope = supporterScope(
        Role.COORDINATOR as import('@prisma/client').Role,
        request.user.sub,
        request.user.campaignId,
      );
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
      leaderId?: string;
      city?: string;
      state?: string;
      neighborhood?: string;
      zone?: string;
    };
  }>(
    '/communication/recipients/count',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      const coordinatorId = request.user.sub;
      const { verifiedOnly, leaderId, city, state, neighborhood, zone } = request.query;
      if (zone && !isValidCityZone(zone)) return reply.status(400).send({ message: 'Zona inválida.' });

      const count = await prisma.user.count({
        where: {
          role: Role.USER,
          campaignId: request.user.campaignId,
          ...(verifiedOnly === 'true' ? { status: SupporterStatus.VERIFIED } : {}),
          ...(leaderId
            ? {
                leaderId,
                leader: {
                  coordinatorId,
                  campaignId: request.user.campaignId,
                },
              }
            : {
                OR: [
                  { leaderId: null, coordinatorId },
                  {
                    leaderId: { not: null },
                    leader: { coordinatorId, campaignId: request.user.campaignId, role: Role.LEADER },
                  },
                ],
              }),
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
