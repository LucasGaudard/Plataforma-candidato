import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';

export async function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return reply.status(503).send({
        message: 'Banco de dados indisponível. Verifique DATABASE_URL e se o PostgreSQL está rodando.',
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ message: 'Registro duplicado' });
      }
    }

    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      message: error.message || 'Erro interno do servidor',
    });
  });
}
