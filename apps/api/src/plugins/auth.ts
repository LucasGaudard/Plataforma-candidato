import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Role } from '@platform/types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (...roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerAuth(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Token inválido ou expirado' });
    }
  });

  fastify.decorate('authorize', (...roles: Role[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user || !roles.includes(user.role)) {
        return reply.status(403).send({ message: 'Acesso negado' });
      }
    };
  });
}
