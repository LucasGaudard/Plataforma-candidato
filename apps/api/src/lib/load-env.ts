import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

function findMonorepoRoot(): string {
  let dir = __dirname;

  for (let i = 0; i < 6; i++) {
    const envPath = resolve(dir, '.env');
    const prismaPath = resolve(dir, 'prisma', 'schema.prisma');

    if (existsSync(envPath) || existsSync(prismaPath)) {
      return dir;
    }

    dir = resolve(dir, '..');
  }

  return resolve(__dirname, '../../../..');
}

const root = findMonorepoRoot();
const envPath = resolve(root, '.env');

if (existsSync(envPath)) {
  config({ path: envPath });
} else if (process.env.NODE_ENV !== 'production') {
  console.warn(`[env] Arquivo .env não encontrado em ${envPath}`);
  console.warn('[env] Copie .env.example para .env na raiz do projeto.');
}
