import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import type { CreateLeaderRequest, SupporterListItem, UpdateLeaderRequest } from '@platform/types';
import { Role, SupporterStatus } from '@platform/types';
import {
  generateSlug,
  normalizeRegisterInput,
  parsePagination,
  sanitizeString,
  validateRegisterInput,
} from '@platform/utils';
import { prisma } from '../lib/prisma';

// Campos retornados nas listagens de líderes
const leaderSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  city: true,
  state: true,
  leaderSlug: true,
  createdAt: true,
  _count: { select: { supporters: true } },
};

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
    leaderSlug: leader.leaderSlug,
    supporterCount: leader._count.supporters,
    createdAt: leader.createdAt.toISOString(),
  };
}

export async function coordinatorRoutes(fastify: FastifyInstance) {
  // ─────────────────────────────────────────────────────────
  // GET /coordinator/dashboard
  // Retorna estatísticas agregadas do coordenador autenticado
  // ─────────────────────────────────────────────────────────
  fastify.get(
    '/dashboard',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      const coordinatorId = request.user.sub;

      const [totalLeaders, totalSupporters, statusCounts] = await Promise.all([
        prisma.user.count({
          where: { role: Role.LEADER, coordinatorId },
        }),
        prisma.user.count({
          where: {
            role: Role.USER,
            leader: { coordinatorId },
          },
        }),
        prisma.user.groupBy({
          by: ['status'],
          where: {
            role: Role.USER,
            leader: { coordinatorId },
          },
          _count: { status: true },
        }),
      ]);

      const averageSupportersPerLeader =
        totalLeaders > 0 ? Math.round(totalSupporters / totalLeaders) : 0;

      return reply.send({
        totalLeaders,
        totalSupporters,
        totalPending: statusCounts.find((s) => s.status === SupporterStatus.PENDING)?._count.status || 0,
        totalVerified: statusCounts.find((s) => s.status === SupporterStatus.VERIFIED)?._count.status || 0,
        totalInvalid: statusCounts.find((s) => s.status === SupporterStatus.INVALID)?._count.status || 0,
        averageSupportersPerLeader,
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
          select: leaderSelect,
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
          role: Role.LEADER,
          leaderSlug,
          coordinatorId,
        },
        select: leaderSelect,
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
        where: { id, role: Role.LEADER, coordinatorId },
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
        select: leaderSelect,
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
        where: { id, role: Role.LEADER, coordinatorId },
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
  // Lista paginada dos apoiadores vinculados aos líderes deste coordenador
  // ─────────────────────────────────────────────────────────
  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string; city?: string; state?: string; leaderId?: string };
  }>(
    '/supporters',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.COORDINATOR)] },
    async (request, reply) => {
      const coordinatorId = request.user.sub;
      const { page, limit, skip } = parsePagination(request.query);
      const search = request.query.search?.trim();
      const city = request.query.city?.trim();
      const state = request.query.state?.trim().toUpperCase();
      const leaderId = request.query.leaderId;

      const where = {
        role: Role.USER,
        leader: { coordinatorId },
        ...(leaderId ? { leaderId } : {}),
        ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
        ...(state ? { state } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
                { phone: { contains: search.replace(/\D/g, '') } },
              ],
            }
          : {}),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            leader: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      const data: SupporterListItem[] = users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        city: u.city,
        state: u.state,
        status: u.status as SupporterStatus,
        createdAt: u.createdAt.toISOString(),
        leaderName: u.leader ? `${u.leader.firstName} ${u.leader.lastName}` : undefined,
      }));

      return reply.send({
        data,
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
          leader: { coordinatorId },
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
}
