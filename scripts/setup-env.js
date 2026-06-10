const { copyFileSync, existsSync } = require('fs');
const { resolve } = require('path');

const root = resolve(__dirname, '..');
const envFile = resolve(root, '.env');
const envExample = resolve(root, '.env.example');
const webEnv = resolve(root, 'apps', 'web', '.env.local');

if (!existsSync(envFile) && existsSync(envExample)) {
  copyFileSync(envExample, envFile);
  console.log('✓ Criado .env na raiz do projeto');
} else if (existsSync(envFile)) {
  console.log('✓ .env já existe na raiz');
} else {
  console.warn('⚠ .env.example não encontrado');
}

const webEnvContent = 'NEXT_PUBLIC_API_URL="http://localhost:3333"\n';

if (!existsSync(webEnv)) {
  require('fs').writeFileSync(webEnv, webEnvContent);
  console.log('✓ Criado apps/web/.env.local');
} else {
  console.log('✓ apps/web/.env.local já existe');
}

console.log('\nPróximos passos:');
console.log('  1. Edite .env com suas credenciais do PostgreSQL');
console.log('  2. pnpm db:up          (Docker) ou inicie PostgreSQL local');
console.log('  3. pnpm db:setup       (migrations + seed)');
console.log('  4. pnpm dev');
