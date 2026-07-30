import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CampaignStatus, Prisma, Role, WhatsAppConnectionStatus, WhatsAppMessageDirection, WhatsAppMessageStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptSecret, encryptSecret } from '../services/whatsapp/crypto';
import { WhatsAppApiError, WhatsAppClient } from '../services/whatsapp/client';

const API_VERSION_PATTERN = /^v\d{1,2}\.0$/;
const ID_PATTERN = /^\d{5,30}$/;
const ALLOWED_PATCH_FIELDS = new Set([
  'phoneNumberId', 'businessAccountId', 'displayPhoneNumber', 'accessToken', 'apiVersion', 'enabled',
]);

type PatchBody = {
  phoneNumberId?: unknown;
  businessAccountId?: unknown;
  displayPhoneNumber?: unknown;
  accessToken?: unknown;
  apiVersion?: unknown;
  enabled?: unknown;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDisplayPhone(value: unknown): string | null {
  const input = text(value);
  if (!input) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) throw new Error('Número de exibição internacional inválido');
  return `+${digits}`;
}

function normalizeRecipient(value: unknown): string {
  const digits = text(value).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15 || (digits.startsWith('55') && digits.length !== 12 && digits.length !== 13)) {
    throw new Error('Destinatário inválido; informe DDI, DDD e número');
  }
  return digits;
}

async function activeCampaign(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const campaignId = request.user.campaignId;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
  if (!campaign) {
    await reply.status(404).send({ message: 'Campanha não encontrada' });
    return null;
  }
  if (campaign.status !== CampaignStatus.ACTIVE) {
    await reply.status(403).send({ message: 'A campanha precisa estar ativa para usar o WhatsApp' });
    return null;
  }
  return campaignId;
}

function view(config: Awaited<ReturnType<typeof findConfig>>) {
  if (!config) {
    return {
      configured: false, enabled: false, phoneNumberId: '', businessAccountId: '',
      displayPhoneNumber: null, apiVersion: process.env.WHATSAPP_DEFAULT_API_VERSION || 'v25.0',
      hasAccessToken: false, accessTokenLastFour: null, connectionStatus: 'NOT_TESTED',
      lastConnectionAt: null, lastConnectionError: null, lastTestMessageAt: null,
      lastWebhookAt: null, webhookUrl: `${(process.env.API_PUBLIC_URL || '').replace(/\/$/, '')}/webhooks/whatsapp`,
    };
  }
  return {
    configured: true,
    enabled: config.enabled,
    phoneNumberId: config.phoneNumberId,
    businessAccountId: config.businessAccountId,
    displayPhoneNumber: config.displayPhoneNumber,
    apiVersion: config.apiVersion,
    hasAccessToken: true,
    accessTokenLastFour: config.accessTokenEncryptedLastFour,
    connectionStatus: config.connectionStatus,
    lastConnectionAt: config.lastConnectionAt,
    lastConnectionError: config.lastConnectionError,
    lastTestMessageAt: config.lastTestMessageAt,
    lastWebhookAt: config.lastWebhookAt,
    webhookUrl: `${(process.env.API_PUBLIC_URL || '').replace(/\/$/, '')}/webhooks/whatsapp`,
  };
}

async function findConfig(campaignId: string) {
  const config = await prisma.campaignWhatsAppConfig.findUnique({ where: { campaignId } });
  if (!config) return null;
  let accessTokenEncryptedLastFour: string | null = null;
  try { accessTokenEncryptedLastFour = decryptSecret(config.accessTokenEncrypted).slice(-4); } catch { /* never expose decryption details */ }
  return { ...config, accessTokenEncryptedLastFour };
}

function apiError(reply: FastifyReply, error: unknown, includeDevelopmentDetails = false) {
  if (error instanceof WhatsAppApiError) {
    return reply.status(error.status).send({
      success: false,
      message: error.message,
      ...(includeDevelopmentDetails && process.env.NODE_ENV !== 'production' && error.metaDetails
        ? {
            details: {
              code: error.metaDetails.code,
              subcode: error.metaDetails.subcode,
              type: error.metaDetails.type,
              message: error.metaDetails.message,
            },
          }
        : {}),
    });
  }
  return reply.status(500).send({ success: false, message: 'Não foi possível concluir a operação' });
}

export async function campaignWhatsAppRoutes(fastify: FastifyInstance) {
  const adminOnly = [fastify.authenticate, fastify.authorize(Role.ADMIN)];

  fastify.get('/config', { preHandler: adminOnly }, async (request, reply) => {
    const campaignId = await activeCampaign(request, reply);
    if (!campaignId) return;
    return reply.send(view(await findConfig(campaignId)));
  });

  fastify.patch<{ Body: PatchBody }>('/config', { preHandler: adminOnly }, async (request, reply) => {
    const campaignId = await activeCampaign(request, reply);
    if (!campaignId) return;
    const body = request.body || {};
    if (Object.keys(body).some((key) => !ALLOWED_PATCH_FIELDS.has(key))) {
      return reply.status(400).send({ message: 'A configuração contém campos não permitidos' });
    }
    const existing = await prisma.campaignWhatsAppConfig.findUnique({ where: { campaignId } });
    const phoneNumberId = body.phoneNumberId === undefined ? existing?.phoneNumberId : text(body.phoneNumberId);
    const businessAccountId = body.businessAccountId === undefined ? existing?.businessAccountId : text(body.businessAccountId);
    const apiVersion = body.apiVersion === undefined
      ? existing?.apiVersion || process.env.WHATSAPP_DEFAULT_API_VERSION || 'v25.0'
      : text(body.apiVersion);
    const accessToken = text(body.accessToken);
    if (!phoneNumberId || !ID_PATTERN.test(phoneNumberId) || !businessAccountId || !ID_PATTERN.test(businessAccountId)) {
      return reply.status(400).send({ message: 'Phone Number ID e Business Account ID devem conter somente dígitos' });
    }
    if (!API_VERSION_PATTERN.test(apiVersion)) return reply.status(400).send({ message: 'Versão da API inválida' });
    if (!existing && !accessToken) return reply.status(400).send({ message: 'Access Token é obrigatório na primeira configuração' });
    if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
      return reply.status(400).send({ message: 'enabled deve ser booleano' });
    }
    if (body.enabled === true && existing?.connectionStatus !== WhatsAppConnectionStatus.CONNECTED) {
      return reply.status(400).send({ message: 'Teste a conexão com sucesso antes de habilitar' });
    }
    let displayPhoneNumber: string | null | undefined;
    try {
      displayPhoneNumber = body.displayPhoneNumber === undefined
        ? existing?.displayPhoneNumber
        : normalizeDisplayPhone(body.displayPhoneNumber);
    } catch (error) {
      return reply.status(400).send({ message: (error as Error).message });
    }
    const tokenChanged = Boolean(accessToken);
    try {
      await prisma.campaignWhatsAppConfig.upsert({
        where: { campaignId },
        create: {
          campaignId, phoneNumberId, businessAccountId, displayPhoneNumber,
          accessTokenEncrypted: encryptSecret(accessToken), apiVersion, enabled: false,
        },
        update: {
          phoneNumberId, businessAccountId, displayPhoneNumber, apiVersion,
          ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
          ...(tokenChanged ? {
            accessTokenEncrypted: encryptSecret(accessToken),
            connectionStatus: WhatsAppConnectionStatus.NOT_TESTED,
            enabled: false,
            lastConnectionError: null,
          } : {}),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return reply.status(409).send({ message: 'Este Phone Number ID já pertence a outra campanha' });
      }
      throw error;
    }
    return reply.send(view(await findConfig(campaignId)));
  });

  fastify.post('/test-connection', { preHandler: adminOnly }, async (request, reply) => {
    const campaignId = await activeCampaign(request, reply);
    if (!campaignId) return;
    const config = await prisma.campaignWhatsAppConfig.findUnique({ where: { campaignId } });
    if (!config) return reply.status(400).send({ success: false, message: 'Configure o WhatsApp primeiro' });
    const now = new Date();
    try {
      const client = new WhatsAppClient(decryptSecret(config.accessTokenEncrypted), config.apiVersion);
      const [phone, waba] = await Promise.all([
        client.getPhoneNumber(config.phoneNumberId),
        client.getWabaPhoneNumbers(config.businessAccountId),
      ]);
      if (phone.id !== config.phoneNumberId || !waba.data?.some((item) => item.id === config.phoneNumberId)) {
        throw new WhatsAppApiError('Phone Number ID não pertence à WABA configurada', 'WABA_MISMATCH', 400);
      }
      await prisma.campaignWhatsAppConfig.update({
        where: { campaignId },
        data: { connectionStatus: WhatsAppConnectionStatus.CONNECTED, lastConnectionAt: now, lastConnectionError: null },
      });
      return reply.send({ success: true, message: 'Conexão validada com a Meta', testedAt: now });
    } catch (error) {
      const message = error instanceof WhatsAppApiError ? error.message : 'Não foi possível validar as credenciais';
      await prisma.campaignWhatsAppConfig.update({
        where: { campaignId },
        data: { connectionStatus: WhatsAppConnectionStatus.ERROR, enabled: false, lastConnectionAt: now, lastConnectionError: message },
      });
      return apiError(reply, error);
    }
  });

  fastify.post<{ Body: { to?: unknown; mode?: unknown; message?: unknown } }>(
    '/test-message',
    { preHandler: adminOnly },
    async (request, reply) => {
      const campaignId = await activeCampaign(request, reply);
      if (!campaignId) return;
      if (request.body?.mode !== 'template') return reply.status(400).send({ message: 'Somente o template aprovado hello_world está disponível' });
      let recipient: string;
      try { recipient = normalizeRecipient(request.body?.to); }
      catch (error) { return reply.status(400).send({ message: (error as Error).message }); }
      const config = await prisma.campaignWhatsAppConfig.findUnique({ where: { campaignId } });
      if (!config || !config.enabled || config.connectionStatus !== WhatsAppConnectionStatus.CONNECTED) {
        return reply.status(400).send({ message: 'A integração precisa estar conectada e habilitada' });
      }
      const sentAt = new Date();
      try {
        const result = await new WhatsAppClient(decryptSecret(config.accessTokenEncrypted), config.apiVersion)
          .sendTemplate(config.phoneNumberId, recipient);
        const messageId = result.messages?.[0]?.id;
        if (!messageId) throw new WhatsAppApiError('A Meta não retornou o identificador da mensagem');
        await prisma.$transaction([
          prisma.whatsAppMessage.create({
            data: {
              campaignId, metaMessageId: messageId, recipient,
              direction: WhatsAppMessageDirection.OUTBOUND, type: 'template',
              status: WhatsAppMessageStatus.SENT, templateName: 'hello_world',
              sentByUserId: request.user.sub,
            },
          }),
          prisma.campaignWhatsAppConfig.update({ where: { campaignId }, data: { lastTestMessageAt: sentAt } }),
        ]);
        return reply.send({ success: true, messageId, recipient, sentAt });
      } catch (error) {
        const safe = error instanceof WhatsAppApiError ? error : new WhatsAppApiError('Falha no envio');
        request.log.error(
          {
            metaHttpStatus: safe.metaHttpStatus,
            metaError: safe.metaDetails
              ? {
                  message: safe.metaDetails.message,
                  type: safe.metaDetails.type,
                  code: safe.metaDetails.code,
                  error_subcode: safe.metaDetails.subcode,
                  error_user_title: safe.metaDetails.errorUserTitle,
                  error_user_msg: safe.metaDetails.errorUserMessage,
                  fbtrace_id: safe.metaDetails.fbtraceId,
                }
              : undefined,
          },
          'Falha no envio da mensagem de teste pela WhatsApp Cloud API',
        );
        await prisma.whatsAppMessage.create({
          data: {
            campaignId, recipient, direction: WhatsAppMessageDirection.OUTBOUND,
            type: 'template', status: WhatsAppMessageStatus.FAILED,
            templateName: 'hello_world', errorCode: safe.code, errorMessage: safe.message,
            sentByUserId: request.user.sub,
          },
        });
        return apiError(reply, safe, true);
      }
    },
  );

  fastify.post('/subscribe-webhook', { preHandler: adminOnly }, async (request, reply) => {
    const campaignId = await activeCampaign(request, reply);
    if (!campaignId) return;
    const config = await prisma.campaignWhatsAppConfig.findUnique({ where: { campaignId } });
    if (!config || config.connectionStatus !== WhatsAppConnectionStatus.CONNECTED) {
      return reply.status(400).send({ message: 'Valide a conexão antes de assinar o webhook' });
    }
    try {
      const result = await new WhatsAppClient(decryptSecret(config.accessTokenEncrypted), config.apiVersion)
        .subscribeWebhook(config.businessAccountId);
      return reply.send({ success: result.success === true, message: 'WABA assinada para receber webhooks' });
    } catch (error) {
      return apiError(reply, error);
    }
  });
}
