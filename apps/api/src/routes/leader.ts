import type { FastifyInstance } from 'fastify';
import type { LeaderDashboard } from '@platform/types';
import { Role } from '@platform/types';
import { prisma } from '../lib/prisma';
import { toUserPublic } from '../lib/user-mapper';

export async function leaderRoutes(fastify: FastifyInstance) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  fastify.get(
    '/dashboard',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.LEADER)] },
    async (request, reply) => {
      const leader = await prisma.user.findUnique({
        where: { id: request.user.sub },
        include: {
          supporters: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!leader || !leader.leaderSlug) {
        return reply.status(404).send({ message: 'Líder não encontrado' });
      }

      const dashboard: LeaderDashboard = {
        totalSupporters: leader.supporters.length,
        leaderSlug: leader.leaderSlug,
        referralLink: `${frontendUrl}/lider/${leader.leaderSlug}`,
        supporters: leader.supporters.map(toUserPublic),
      };

      return reply.send(dashboard);
    },
  );

  fastify.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const leader = await prisma.user.findFirst({
      where: { leaderSlug: slug, role: Role.LEADER },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        leaderSlug: true,
      },
    });

    if (!leader) {
      return reply.status(404).send({ message: 'Líder não encontrado' });
    }

    return reply.send({
      id: leader.id,
      firstName: leader.firstName,
      lastName: leader.lastName,
      leaderSlug: leader.leaderSlug,
    });
  });
}
