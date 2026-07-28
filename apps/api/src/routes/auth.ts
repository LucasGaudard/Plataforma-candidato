import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@platform/types';
import { Role } from '@platform/types';
import { CampaignStatus } from '@prisma/client';
import {
  isValidSlug,
  normalizeRegisterInput,
  sanitizeString,
  validateRegisterInput,
} from '@platform/utils';
import { prisma } from '../lib/prisma';
import { resolveActivePublicCampaign } from '../lib/public-campaign';
import { toAuthenticatedUserPublic } from '../lib/user-mapper';
import { whatsappService } from '../services/whatsapp.service';

const authRateLimit = {
  config: {
    rateLimit: { max: 10, timeWindow: '1 minute' },
  },
};

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: LoginRequest }>('/login', authRateLimit, async (request, reply) => {
    const { email, password } = request.body || {};

    if (!email?.trim() || !password) {
      return reply.status(400).send({ message: 'E-mail e senha são obrigatórios' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { campaign: true },
    });

    if (!user) {
      return reply.status(401).send({ message: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return reply.status(401).send({ message: 'Credenciais inválidas' });
    }

    const isSuperAdmin = user.role === Role.SUPER_ADMIN;

    if (isSuperAdmin && user.campaignId !== null) {
      return reply.status(403).send({ message: 'Acesso indisponível' });
    }

    if (!isSuperAdmin && (!user.campaign || user.campaign.status !== CampaignStatus.ACTIVE)) {
      return reply.status(403).send({ message: 'Acesso indisponível' });
    }

    const token = fastify.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      campaignId: user.campaignId as string,
    });

    const response: AuthResponse = {
      token,
      user: toAuthenticatedUserPublic(user),
    };

    return reply.send(response);
  });

  fastify.post('/register', authRateLimit, async (_request, reply) => {
    return reply.status(404).send({
      message: 'Campanha não encontrada',
    });
  });

  fastify.post<{ Params: { campaignSlug: string }; Body: RegisterRequest }>(
    '/register/:campaignSlug',
    authRateLimit,
    async (request, reply) => {
    const campaign = await resolveActivePublicCampaign(request.params.campaignSlug);
    if (!campaign) {
      return reply.status(404).send({ message: 'Campanha não encontrada' });
    }

    const body = request.body || ({} as RegisterRequest);
    const sanitized: RegisterRequest = {
      ...body,
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
      leaderSlug: body.leaderSlug,
    };
    const normalized = normalizeRegisterInput(sanitized);
    const validation = validateRegisterInput(normalized);

    if (!validation.valid) {
      return reply.status(400).send({
        message: 'Dados inválidos',
        errors: validation.errors,
      });
    }

    let leaderId: string | undefined;
    let coordinatorId: string | undefined;

    if (sanitized.leaderSlug) {
      if (!isValidSlug(sanitized.leaderSlug)) {
        return reply.status(400).send({ message: 'Link de líder inválido' });
      }

      const leader = await prisma.user.findFirst({
        where: {
          leaderSlug: sanitized.leaderSlug,
          role: Role.LEADER,
          campaignId: campaign.id,
        },
      });

      if (!leader) {
        return reply.status(404).send({ message: 'Líder não encontrado' });
      }

      leaderId = leader.id;
      coordinatorId = leader.coordinatorId ?? undefined;
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: normalized.email },
    });
    if (existingEmail) {
      return reply.status(409).send({ message: 'E-mail já cadastrado' });
    }

    const existingCpf = await prisma.user.findUnique({
      where: { cpf: normalized.cpf },
    });
    if (existingCpf) {
      return reply.status(409).send({ message: 'CPF já cadastrado' });
    }

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
        role: Role.USER,
        leaderId,
        coordinatorId,
        campaignId: campaign.id,
      },
      include: { campaign: true },
    });

    // Enviar mensagem de confirmação do WhatsApp (assíncrono)
    whatsappService.sendConfirmationMessage(user).catch(err => {
      fastify.log.error('Erro ao chamar whatsappService:', err);
    });

    if (!user.campaign || user.campaign.status !== CampaignStatus.ACTIVE) {
      return reply.status(403).send({ message: 'Acesso indisponível' });
    }

    const token = fastify.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      campaignId: user.campaignId as string,
    });

    const response: AuthResponse = {
      token,
      user: toAuthenticatedUserPublic(user),
    };

    return reply.status(201).send(response);
    },
  );

  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = await prisma.user.findFirst({
        where:
          request.user.role === Role.SUPER_ADMIN
            ? { id: request.user.sub, role: Role.SUPER_ADMIN, campaignId: null }
            : { id: request.user.sub, campaignId: request.user.campaignId },
        include: { campaign: true },
      });

      if (!user) {
        return reply.status(404).send({ message: 'Usuário não encontrado' });
      }

      if (
        user.role !== Role.SUPER_ADMIN &&
        (!user.campaign || user.campaign.status !== CampaignStatus.ACTIVE)
      ) {
        return reply.status(403).send({ message: 'Acesso indisponível' });
      }

      return reply.send(toAuthenticatedUserPublic(user));
    },
  );
}
