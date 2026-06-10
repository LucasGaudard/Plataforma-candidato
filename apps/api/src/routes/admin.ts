import type { FastifyInstance } from 'fastify';
import type { AdminDashboard } from '@platform/types';
import { Role } from '@platform/types';
import { prisma } from '../lib/prisma';

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/dashboard',
    { preHandler: [fastify.authenticate, fastify.authorize(Role.ADMIN)] },
    async (_request, reply) => {
      const [totalLeaders, totalSupporters, leaders] = await Promise.all([
        prisma.user.count({ where: { role: Role.LEADER } }),
        prisma.user.count({ where: { role: Role.USER } }),
        prisma.user.findMany({
          where: { role: Role.LEADER },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            leaderSlug: true,
            _count: { select: { supporters: true } },
          },
          orderBy: { firstName: 'asc' },
        }),
      ]);

      const dashboard: AdminDashboard = {
        totalLeaders,
        totalSupporters,
        supportersByLeader: leaders.map((leader) => ({
          leaderId: leader.id,
          leaderName: `${leader.firstName} ${leader.lastName}`,
          leaderSlug: leader.leaderSlug || '',
          count: leader._count.supporters,
        })),
      };

      return reply.send(dashboard);
    },
  );
}
