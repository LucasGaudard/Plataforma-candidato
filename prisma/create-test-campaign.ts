import bcrypt from 'bcryptjs';
import { CampaignStatus, PostCategory, Role, SupporterStatus } from '@prisma/client';
import { prisma } from '../apps/api/src/lib/prisma';

const TEST_CAMPAIGN_SLUG = 'campanha-teste';
const TEST_ADMIN_EMAIL = 'admin.teste@campanha.com';
const TEST_POST_ID = 'testcampaignpost000000000001';
const TEST_EVENT_ID = 'testcampaignevent0000000001';
const TEST_LIVE_ID = 'testcampaignlive000000000001';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Este script não pode ser executado com NODE_ENV=production.');
  }

  if (process.env.ALLOW_TEST_DATA !== 'true') {
    throw new Error('Defina ALLOW_TEST_DATA=true para confirmar o uso do banco de desenvolvimento.');
  }

  const password = await bcrypt.hash('Teste@123', 12);

  const result = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.upsert({
      where: { slug: TEST_CAMPAIGN_SLUG },
      update: {
        name: 'Campanha Teste',
        candidateName: 'Campanha Teste',
        status: CampaignStatus.ACTIVE,
      },
      create: {
        name: 'Campanha Teste',
        slug: TEST_CAMPAIGN_SLUG,
        candidateName: 'Campanha Teste',
        status: CampaignStatus.ACTIVE,
      },
    });

    const admin = await tx.user.upsert({
      where: { email: TEST_ADMIN_EMAIL },
      update: {
        password,
        firstName: 'Admin',
        lastName: 'Teste',
        role: Role.ADMIN,
        status: SupporterStatus.VERIFIED,
        campaignId: campaign.id,
      },
      create: {
        email: TEST_ADMIN_EMAIL,
        password,
        firstName: 'Admin',
        lastName: 'Teste',
        cpf: '99999999999',
        phone: '11999999999',
        address: 'Endereço de teste',
        city: 'Cidade de teste',
        state: 'SP',
        role: Role.ADMIN,
        status: SupporterStatus.VERIFIED,
        campaignId: campaign.id,
      },
    });

    const post = await tx.post.upsert({
      where: { id: TEST_POST_ID },
      update: {
        title: 'Post da Campanha Teste',
        description: 'Conteúdo publicado para validação do isolamento multi-tenant.',
        category: PostCategory.GERAL,
        published: true,
        authorId: admin.id,
        campaignId: campaign.id,
      },
      create: {
        id: TEST_POST_ID,
        title: 'Post da Campanha Teste',
        description: 'Conteúdo publicado para validação do isolamento multi-tenant.',
        category: PostCategory.GERAL,
        published: true,
        authorId: admin.id,
        campaignId: campaign.id,
      },
    });

    const event = await tx.event.upsert({
      where: { id: TEST_EVENT_ID },
      update: {
        title: 'Evento da Campanha Teste',
        description: 'Evento para validação do isolamento multi-tenant.',
        location: 'Local de teste',
        date: new Date('2030-10-01T22:00:00.000Z'),
        time: '19:00',
        published: true,
        authorId: admin.id,
        campaignId: campaign.id,
      },
      create: {
        id: TEST_EVENT_ID,
        title: 'Evento da Campanha Teste',
        description: 'Evento para validação do isolamento multi-tenant.',
        location: 'Local de teste',
        date: new Date('2030-10-01T22:00:00.000Z'),
        time: '19:00',
        published: true,
        authorId: admin.id,
        campaignId: campaign.id,
      },
    });

    const live = await tx.live.upsert({
      where: { id: TEST_LIVE_ID },
      update: {
        title: 'Live da Campanha Teste',
        description: 'Live para validação do isolamento multi-tenant.',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        published: true,
        scheduledAt: new Date('2030-10-02T22:00:00.000Z'),
        authorId: admin.id,
        campaignId: campaign.id,
      },
      create: {
        id: TEST_LIVE_ID,
        title: 'Live da Campanha Teste',
        description: 'Live para validação do isolamento multi-tenant.',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        published: true,
        scheduledAt: new Date('2030-10-02T22:00:00.000Z'),
        authorId: admin.id,
        campaignId: campaign.id,
      },
    });

    return {
      campaignId: campaign.id,
      adminEmail: admin.email,
      postId: post.id,
      eventId: event.id,
      liveId: live.id,
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
