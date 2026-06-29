import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@platform/types';
import { Role } from '@platform/types';
import {
  isValidSlug,
  normalizeRegisterInput,
  sanitizeString,
  validateRegisterInput,
} from '@platform/utils';
import { prisma } from '../lib/prisma';
import { toUserPublic } from '../lib/user-mapper';
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
    });

    if (!user) {
      return reply.status(401).send({ message: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return reply.status(401).send({ message: 'Credenciais inválidas' });
    }

    const token = fastify.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const response: AuthResponse = {
      token,
      user: toUserPublic(user),
    };

    return reply.send(response);
  });

  fastify.post<{ Body: RegisterRequest }>('/register', authRateLimit, async (request, reply) => {
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

    if (sanitized.leaderSlug) {
      if (!isValidSlug(sanitized.leaderSlug)) {
        return reply.status(400).send({ message: 'Link de líder inválido' });
      }

      const leader = await prisma.user.findFirst({
        where: { leaderSlug: sanitized.leaderSlug, role: Role.LEADER },
      });

      if (!leader) {
        return reply.status(404).send({ message: 'Líder não encontrado' });
      }

      leaderId = leader.id;
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
      },
    });

    // Enviar mensagem de confirmação do WhatsApp (assíncrono)
    whatsappService.sendConfirmationMessage(user).catch(err => {
      fastify.log.error('Erro ao chamar whatsappService:', err);
    });

    const token = fastify.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const response: AuthResponse = {
      token,
      user: toUserPublic(user),
    };

    return reply.status(201).send(response);
  });

  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
      });

      if (!user) {
        return reply.status(404).send({ message: 'Usuário não encontrado' });
      }

      return reply.send(toUserPublic(user));
    },
  );
}
