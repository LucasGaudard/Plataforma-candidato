import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient, Role, PostCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const rootEnv = resolve(__dirname, '..', '.env');
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada. Crie o arquivo .env na raiz do projeto.');
  }

  const adminPassword = await bcrypt.hash('admin12345', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@campanha.com' },
    update: {},
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
    },
  });

  const leaderPassword = await bcrypt.hash('lider12345', 12);

  const leader = await prisma.user.upsert({
    where: { email: 'joao.silva@campanha.com' },
    update: {},
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
    },
  });

  const postCount = await prisma.post.count();
  if (postCount === 0) {
    await prisma.post.createMany({
      data: [
        {
          title: 'Lançamento oficial da campanha',
          description: 'Estamos oficialmente no ar! Junte-se a nós nessa jornada por um futuro melhor para nossa região.',
          category: PostCategory.COMUNICADO,
          imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2cc820a8f?w=800',
          authorId: admin.id,
        },
        {
          title: 'Propostas para educação',
          description: 'Conheça nossas propostas para melhorar a educação pública na região.',
          category: PostCategory.VIDEO,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          authorId: admin.id,
        },
        {
          title: 'Comunicado importante',
          description: 'Acompanhe nossas redes sociais para não perder nenhuma novidade da campanha.',
          category: PostCategory.GERAL,
          authorId: admin.id,
        },
      ],
    });
  }

  const eventCount = await prisma.event.count();
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
      },
    });
  }

  const liveCount = await prisma.live.count();
  if (liveCount === 0) {
    await prisma.live.create({
      data: {
        title: 'Live: Propostas para a região',
        description: 'Transmissão ao vivo com o candidato apresentando as principais propostas.',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        scheduledAt: new Date(),
        authorId: admin.id,
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
