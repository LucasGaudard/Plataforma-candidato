import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import type { 
  AdminDashboard, 
  SupporterListItem,
  AdminCoordinatorItem,
  AdminLeaderItem,
  CreateCoordinatorRequest,
  UpdateCoordinatorRequest,
  AdminCreateLeaderRequest,
  UpdateLeaderRequest,
} from '@platform/types';
import { Role, SupporterStatus, WhatsappStatus } from '@platform/types';
import { 
  parsePagination,
  generateSlug,
  normalizeRegisterInput,
  sanitizeString,
  validateRegisterInput,
} from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toEventPublic, toLivePublic, toPostPublic } from '../lib/mappers';

const authorSelect = { firstName: true, lastName: true };

// Gera slug único para o líder
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

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/dashboard',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (_request, reply) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        totalLeaders,
        totalSupporters,
        totalPosts,
        totalEvents,
        totalLives,
        recentRegistrations,
        leaders,
        growthRaw,
        statusCounts,
      ] = await Promise.all([
        prisma.user.count({ where: { role: Role.LEADER } }),
        prisma.user.count({ where: { role: Role.USER } }),
        prisma.post.count({ where: { published: true } }),
        prisma.event.count({ where: { published: true } }),
        prisma.live.count({ where: { published: true } }),
        prisma.user.count({
          where: { role: Role.USER, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.user.findMany({
          where: { role: Role.LEADER },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            leaderSlug: true,
            _count: { select: { supporters: true } },
            supporters: {
              where: { createdAt: { gte: sevenDaysAgo } },
              select: { id: true },
            },
          },
          orderBy: { firstName: 'asc' },
        }),
        prisma.user.findMany({
          where: { role: Role.USER, createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.user.groupBy({
          by: ['status'],
          where: { role: Role.USER },
          _count: { status: true },
        }),
      ]);

      const supportersByLeader = leaders.map((leader) => ({
        leaderId: leader.id,
        leaderName: `${leader.firstName} ${leader.lastName}`,
        leaderSlug: leader.leaderSlug || '',
        count: leader._count.supporters,
      }));

      const leaderRanking = [...supportersByLeader]
        .sort((a, b) => b.count - a.count)
        .map((item, index) => {
          const leader = leaders.find((l) => l.id === item.leaderId);
          return {
            ...item,
            rank: index + 1,
            recentCount: leader?.supporters.length ?? 0,
          };
        });

      const growthMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        growthMap.set(d.toISOString().split('T')[0], 0);
      }

      for (const user of growthRaw) {
        const key = user.createdAt.toISOString().split('T')[0];
        if (growthMap.has(key)) {
          growthMap.set(key, (growthMap.get(key) || 0) + 1);
        }
      }

      const registrationGrowth = Array.from(growthMap.entries()).map(([date, count]) => ({
        date,
        count,
      }));

      const dashboard: AdminDashboard = {
        totalLeaders,
        totalSupporters,
        totalPending: statusCounts.find((s) => s.status === SupporterStatus.PENDING)?._count.status || 0,
        totalVerified: statusCounts.find((s) => s.status === SupporterStatus.VERIFIED)?._count.status || 0,
        totalInvalid: statusCounts.find((s) => s.status === SupporterStatus.INVALID)?._count.status || 0,
        totalPosts,
        totalEvents,
        totalLives,
        recentRegistrations,
        supportersByLeader,
        leaderRanking,
        registrationGrowth,
      };

      return reply.send(dashboard);
    },
  );

  fastify.get(
    '/posts',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (_request, reply) => {
      const posts = await prisma.post.findMany({
        include: { author: { select: authorSelect } },
        orderBy: { publishedAt: 'desc' },
      });
      return reply.send(posts.map(toPostPublic));
    },
  );

  fastify.get(
    '/events',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (_request, reply) => {
      const events = await prisma.event.findMany({
        include: { author: { select: authorSelect } },
        orderBy: { date: 'asc' },
      });
      return reply.send(events.map(toEventPublic));
    },
  );

  fastify.get(
    '/lives',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (_request, reply) => {
      const lives = await prisma.live.findMany({
        include: { author: { select: authorSelect } },
        orderBy: { scheduledAt: 'desc' },
      });
      return reply.send(lives.map(toLivePublic));
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
      leaderId?: string;
      coordinatorId?: string;
    };
  }>(
    '/supporters',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { page, limit, skip } = parsePagination(request.query);
      const search = request.query.search?.trim();
      const city = request.query.city?.trim();
      const state = request.query.state?.trim().toUpperCase();
      const leaderId = request.query.leaderId;
      const coordinatorId = request.query.coordinatorId;

      const where = {
        role: Role.USER,
        ...(leaderId ? { leaderId } : {}),
        ...(coordinatorId ? { coordinatorId } : {}),
        ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
        ...(state ? { state } : {}),
        ...(request.query.neighborhood ? { neighborhood: { contains: request.query.neighborhood.trim(), mode: 'insensitive' as const } } : {}),
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
            coordinator: { select: { firstName: true, lastName: true } },
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
        neighborhood: u.neighborhood,
        status: u.status as SupporterStatus,
        whatsappStatus: u.whatsappStatus as WhatsappStatus,
        createdAt: u.createdAt.toISOString(),
        leaderName: u.leader ? `${u.leader.firstName} ${u.leader.lastName}` : undefined,
        coordinatorName: u.coordinator ? `${u.coordinator.firstName} ${u.coordinator.lastName}` : undefined,
      }));

      return reply.send({
        data,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.patch<{ Params: { id: string }; Body: { status: SupporterStatus } }>(
    '/supporters/:id/status',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body;

      if (!Object.values(SupporterStatus).includes(status)) {
        return reply.status(400).send({ message: 'Status inválido' });
      }

      const existing = await prisma.user.findFirst({
        where: { id, role: Role.USER },
      });

      if (!existing) {
        return reply.status(404).send({ message: 'Apoiador não encontrado' });
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
      coordinatorId?: string;
      leaderId?: string;
      city?: string;
      state?: string;
      neighborhood?: string;
    };
  }>(
    '/communication/recipients/count',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { verifiedOnly, coordinatorId, leaderId, city, state, neighborhood } = request.query;

      const count = await prisma.user.count({
        where: {
          role: Role.USER,
          ...(verifiedOnly === 'true' ? { status: SupporterStatus.VERIFIED } : {}),
          ...(leaderId
            ? { leaderId }
            : coordinatorId
              ? { leader: { coordinatorId } }
              : {}),
          ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
          ...(state ? { state: state.toUpperCase() } : {}),
          ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' as const } } : {}),
        },
      });

      return reply.send({ count });
    },
  );

  // ─────────────────────────────────────────────────────────
  // COORDINATORS CRUD
  // ─────────────────────────────────────────────────────────
  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string };
  }>(
    '/coordinators',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { page, limit, skip } = parsePagination(request.query);
      const search = request.query.search?.trim();

      const where = {
        role: Role.COORDINATOR,
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

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            _count: { select: { leaders: true } }, // leaders of this coordinator
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      // Calculate total supporters under each coordinator
      const data: AdminCoordinatorItem[] = await Promise.all(
        users.map(async (u) => {
          const supportersCount = await prisma.user.count({
            where: { role: Role.USER, leader: { coordinatorId: u.id } },
          });
          const isActive = u.status !== SupporterStatus.INVALID;
          return {
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            phone: u.phone,
            city: u.city,
            state: u.state,
            neighborhood: u.neighborhood,
            active: isActive,
            leadersCount: u._count.leaders,
            supportersCount,
            createdAt: u.createdAt.toISOString(),
          };
        })
      );

      return reply.send({
        data,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.post<{ Body: CreateCoordinatorRequest }>(
    '/coordinators',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const body = request.body || ({} as CreateCoordinatorRequest);

      const sanitized = {
        firstName: sanitizeString(body.firstName || ''),
        lastName: sanitizeString(body.lastName || ''),
        email: sanitizeString(body.email || ''),
        address: sanitizeString(body.address || ''),
        city: sanitizeString(body.city || ''),
        state: sanitizeString(body.state || ''),
        neighborhood: sanitizeString(body.neighborhood || ''),
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

      const user = await prisma.user.create({
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
          role: Role.COORDINATOR,
        },
      });

      return reply.status(201).send({ id: user.id });
    },
  );

  fastify.put<{ Params: { id: string }; Body: UpdateCoordinatorRequest }>(
    '/coordinators/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { id } = request.params;

      const existing = await prisma.user.findFirst({
        where: { id, role: Role.COORDINATOR },
      });

      if (!existing) return reply.status(404).send({ message: 'Coordenador não encontrado' });

      const body = request.body || {};
      const updateData: Record<string, unknown> = {};

      if (body.firstName !== undefined) updateData.firstName = sanitizeString(body.firstName);
      if (body.lastName !== undefined) updateData.lastName = sanitizeString(body.lastName);
      if (body.phone !== undefined) updateData.phone = body.phone.replace(/\D/g, '');
      if (body.address !== undefined) updateData.address = sanitizeString(body.address);
      if (body.city !== undefined) updateData.city = sanitizeString(body.city);
      if (body.state !== undefined) updateData.state = body.state.trim().toUpperCase();
      if (body.neighborhood !== undefined) updateData.neighborhood = sanitizeString(body.neighborhood);

      await prisma.user.update({
        where: { id },
        data: updateData,
      });

      return reply.send({ success: true });
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/coordinators/:id/deactivate',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { id } = request.params;

      const existing = await prisma.user.findFirst({
        where: { id, role: Role.COORDINATOR },
      });

      if (!existing) return reply.status(404).send({ message: 'Coordenador não encontrado' });

      // Desativar coordenador: muda o status para INVALID e bloqueia acesso
      const isActive = existing.status !== SupporterStatus.INVALID;
      const newStatus = isActive ? SupporterStatus.INVALID : SupporterStatus.VERIFIED;

      await prisma.user.update({
        where: { id },
        data: { status: newStatus },
      });

      return reply.send({ success: true, message: `Coordenador ${isActive ? 'desativado' : 'ativado'}` });
    },
  );

  // ─────────────────────────────────────────────────────────
  // LEADERS CRUD (ADMIN)
  // ─────────────────────────────────────────────────────────
  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string; coordinatorId?: string };
  }>(
    '/leaders',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { page, limit, skip } = parsePagination(request.query);
      const search = request.query.search?.trim();
      const coordinatorId = request.query.coordinatorId;

      const where = {
        role: Role.LEADER,
        ...(coordinatorId ? { coordinatorId } : {}),
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

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            coordinator: { select: { firstName: true, lastName: true } },
            _count: { select: { supporters: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      const data: AdminLeaderItem[] = users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        city: u.city,
        state: u.state,
        neighborhood: u.neighborhood,
        active: !!u.leaderSlug, // If leaderSlug is null, leader is inactive
        supportersCount: u._count.supporters,
        coordinatorId: u.coordinatorId || '',
        coordinatorName: u.coordinator ? `${u.coordinator.firstName} ${u.coordinator.lastName}` : '',
        leaderSlug: u.leaderSlug || undefined,
        createdAt: u.createdAt.toISOString(),
      }));

      return reply.send({
        data,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.post<{ Body: AdminCreateLeaderRequest }>(
    '/leaders',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const body = request.body || ({} as AdminCreateLeaderRequest);

      if (!body.coordinatorId) {
        return reply.status(400).send({ message: 'O ID do coordenador é obrigatório.' });
      }

      const coordinator = await prisma.user.findFirst({
        where: { id: body.coordinatorId, role: Role.COORDINATOR },
      });

      if (!coordinator) {
        return reply.status(404).send({ message: 'Coordenador não encontrado.' });
      }

      const sanitized = {
        firstName: sanitizeString(body.firstName || ''),
        lastName: sanitizeString(body.lastName || ''),
        email: sanitizeString(body.email || ''),
        address: sanitizeString(body.address || ''),
        city: sanitizeString(body.city || ''),
        state: sanitizeString(body.state || ''),
        neighborhood: sanitizeString(body.neighborhood || ''),
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

      const user = await prisma.user.create({
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
          role: Role.LEADER,
          leaderSlug,
          coordinatorId: coordinator.id,
        },
      });

      return reply.status(201).send({ id: user.id });
    },
  );

  fastify.put<{ Params: { id: string }; Body: UpdateLeaderRequest }>(
    '/leaders/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { id } = request.params;

      const existing = await prisma.user.findFirst({
        where: { id, role: Role.LEADER },
      });

      if (!existing) return reply.status(404).send({ message: 'Líder não encontrado' });

      const body = request.body || {};
      const updateData: Record<string, unknown> = {};

      if (body.firstName !== undefined) updateData.firstName = sanitizeString(body.firstName);
      if (body.lastName !== undefined) updateData.lastName = sanitizeString(body.lastName);
      if (body.phone !== undefined) updateData.phone = body.phone.replace(/\D/g, '');
      if (body.address !== undefined) updateData.address = sanitizeString(body.address);
      if (body.city !== undefined) updateData.city = sanitizeString(body.city);
      if (body.state !== undefined) updateData.state = body.state.trim().toUpperCase();
      if (body.neighborhood !== undefined) updateData.neighborhood = sanitizeString(body.neighborhood);

      if (body.firstName !== undefined || body.lastName !== undefined) {
        const newFirst = (updateData.firstName as string) ?? existing.firstName;
        const newLast = (updateData.lastName as string) ?? existing.lastName;
        await prisma.user.update({ where: { id }, data: { leaderSlug: null } });
        updateData.leaderSlug = await generateUniqueLeaderSlug(newFirst, newLast);
      }

      await prisma.user.update({
        where: { id },
        data: updateData,
      });

      return reply.send({ success: true });
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/leaders/:id/deactivate',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { id } = request.params;

      const existing = await prisma.user.findFirst({
        where: { id, role: Role.LEADER },
      });

      if (!existing) return reply.status(404).send({ message: 'Líder não encontrado' });

      // Admin deactivates leader by removing slug exactly like coordinator does
      // To activate, we generate a new slug
      if (existing.leaderSlug) {
        await prisma.user.update({
          where: { id },
          data: { leaderSlug: null },
        });
        return reply.send({ success: true, message: 'Líder desativado com sucesso' });
      } else {
        const newSlug = await generateUniqueLeaderSlug(existing.firstName, existing.lastName);
        await prisma.user.update({
          where: { id },
          data: { leaderSlug: newSlug },
        });
        return reply.send({ success: true, message: 'Líder ativado com sucesso' });
      }
    },
  );
}
