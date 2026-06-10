# Plataforma de Campanha Política

Monorepo profissional para campanha de deputado, com frontend Next.js, backend Fastify, PostgreSQL e autenticação JWT.

## Estrutura do Projeto

```
├── apps/
│   ├── api/          # Backend Fastify (REST API) — porta 3333
│   └── web/          # Frontend Next.js — porta 3000
├── packages/
│   ├── types/        # Tipos TypeScript compartilhados
│   ├── utils/        # Validações, máscaras e utilitários
│   └── ui/           # Componentes React reutilizáveis
├── prisma/           # Schema, migrations e seed
├── .env              # Variáveis de ambiente (raiz do monorepo)
└── docker-compose.yml
```

## Pré-requisitos

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+ **ou** Docker

## Configuração rápida

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

O arquivo `.env` deve ficar na **raiz do monorepo** (não dentro de `apps/api`).

```bash
cp .env.example .env
cp .env.example apps/web/.env.local
```

Edite o `.env` com suas credenciais do PostgreSQL. O `apps/web/.env.local` precisa apenas de:

```
NEXT_PUBLIC_API_URL="http://localhost:3333"
```

### 3. Iniciar o PostgreSQL

**Opção A — Docker (recomendado):**

```bash
pnpm db:up
```

**Opção B — PostgreSQL local:**

Crie o banco manualmente:

```sql
CREATE DATABASE plataforma_candidato;
```

Ajuste `DATABASE_URL` no `.env`:

```
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/plataforma_candidato?schema=public"
```

### 4. Rodar migrations e seed

```bash
pnpm db:setup
```

Isso executa: `prisma generate` → `prisma migrate deploy` → `prisma seed`

**Alternativa (desenvolvimento, sem migration):**

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### 5. Usuários de teste (seed)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | admin@campanha.com | admin12345 |
| Líder | joao.silva@campanha.com | lider12345 |

Link do líder: `http://localhost:3000/lider/joao-silva`

## Executando o Projeto

### Desenvolvimento (frontend + backend)

```bash
pnpm dev
```

- **API:** http://localhost:3333
- **Web:** http://localhost:3000

### Executar separadamente

```bash
pnpm --filter @platform/api dev
pnpm --filter @platform/web dev
```

### Verificar se a API está ok

```bash
curl http://localhost:3333/
curl http://localhost:3333/health
```

## Migrations

| Comando | Quando usar |
|---------|-------------|
| `pnpm db:migrate` | Desenvolvimento — cria nova migration interativa |
| `pnpm db:migrate:deploy` | Produção/CI — aplica migrations existentes |
| `pnpm db:push` | Prototipagem — sincroniza schema sem migration |
| `pnpm db:setup` | Setup inicial completo |

As migrations ficam em `prisma/migrations/`.

## API Endpoints

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/` | Status da API | — |
| GET | `/health` | Health check + banco | — |
| POST | `/auth/login` | Login | — |
| POST | `/auth/register` | Cadastro | — |
| GET | `/auth/me` | Usuário logado | JWT |
| GET | `/admin/dashboard` | Dashboard admin | JWT (ADMIN) |
| GET | `/leader/dashboard` | Dashboard líder | JWT (LEADER) |
| GET | `/leader/:slug` | Dados do líder | — |

## Scripts

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | API + Web em paralelo |
| `pnpm build` | Build de produção |
| `pnpm lint` | Lint em todos os pacotes |
| `pnpm db:up` | Sobe PostgreSQL via Docker |
| `pnpm db:setup` | Generate + migrate + seed |
| `pnpm db:studio` | Prisma Studio |

## Solução de problemas

### `Environment variable not found: DATABASE_URL`

1. Confirme que existe `.env` na **raiz** do projeto (ao lado de `package.json`)
2. Confirme que `DATABASE_URL` está definida no `.env`
3. Reinicie a API após criar/editar o `.env`

### Erro de conexão com PostgreSQL

1. Verifique se o PostgreSQL está rodando: `pnpm db:up` ou serviço local
2. Confirme usuário, senha e nome do banco no `DATABASE_URL`
3. Teste: `pnpm db:studio`

### Frontend não conecta na API

1. Confirme `NEXT_PUBLIC_API_URL=http://localhost:3333` em `apps/web/.env.local`
2. Reinicie o Next.js após alterar variáveis `NEXT_PUBLIC_*`

## Segurança

- Senhas com hash bcrypt (12 rounds)
- JWT com expiração de 7 dias
- Middleware de autenticação e autorização por role
- Validação e sanitização de inputs
- CORS restrito ao frontend configurado
