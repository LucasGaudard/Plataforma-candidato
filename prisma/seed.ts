import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { CampaignStatus, PrismaClient, Role, PostCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const rootEnv = resolve(__dirname, '..', '.env');
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}

const prisma = new PrismaClient();
const INITIAL_CAMPAIGN_ID = 'cm5paulaquintanilha000001';
const INITIAL_CAMPAIGN_SLUG = 'paula-quintanilha';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada. Crie o arquivo .env na raiz do projeto.');
  }

  const campaign = await prisma.campaign.upsert({
    where: { slug: INITIAL_CAMPAIGN_SLUG },
    update: {
      name: 'Paula Quintanilha',
      candidateName: 'Paula Quintanilha',
      status: CampaignStatus.ACTIVE,
    },
    create: {
      id: INITIAL_CAMPAIGN_ID,
      name: 'Paula Quintanilha',
      slug: INITIAL_CAMPAIGN_SLUG,
      candidateName: 'Paula Quintanilha',
      status: CampaignStatus.ACTIVE,
    },
  });

  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL ||
    (process.env.NODE_ENV !== 'production' ? 'superadmin@conectaeleitor.local' : undefined);
  const superAdminPassword =
    process.env.SUPER_ADMIN_PASSWORD ||
    (process.env.NODE_ENV !== 'production' ? 'SuperAdmin@123' : undefined);

  if (superAdminEmail && superAdminPassword) {
    const normalizedSuperAdminEmail = superAdminEmail.trim().toLowerCase();
    const existingSuperAdminEmail = await prisma.user.findUnique({
      where: { email: normalizedSuperAdminEmail },
      select: { role: true, campaignId: true },
    });
    if (
      existingSuperAdminEmail &&
      (existingSuperAdminEmail.role !== Role.SUPER_ADMIN || existingSuperAdminEmail.campaignId !== null)
    ) {
      throw new Error(
        `SUPER_ADMIN_EMAIL já pertence a um usuário de campanha: ${normalizedSuperAdminEmail}`,
      );
    }
    const password = await bcrypt.hash(superAdminPassword, 12);
    await prisma.user.upsert({
      where: { email: normalizedSuperAdminEmail },
      update: {
        role: Role.SUPER_ADMIN,
        campaignId: null,
        password,
      },
      create: {
        email: normalizedSuperAdminEmail,
        password,
        firstName: 'Super',
        lastName: 'Admin',
        cpf: 'SUPER-ADMIN-GLOBAL',
        phone: '',
        address: '',
        city: '',
        state: '',
        role: Role.SUPER_ADMIN,
        campaignId: null,
      },
    });
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD não definidos; Super Admin não criado.');
  }

  const adminPassword = await bcrypt.hash('admin12345', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@campanha.com' },
    update: { campaignId: campaign.id },
    create: {
      email: 'admin@campanha.com',
      password: adminPassword,
      firstName: 'Administrador',
      lastName: 'Sistema',
      cpf: '39053344705',
      phone: '11999999999',
      address: 'Sede da Campanha',
      city: 'São Paulo',
      state: 'SP',
      role: Role.ADMIN,
      campaignId: campaign.id,
    },
  });

  const leaderPassword = await bcrypt.hash('lider12345', 12);

  const leader = await prisma.user.upsert({
    where: { email: 'joao.silva@campanha.com' },
    update: { campaignId: campaign.id },
    create: {
      email: 'joao.silva@campanha.com',
      password: leaderPassword,
      firstName: 'João',
      lastName: 'Silva',
      cpf: '52998224725',
      phone: '11988887777',
      address: 'Rua das Flores, 100',
      city: 'São Paulo',
      state: 'SP',
      role: Role.LEADER,
      leaderSlug: 'joao-silva',
      campaignId: campaign.id,
    },
  });

  const postCount = await prisma.post.count({ where: { campaignId: campaign.id } });
  if (postCount === 0) {
    await prisma.post.createMany({
      data: [
        {
          title: 'Lançamento oficial da campanha',
          description: 'Estamos oficialmente no ar! Junte-se a nós nessa jornada por um futuro melhor para nossa região.',
          category: PostCategory.COMUNICADO,
          imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2cc820a8f?w=800',
          authorId: admin.id,
          campaignId: campaign.id,
        },
        {
          title: 'Propostas para educação',
          description: 'Conheça nossas propostas para melhorar a educação pública na região.',
          category: PostCategory.VIDEO,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          authorId: admin.id,
          campaignId: campaign.id,
        },
        {
          title: 'Comunicado importante',
          description: 'Acompanhe nossas redes sociais para não perder nenhuma novidade da campanha.',
          category: PostCategory.GERAL,
          authorId: admin.id,
          campaignId: campaign.id,
        },
      ],
    });
  }

  const eventCount = await prisma.event.count({ where: { campaignId: campaign.id } });
  if (eventCount === 0) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    await prisma.event.create({
      data: {
        title: 'Reunião com apoiadores',
        description: 'Encontro aberto com apoiadores para discutir propostas e estratégias da campanha.',
        location: 'Sede da Campanha — São Paulo, SP',
        date: nextWeek,
        time: '19:00',
        authorId: admin.id,
        campaignId: campaign.id,
      },
    });
  }

  const liveCount = await prisma.live.count({ where: { campaignId: campaign.id } });
  if (liveCount === 0) {
    await prisma.live.create({
      data: {
        title: 'Live: Propostas para a região',
        description: 'Transmissão ao vivo com o candidato apresentando as principais propostas.',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        scheduledAt: new Date(),
        authorId: admin.id,
        campaignId: campaign.id,
      },
    });
  }

  console.log('Seed concluído:');
  console.log(`  Admin: ${admin.email} / admin12345`);
  console.log(`  Líder: ${leader.email} / lider12345`);
  console.log(`  Link do líder: /lider/joao-silva`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
