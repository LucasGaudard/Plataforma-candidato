import bcrypt from 'bcryptjs';
import { CityZone as PrismaCityZone } from '@prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
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
  isValidCityZone,
} from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toEventPublic, toLivePublic, toPostPublic } from '../lib/mappers';
import { whatsappLogStore } from '../lib/whatsapp-log';
import { generateUniqueCoordinatorSlug } from '../lib/coordinator-slug';

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

const managedUserIdPattern = /^[A-Za-z0-9_-]{10,64}$/;

async function deleteManagedUser(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
  role: typeof Role.LEADER | typeof Role.COORDINATOR,
) {
  const { id } = request.params;
  const roleLabel = role === Role.LEADER ? 'Líder' : 'Coordenador';

  if (!managedUserIdPattern.test(id)) {
    return reply.status(400).send({ message: 'ID de usuário inválido.' });
  }
  if (id === request.user.sub) {
    return reply.status(403).send({ message: 'Você não pode excluir sua própria conta.' });
  }

  const user = await prisma.user.findFirst({
    where: { id, role, campaignId: request.user.campaignId },
    select: {
      id: true,
      _count: { select: { posts: true, events: true, lives: true, notifications: true } },
    },
  });
  if (!user) return reply.status(404).send({ message: `${roleLabel} não encontrado.` });

  const dependencyDefinitions = [
    { type: 'posts', label: 'publicações', count: user._count.posts },
    { type: 'events', label: 'eventos', count: user._count.events },
    { type: 'lives', label: 'lives', count: user._count.lives },
    { type: 'notifications', label: 'notificações', count: user._count.notifications },
  ] as const;
  const dependencies = dependencyDefinitions.filter((dependency) => dependency.count > 0);

  if (dependencies.length > 0) {
    return reply.status(409).send({
      message: `Não foi possível excluir o ${roleLabel.toLowerCase()}. Transfira ou remova os registros vinculados antes de tentar novamente.`,
      dependencies,
    });
  }

  try {
    const unlinked = await prisma.$transaction(async (tx) => {
      const leaders = role === Role.COORDINATOR
        ? await tx.user.updateMany({ where: { coordinatorId: id }, data: { coordinatorId: null } })
        : { count: 0 };
      const supporters = role === Role.LEADER
        ? await tx.user.updateMany({ where: { leaderId: id }, data: { leaderId: null } })
        : { count: 0 };
      await tx.user.delete({ where: { id } });
      return { leaders: leaders.count, supporters: supporters.count };
    });

    return reply.send({ success: true, message: `${roleLabel} excluído permanentemente.`, unlinked });
  } catch (error) {
    fastify.log.error({ err: error, userId: id, role }, 'Falha ao excluir usuário gerenciado');
    return reply.status(500).send({ message: 'Não foi possível concluir a exclusão. Tente novamente.' });
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.split('?')[0].startsWith('/admin/whatsapp/')) {
      return reply.status(410).send({
        message: 'Endpoint legado removido; use /campaign/whatsapp',
      });
    }
  });

  fastify.get(
    '/dashboard',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const campaignId = request.user.campaignId;
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
        prisma.user.count({ where: { role: Role.LEADER, campaignId } }),
        prisma.user.count({ where: { role: Role.USER, campaignId } }),
        prisma.post.count({ where: { published: true, campaignId } }),
        prisma.event.count({ where: { published: true, campaignId } }),
        prisma.live.count({ where: { published: true, campaignId } }),
        prisma.user.count({
          where: { role: Role.USER, campaignId, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.user.findMany({
          where: { role: Role.LEADER, campaignId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            leaderSlug: true,
            _count: { select: { supporters: { where: { campaignId } } } },
            supporters: {
              where: { campaignId, createdAt: { gte: sevenDaysAgo } },
              select: { id: true },
            },
          },
          orderBy: { firstName: 'asc' },
        }),
        prisma.user.findMany({
          where: { role: Role.USER, campaignId, createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.user.groupBy({
          by: ['status'],
          where: { role: Role.USER, campaignId },
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
    async (request, reply) => {
      const posts = await prisma.post.findMany({
        where: { campaignId: request.user.campaignId },
        include: { author: { select: authorSelect } },
        orderBy: { publishedAt: 'desc' },
      });
      return reply.send(posts.map(toPostPublic));
    },
  );

  fastify.get(
    '/events',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const events = await prisma.event.findMany({
        where: { campaignId: request.user.campaignId },
        include: { author: { select: authorSelect } },
        orderBy: { date: 'asc' },
      });
      return reply.send(events.map(toEventPublic));
    },
  );

  fastify.get(
    '/lives',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const lives = await prisma.live.findMany({
        where: { campaignId: request.user.campaignId },
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
      zone?: string;
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
      const zone = request.query.zone?.trim();
      if (zone && !isValidCityZone(zone)) return reply.status(400).send({ message: 'Zona inválida.' });

      const where = {
        role: Role.USER,
        campaignId: request.user.campaignId,
        ...(leaderId
          ? {
              leaderId,
              leader: { campaignId: request.user.campaignId },
            }
          : {}),
        ...(coordinatorId
          ? {
              coordinatorId,
              coordinator: { campaignId: request.user.campaignId },
            }
          : {}),
        ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
        ...(state ? { state } : {}),
        ...(request.query.neighborhood ? { neighborhood: { contains: request.query.neighborhood.trim(), mode: 'insensitive' as const } } : {}),
        ...(zone ? { zone: zone as PrismaCityZone } : {}),
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
            leader: { select: { firstName: true, lastName: true, campaignId: true } },
            coordinator: { select: { firstName: true, lastName: true, campaignId: true } },
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
        zone: u.zone,
        status: u.status as SupporterStatus,
        whatsappStatus: u.whatsappStatus as WhatsappStatus,
        createdAt: u.createdAt.toISOString(),
        leaderName:
          u.leader?.campaignId === request.user.campaignId
            ? `${u.leader.firstName} ${u.leader.lastName}`
            : undefined,
        coordinatorName:
          u.coordinator?.campaignId === request.user.campaignId
            ? `${u.coordinator.firstName} ${u.coordinator.lastName}`
            : undefined,
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
        where: { id, role: Role.USER, campaignId: request.user.campaignId },
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
      zone?: string;
    };
  }>(
    '/communication/recipients/count',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { verifiedOnly, coordinatorId, leaderId, city, state, neighborhood, zone } = request.query;
      if (zone && !isValidCityZone(zone)) return reply.status(400).send({ message: 'Zona inválida.' });

      const count = await prisma.user.count({
        where: {
          role: Role.USER,
          campaignId: request.user.campaignId,
          ...(verifiedOnly === 'true' ? { status: SupporterStatus.VERIFIED } : {}),
          ...(leaderId
            ? {
                leaderId,
                leader: { campaignId: request.user.campaignId },
              }
            : coordinatorId
              ? {
                  coordinatorId,
                  coordinator: { campaignId: request.user.campaignId },
                }
              : {}),
          ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
          ...(state ? { state: state.toUpperCase() } : {}),
          ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' as const } } : {}),
          ...(zone ? { zone: zone as PrismaCityZone } : {}),
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

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            _count: {
              select: {
                leaders: { where: { campaignId: request.user.campaignId } },
              },
            },
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
            where: {
              role: Role.USER,
              campaignId: request.user.campaignId,
              coordinatorId: u.id,
            },
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
            zone: u.zone,
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
      const coordinatorSlug = await generateUniqueCoordinatorSlug(normalized.firstName, normalized.lastName);

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
          zone: normalized.zone,
          role: Role.COORDINATOR,
          campaignId: request.user.campaignId,
          coordinatorSlug,
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
        where: {
          id,
          role: Role.COORDINATOR,
          campaignId: request.user.campaignId,
        },
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
      if (body.neighborhood !== undefined) {
        const neighborhood = sanitizeString(body.neighborhood);
        if (neighborhood.length > 100) return reply.status(400).send({ message: 'Bairro deve ter no máximo 100 caracteres.' });
        updateData.neighborhood = neighborhood;
      }
      if (body.zone !== undefined) {
        if (body.zone !== null && !isValidCityZone(body.zone)) return reply.status(400).send({ message: 'Zona inválida.' });
        updateData.zone = body.zone;
      }

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
        where: {
          id,
          role: Role.COORDINATOR,
          campaignId: request.user.campaignId,
        },
      });

      if (!existing) return reply.status(404).send({ message: 'Coordenador não encontrado' });

      // Desativar coordenador: muda o status para INVALID e bloqueia acesso
      const isActive = existing.status !== SupporterStatus.INVALID;
      const newStatus = isActive ? SupporterStatus.INVALID : SupporterStatus.VERIFIED;
      const coordinatorSlug = isActive
        ? null
        : await generateUniqueCoordinatorSlug(existing.firstName, existing.lastName);

      await prisma.user.update({
        where: { id },
        data: { status: newStatus, coordinatorSlug },
      });

      return reply.send({ success: true, message: `Coordenador ${isActive ? 'desativado' : 'ativado'}` });
    },
  );

  // ─────────────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/coordinators/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => deleteManagedUser(fastify, request, reply, Role.COORDINATOR),
  );

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
        campaignId: request.user.campaignId,
        ...(coordinatorId
          ? {
              coordinatorId,
              coordinator: { campaignId: request.user.campaignId },
            }
          : {}),
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
            coordinator: {
              select: { firstName: true, lastName: true, campaignId: true },
            },
            _count: {
              select: {
                supporters: { where: { campaignId: request.user.campaignId } },
              },
            },
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
        zone: u.zone,
        active: !!u.leaderSlug, // If leaderSlug is null, leader is inactive
        supportersCount: u._count.supporters,
        coordinatorId: u.coordinatorId || '',
        coordinatorName:
          u.coordinator?.campaignId === request.user.campaignId
            ? `${u.coordinator.firstName} ${u.coordinator.lastName}`
            : '',
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

      const coordinatorId = body.coordinatorId?.trim() || null;
      if (coordinatorId) {
        const coordinator = await prisma.user.findFirst({
          where: { id: coordinatorId, role: Role.COORDINATOR, campaignId: request.user.campaignId },
          select: { id: true },
        });
        if (!coordinator) return reply.status(404).send({ message: 'Coordenador não encontrado.' });
      }

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
          zone: normalized.zone,
          role: Role.LEADER,
          leaderSlug,
          coordinatorId,
          campaignId: request.user.campaignId,
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
        where: {
          id,
          role: Role.LEADER,
          campaignId: request.user.campaignId,
        },
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
      if (body.neighborhood !== undefined) {
        const neighborhood = sanitizeString(body.neighborhood);
        if (neighborhood.length > 100) return reply.status(400).send({ message: 'Bairro deve ter no máximo 100 caracteres.' });
        updateData.neighborhood = neighborhood;
      }
      if (body.zone !== undefined) {
        if (body.zone !== null && !isValidCityZone(body.zone)) return reply.status(400).send({ message: 'Zona inválida.' });
        updateData.zone = body.zone;
      }

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
        where: {
          id,
          role: Role.LEADER,
          campaignId: request.user.campaignId,
        },
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

  fastify.delete<{ Params: { id: string } }>(
    '/leaders/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => deleteManagedUser(fastify, request, reply, Role.LEADER),
  );

  // WhatsApp config status — nunca expõe valores de tokens
  fastify.get(
    '/whatsapp/config-status',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (_request, reply) => {
      const enabled = process.env.WHATSAPP_ENABLED === 'true';
      const hasAccessToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
      const hasPhoneNumberId = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);
      const hasBusinessAccountId = Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID);
      const hasVerifyToken = Boolean(process.env.WHATSAPP_VERIFY_TOKEN);
      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v19.0';
      const apiUrl = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || 'https://SUA-API.onrender.com';
      const webhookUrl = `${apiUrl}/webhooks/whatsapp`;

      const allTokensPresent = hasAccessToken && hasPhoneNumberId && hasBusinessAccountId && hasVerifyToken;
      let mode: 'simulation' | 'ready' | 'incomplete';
      if (!enabled) {
        mode = 'simulation';
      } else if (allTokensPresent) {
        mode = 'ready';
      } else {
        mode = 'incomplete';
      }

      return reply.send({
        enabled,
        hasAccessToken,
        hasPhoneNumberId,
        hasBusinessAccountId,
        hasVerifyToken,
        apiVersion,
        webhookUrl,
        mode,
      });
    },
  );

  fastify.get(
    '/whatsapp/test-status',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (_request, reply) => {
      return reply.send(whatsappLogStore.getState());
    },
  );

  fastify.post(
    '/whatsapp/test-connection',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (_request, reply) => {
      const token = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const version = process.env.WHATSAPP_API_VERSION || 'v19.0';
      
      if (!token || !phoneId) {
        whatsappLogStore.updateConnectionTest(false, { error: 'Credenciais ausentes' });
        return reply.status(400).send({ success: false, message: 'Credenciais ausentes' });
      }

      try {
        const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (!response.ok) {
          whatsappLogStore.updateConnectionTest(false, data);
          return reply.status(400).send({ success: false, message: (data as any).error?.message || 'Erro na Meta API' });
        }
        
        whatsappLogStore.updateConnectionTest(true, data);
        return reply.send({ success: true, data });
      } catch (error) {
        whatsappLogStore.updateConnectionTest(false, { error: (error as Error).message });
        return reply.status(500).send({ success: false, message: (error as Error).message });
      }
    },
  );

  fastify.post(
    '/whatsapp/test-message',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { phone } = request.body as { phone: string };
      if (!phone) return reply.status(400).send({ success: false, message: 'Telefone obrigatório' });

      const enabled = process.env.WHATSAPP_ENABLED === 'true';
      if (!enabled) {
        whatsappLogStore.updateMessageTest(true, phone);
        return reply.send({ success: true, message: 'Simulação: Mensagem enviada com sucesso.' });
      }

      const token = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const version = process.env.WHATSAPP_API_VERSION || 'v19.0';

      if (!token || !phoneId) {
        whatsappLogStore.updateMessageTest(false, phone);
        return reply.status(400).send({ success: false, message: 'Credenciais ausentes' });
      }

      try {
        const sanitizedPhone = phone.replace(/\D/g, '');
        const to = sanitizedPhone.startsWith('55') ? sanitizedPhone : `55${sanitizedPhone}`;
        
        const payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: `[TESTE] Olá! Esta é uma mensagem de teste da sua plataforma.`,
          },
        };

        const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          whatsappLogStore.updateMessageTest(false, phone);
          return reply.status(400).send({ success: false, message: (data as any).error?.message || 'Erro ao enviar' });
        }

        whatsappLogStore.updateMessageTest(true, phone);
        return reply.send({ success: true, message: 'Mensagem real enviada com sucesso' });
      } catch (error) {
        whatsappLogStore.updateMessageTest(false, phone);
        return reply.status(500).send({ success: false, message: (error as Error).message });
      }
    },
  );

  fastify.post(
    '/whatsapp/test-webhook',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (request, reply) => {
      const { phone } = request.body as { phone: string };
      
      const payload = {
        object: "whatsapp_business_account",
        entry: [{
          id: "TEST_ENTRY_ID",
          changes: [{
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "5511999999999",
                phone_number_id: "TEST_PHONE_ID"
              },
              contacts: [{
                profile: { name: "Test User" },
                wa_id: phone || "5511999999999"
              }],
              messages: [{
                from: phone || "5511999999999",
                id: "wamid.TEST_MSG_ID",
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: { body: "SIM" },
                type: "text"
              }]
            },
            field: "messages"
          }]
        }]
      };

      try {
        const injectResponse = await fastify.inject({
          method: 'POST',
          url: '/webhooks/whatsapp',
          payload
        });

        if (injectResponse.statusCode === 200) {
          whatsappLogStore.updateWebhookTest(true);
          return reply.send({ success: true, message: 'Webhook processado com sucesso' });
        } else {
          whatsappLogStore.updateWebhookTest(false);
          return reply.status(400).send({ success: false, message: `Erro no webhook: ${injectResponse.statusCode}` });
        }
      } catch (error) {
        whatsappLogStore.updateWebhookTest(false);
        return reply.status(500).send({ success: false, message: (error as Error).message });
      }
    },
  );
}
