import type { FastifyInstance } from 'fastify';
import type { CampaignContent } from '@platform/types';
import { Role } from '@platform/types';
import { prisma } from '../lib/prisma';
import { campaignContentSelect, normalizeCampaignContent, toCampaignContent } from '../lib/campaign-content';

export async function campaignRoutes(fastify: FastifyInstance) {
  const adminOnly = [fastify.authenticate, fastify.authorize(Role.ADMIN)];

  fastify.get('/content', { preHandler: adminOnly }, async (request, reply) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: request.user.campaignId },
      select: campaignContentSelect,
    });
    if (!campaign) return reply.status(404).send({ message: 'Campanha não encontrada' });
    return reply.send(toCampaignContent(campaign));
  });

  fastify.patch<{ Body: Partial<CampaignContent> }>(
    '/content',
    { preHandler: adminOnly },
    async (request, reply) => {
      let data;
      try { data = normalizeCampaignContent(request.body || {}); }
      catch (error) { return reply.status(400).send({ message: (error as Error).message }); }
      const campaign = await prisma.campaign.update({
        where: { id: request.user.campaignId },
        data,
        select: campaignContentSelect,
      });
      return reply.send(toCampaignContent(campaign));
    },
  );
}
