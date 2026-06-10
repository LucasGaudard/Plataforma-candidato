import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient, Role } from '@prisma/client';
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
