import type { FastifyInstance } from 'fastify';
import type { AdminDashboard } from '@platform/types';
import { Role } from '@platform/types';
import { prisma } from '../lib/prisma';
import { toEventPublic, toLivePublic, toPostPublic } from '../lib/mappers';

const authorSelect = { firstName: true, lastName: true };

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
}
