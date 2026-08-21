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
import { coordinatorRoutes } from './routes/coordinator';
import { postRoutes } from './routes/posts';
import multipart from '@fastify/multipart';
import { postUploadRoutes } from './routes/post-uploads';
import { eventRoutes } from './routes/events';
import { liveRoutes } from './routes/lives';
import { notificationRoutes } from './routes/notifications';
import { publicRoutes } from './routes/public';
import { superAdminRoutes } from './routes/super-admin';
import { campaignRoutes } from './routes/campaign';
import webhookRoutes from './routes/webhooks';
import { campaignWhatsAppRoutes } from './routes/campaign-whatsapp';
import { manualCommunicationRoutes } from './routes/manual-communications';
import { prisma } from './lib/prisma';
import { assertWhatsAppEncryptionConfigured } from './services/whatsapp/crypto';

const PORT =
  Number(process.env.PORT) ||
  Number(process.env.API_PORT) ||
  3333;
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
  await fastify.register(multipart, {
    limits: { files: 1, parts: 1, fileSize: 100 * 1024 * 1024 + 1 },
  });

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
  await fastify.register(coordinatorRoutes, { prefix: '/coordinator' });
  await fastify.register(postRoutes, { prefix: '/posts' });
  await fastify.register(postUploadRoutes, { prefix: '/posts/uploads' });
  await fastify.register(eventRoutes, { prefix: '/events' });
  await fastify.register(liveRoutes, { prefix: '/lives' });
  await fastify.register(notificationRoutes, { prefix: '/notifications' });
  await fastify.register(publicRoutes, { prefix: '/public' });
  await fastify.register(superAdminRoutes, { prefix: '/super-admin' });
  await fastify.register(campaignRoutes, { prefix: '/campaign' });
  await fastify.register(campaignWhatsAppRoutes, { prefix: '/campaign/whatsapp' });
  await fastify.register(manualCommunicationRoutes, { prefix: '/campaign/manual-communications' });
  await fastify.register(webhookRoutes, { prefix: '/webhooks' });

  try {
    await prisma.$connect();
    const whatsappConfigs = await prisma.campaignWhatsAppConfig.count();
    if (whatsappConfigs > 0) assertWhatsAppEncryptionConfigured();
    if (process.env.NODE_ENV === 'production' && !process.env.META_APP_SECRET) {
      fastify.log.warn('Webhook do WhatsApp desabilitado: assinatura da Meta não configurada');
    }
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`API rodando em http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
