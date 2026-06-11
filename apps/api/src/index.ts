import './lib/load-env';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { registerAuth } from './plugins/auth';
import { registerErrorHandler } from './plugins/error-handler';
import { registerRateLimit } from './plugins/rate-limit';
import { authRoutes } from './routes/auth';
import { adminRoutes } from './routes/admin';
import { leaderRoutes } from './routes/leader';
import { postRoutes } from './routes/posts';
import { eventRoutes } from './routes/events';
import { liveRoutes } from './routes/lives';
import { notificationRoutes } from './routes/notifications';
import { prisma } from './lib/prisma';

const PORT = Number(process.env.API_PORT) || 3333;
const HOST = process.env.API_HOST || '0.0.0.0';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não configurada. Copie .env.example para .env na raiz do projeto.');
    process.exit(1);
  }

  const fastify = Fastify({
    logger: true,
  });

  await registerRateLimit(fastify);

  await fastify.register(cors, {
    origin: [FRONTEND_URL, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await fastify.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  await registerAuth(fastify);
  await registerErrorHandler(fastify);

  fastify.get('/', async () => ({
    success: true,
    message: 'API da plataforma política funcionando',
  }));

  fastify.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch {
      return { status: 'degraded', database: 'disconnected' };
    }
  });

  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(adminRoutes, { prefix: '/admin' });
  await fastify.register(leaderRoutes, { prefix: '/leader' });
  await fastify.register(postRoutes, { prefix: '/posts' });
  await fastify.register(eventRoutes, { prefix: '/events' });
  await fastify.register(liveRoutes, { prefix: '/lives' });
  await fastify.register(notificationRoutes, { prefix: '/notifications' });

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`API rodando em http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
