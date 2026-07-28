import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { CampaignStatus, Prisma } from '@prisma/client';
import { Role } from '@platform/types';
import { generateSlug, parsePagination, sanitizeString } from '@platform/utils';
import { prisma } from '../lib/prisma';

const reservedSlugs = new Set([
  'admin',
  'api',
  'auth',
  'dashboard',
  'login',
  'public',
  'super-admin',
]);

interface CampaignAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

interface CreateCampaignBody {
  name: string;
  slug?: string;
  candidateName?: string;
  party?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  whatsappNumber?: string;
  status?: CampaignStatus;
  admin?: CampaignAdminInput;
}

interface UpdateCampaignBody {
  name?: string;
  slug?: string;
  candidateName?: string;
  party?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  whatsappNumber?: string | null;
}

function normalizeSlug(value: string) {
  return generateSlug(value.trim(), '');
}

function validateAdminInput(admin: CampaignAdminInput) {
  if (!admin.firstName?.trim() || !admin.lastName?.trim()) return 'Nome do administrador é obrigatório';
  if (!admin.email?.trim() || !admin.email.includes('@')) return 'E-mail do administrador é inválido';
  if (!admin.password || admin.password.length < 8) return 'A senha deve ter pelo menos 8 caracteres';
  return null;
}

async function campaignAdminData(admin: CampaignAdminInput, campaignId: string) {
  return {
    email: admin.email.trim().toLowerCase(),
    password: await bcrypt.hash(admin.password, 12),
    firstName: sanitizeString(admin.firstName),
    lastName: sanitizeString(admin.lastName),
    cpf: `SA-${randomUUID()}`,
    phone: admin.phone?.replace(/\D/g, '') || '',
    address: '',
    city: '',
    state: '',
    role: Role.ADMIN,
    campaignId,
  };
}

export async function superAdminRoutes(fastify: FastifyInstance) {
  const onlySuperAdmin = [fastify.authenticate, fastify.authorize(Role.SUPER_ADMIN)];

  fastify.get('/dashboard', { preHandler: onlySuperAdmin }, async (_request, reply) => {
    const [
      totalCampaigns,
      activeCampaigns,
      unavailableCampaigns,
      totalUsers,
      totalAdmins,
      totalLeaders,
      totalSupporters,
      totalPosts,
      totalEvents,
      totalLives,
      recentCampaigns,
      statusDistribution,
      supporterGroups,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE } }),
      prisma.campaign.count({ where: { status: { in: [CampaignStatus.INACTIVE, CampaignStatus.SUSPENDED] } } }),
      prisma.user.count({ where: { campaignId: { not: null } } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.user.count({ where: { role: Role.LEADER } }),
      prisma.user.count({ where: { role: Role.USER } }),
      prisma.post.count(),
      prisma.event.count(),
      prisma.live.count(),
      prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, slug: true, status: true, createdAt: true },
      }),
      prisma.campaign.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.user.groupBy({
        by: ['campaignId'],
        where: { role: Role.USER, campaignId: { not: null } },
        _count: { campaignId: true },
        orderBy: { _count: { campaignId: 'desc' } },
        take: 5,
      }),
    ]);

    const supporterCampaignIds = supporterGroups.flatMap((item) => item.campaignId ? [item.campaignId] : []);
    const supporterCampaigns = await prisma.campaign.findMany({
      where: { id: { in: supporterCampaignIds } },
      select: { id: true, name: true, slug: true },
    });

    return reply.send({
      totalCampaigns,
      activeCampaigns,
      unavailableCampaigns,
      totalUsers,
      totalAdmins,
      totalLeaders,
      totalSupporters,
      totalPosts,
      totalEvents,
      totalLives,
      recentCampaigns,
      statusDistribution,
      topCampaignsBySupporters: supporterGroups.map((item) => ({
        campaign: supporterCampaigns.find((campaign) => campaign.id === item.campaignId),
        supporters: item._count.campaignId,
      })),
    });
  });

  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      status?: CampaignStatus;
      sort?: 'createdAt' | 'name';
      order?: 'asc' | 'desc';
    };
  }>('/campaigns', { preHandler: onlySuperAdmin }, async (request, reply) => {
    const { page, limit, skip } = parsePagination(request.query);
    const search = request.query.search?.trim();
    const status = Object.values(CampaignStatus).includes(request.query.status as CampaignStatus)
      ? request.query.status
      : undefined;
    const sort = request.query.sort === 'name' ? 'name' : 'createdAt';
    const order = request.query.order === 'asc' ? 'asc' : 'desc';
    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { [sort]: order },
        skip,
        take: limit,
        include: {
          _count: { select: { users: true, posts: true, events: true, lives: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);
    const campaignIds = campaigns.map((campaign) => campaign.id);
    const roleCounts = await prisma.user.groupBy({
      by: ['campaignId', 'role'],
      where: { campaignId: { in: campaignIds } },
      _count: { role: true },
    });

    return reply.send({
      data: campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        users: campaign._count.users,
        admins: roleCounts.find((r) => r.campaignId === campaign.id && r.role === Role.ADMIN)?._count.role || 0,
        leaders: roleCounts.find((r) => r.campaignId === campaign.id && r.role === Role.LEADER)?._count.role || 0,
        supporters: roleCounts.find((r) => r.campaignId === campaign.id && r.role === Role.USER)?._count.role || 0,
        posts: campaign._count.posts,
        events: campaign._count.events,
        lives: campaign._count.lives,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.post<{ Body: CreateCampaignBody }>(
    '/campaigns',
    { preHandler: onlySuperAdmin },
    async (request, reply) => {
      const body = request.body || ({} as CreateCampaignBody);
      const name = sanitizeString(body.name || '');
      const slug = normalizeSlug(body.slug || name);
      if (!name || !slug) return reply.status(400).send({ message: 'Nome e slug são obrigatórios' });
      if (reservedSlugs.has(slug)) return reply.status(400).send({ message: 'Slug reservado' });
      if (body.status && !Object.values(CampaignStatus).includes(body.status)) {
        return reply.status(400).send({ message: 'Status inválido' });
      }
      if (body.admin) {
        const error = validateAdminInput(body.admin);
        if (error) return reply.status(400).send({ message: error });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const campaign = await tx.campaign.create({
            data: {
              name,
              slug,
              candidateName: sanitizeString(body.candidateName || name),
              party: body.party?.trim() || null,
              logoUrl: body.logoUrl?.trim() || null,
              primaryColor: body.primaryColor?.trim() || null,
              secondaryColor: body.secondaryColor?.trim() || null,
              whatsappNumber: body.whatsappNumber?.replace(/\D/g, '') || null,
              status: body.status || CampaignStatus.ACTIVE,
            },
          });
          const admin = body.admin
            ? await tx.user.create({
                data: await campaignAdminData(body.admin, campaign.id),
                select: { id: true, email: true, firstName: true, lastName: true },
              })
            : null;
          return { campaign, admin };
        });
        return reply.status(201).send(result);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return reply.status(409).send({ message: 'Slug ou e-mail já cadastrado' });
        }
        throw error;
      }
    },
  );

  fastify.get<{ Params: { campaignId: string } }>(
    '/campaigns/:campaignId',
    { preHandler: onlySuperAdmin },
    async (request, reply) => {
      const campaign = await prisma.campaign.findUnique({
        where: { id: request.params.campaignId },
        include: {
          _count: { select: { users: true, posts: true, events: true, lives: true, notifications: true } },
          users: {
            where: { role: Role.ADMIN },
            select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
          },
        },
      });
      if (!campaign) return reply.status(404).send({ message: 'Campanha não encontrada' });
      return reply.send(campaign);
    },
  );

  fastify.patch<{ Params: { campaignId: string }; Body: UpdateCampaignBody }>(
    '/campaigns/:campaignId',
    { preHandler: onlySuperAdmin },
    async (request, reply) => {
      const existing = await prisma.campaign.findUnique({ where: { id: request.params.campaignId } });
      if (!existing) return reply.status(404).send({ message: 'Campanha não encontrada' });
      const body = request.body || {};
      const slug = body.slug === undefined ? undefined : normalizeSlug(body.slug);
      if (slug !== undefined && (!slug || reservedSlugs.has(slug))) {
        return reply.status(400).send({ message: 'Slug inválido ou reservado' });
      }
      try {
        const campaign = await prisma.campaign.update({
          where: { id: existing.id },
          data: {
            ...(body.name !== undefined && { name: sanitizeString(body.name) }),
            ...(slug !== undefined && { slug }),
            ...(body.candidateName !== undefined && { candidateName: sanitizeString(body.candidateName) }),
            ...(body.party !== undefined && { party: body.party?.trim() || null }),
            ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl?.trim() || null }),
            ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor?.trim() || null }),
            ...(body.secondaryColor !== undefined && { secondaryColor: body.secondaryColor?.trim() || null }),
            ...(body.whatsappNumber !== undefined && {
              whatsappNumber: body.whatsappNumber?.replace(/\D/g, '') || null,
            }),
          },
        });
        return reply.send(campaign);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return reply.status(409).send({ message: 'Slug já cadastrado' });
        }
        throw error;
      }
    },
  );

  fastify.patch<{ Params: { campaignId: string }; Body: { status: CampaignStatus } }>(
    '/campaigns/:campaignId/status',
    { preHandler: onlySuperAdmin },
    async (request, reply) => {
      if (!Object.values(CampaignStatus).includes(request.body?.status)) {
        return reply.status(400).send({ message: 'Status inválido' });
      }
      const existing = await prisma.campaign.findUnique({ where: { id: request.params.campaignId } });
      if (!existing) return reply.status(404).send({ message: 'Campanha não encontrada' });
      const campaign = await prisma.campaign.update({
        where: { id: existing.id },
        data: { status: request.body.status },
      });
      return reply.send({ id: campaign.id, status: campaign.status });
    },
  );

  fastify.post<{ Params: { campaignId: string }; Body: CampaignAdminInput }>(
    '/campaigns/:campaignId/admins',
    { preHandler: onlySuperAdmin },
    async (request, reply) => {
      const campaign = await prisma.campaign.findUnique({ where: { id: request.params.campaignId } });
      if (!campaign) return reply.status(404).send({ message: 'Campanha não encontrada' });
      const body = request.body || ({} as CampaignAdminInput);
      const error = validateAdminInput(body);
      if (error) return reply.status(400).send({ message: error });
      try {
        const admin = await prisma.user.create({
          data: await campaignAdminData(body, campaign.id),
          select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
        });
        return reply.status(201).send(admin);
      } catch (createError) {
        if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === 'P2002') {
          return reply.status(409).send({ message: 'E-mail já cadastrado' });
        }
        throw createError;
      }
    },
  );
}
