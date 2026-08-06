import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  Prisma,
  Role,
  SupporterStatus,
  WhatsappStatus,
  WhatsAppMessageDirection,
  WhatsAppMessageStatus,
} from '@prisma/client';
import { normalizeBrazilianPhone } from '@platform/utils';
import { prisma } from '../lib/prisma';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

type WebhookMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  context?: { id?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
  };
  text?: { body?: string };
};

type WebhookValue = {
  metadata?: { phone_number_id?: string };
  statuses?: Array<{ id?: string; status?: string; errors?: Array<{ code?: number }> }>;
  messages?: WebhookMessage[];
};

export type ParsedReply = {
  messageId: string | null;
  from: string | null;
  timestamp: string | null;
  contextId: string | null;
  normalizedResponse: string | null;
  confirms: boolean;
  optsOut: boolean;
};

export function validSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!rawBody || !signature?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8');
  const received = Buffer.from(signature.slice(7), 'utf8');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function mapStatus(status?: string): WhatsAppMessageStatus | null {
  if (status === 'sent') return WhatsAppMessageStatus.SENT;
  if (status === 'delivered') return WhatsAppMessageStatus.DELIVERED;
  if (status === 'read') return WhatsAppMessageStatus.READ;
  if (status === 'failed') return WhatsAppMessageStatus.FAILED;
  return null;
}

function normalizeReply(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  return normalized ? normalized.slice(0, 160) : null;
}

export function parseWhatsAppReply(message: WebhookMessage): ParsedReply {
  const buttonValues = message.type === 'button'
    ? [message.button?.payload, message.button?.text]
    : message.type === 'interactive' && message.interactive?.type === 'button_reply'
      ? [message.interactive.button_reply?.id, message.interactive.button_reply?.title]
      : [];
  const normalizedButtons = buttonValues.map(normalizeReply).filter((value): value is string => Boolean(value));
  const textResponse = message.type === 'text' ? normalizeReply(message.text?.body) : null;
  const normalizedResponse = normalizedButtons[0] || textResponse;
  const optOutValues = new Set(['SAIR', 'NAO', 'NAO QUERO']);
  return {
    messageId: message.id || null,
    from: message.from || null,
    timestamp: message.timestamp || null,
    contextId: message.context?.id || null,
    normalizedResponse,
    confirms: normalizedButtons.includes('SIM'),
    optsOut: normalizedButtons.some((value) => optOutValues.has(value)) || Boolean(textResponse && optOutValues.has(textResponse)),
  };
}

function maskedPhone(phone: string): string {
  return phone.length <= 4 ? '****' : `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}`;
}

async function processInboundMessage(
  fastify: FastifyInstance,
  campaignId: string,
  message: WebhookMessage,
): Promise<void> {
  if (!message.id || !message.from) return;
  if (await prisma.whatsAppMessage.findUnique({ where: { metaMessageId: message.id }, select: { id: true } })) return;

  const inboundUpsert = prisma.whatsAppMessage.upsert({
    where: { metaMessageId: message.id },
    create: {
      campaignId,
      metaMessageId: message.id,
      recipient: message.from,
      direction: WhatsAppMessageDirection.INBOUND,
      type: message.type || 'unknown',
      status: WhatsAppMessageStatus.RECEIVED,
    },
    update: {},
  });
  const reply = parseWhatsAppReply(message);
  if (!reply.confirms && !reply.optsOut) {
    try { await inboundUpsert; } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
    return;
  }

  const localPhone = normalizeBrazilianPhone(message.from);
  if (!localPhone) {
    fastify.log.warn({ campaignId, phone: maskedPhone(message.from) }, 'Telefone inválido recebido no webhook do WhatsApp');
    try { await inboundUpsert; } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
    return;
  }

  const supporters = await prisma.user.findMany({
    where: { campaignId, role: Role.USER, phone: localPhone },
    select: { id: true },
    take: 2,
  });
  if (supporters.length !== 1) {
    fastify.log.warn(
      { campaignId, phone: maskedPhone(localPhone), matches: supporters.length },
      supporters.length === 0 ? 'Apoiador não encontrado para resposta do WhatsApp' : 'Resposta do WhatsApp corresponde a mais de um apoiador',
    );
    try { await inboundUpsert; } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
    return;
  }

  const supporterId = supporters[0].id;
  const response = reply.normalizedResponse;
  const operation = reply.optsOut
    ? prisma.user.updateMany({
        where: { id: supporterId, campaignId, role: Role.USER },
        data: { whatsappStatus: WhatsappStatus.OPT_OUT, whatsappLastResponse: response, whatsappError: null },
      })
    : prisma.user.updateMany({
        where: { id: supporterId, campaignId, role: Role.USER, whatsappStatus: { not: WhatsappStatus.CONFIRMED } },
        data: {
          status: SupporterStatus.VERIFIED,
          whatsappStatus: WhatsappStatus.CONFIRMED,
          whatsappConfirmedAt: new Date(),
          whatsappLastResponse: response,
          whatsappError: null,
        },
      });
  try {
    await prisma.$transaction([inboundUpsert, operation]);
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
  }
}

export default async function webhookRoutes(fastify: FastifyInstance) {
  fastify.addHook('preParsing', async (request, _reply, payload) => {
    const chunks: Buffer[] = [];
    payload.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    payload.on('end', () => { request.rawBody = Buffer.concat(chunks); });
    return payload;
  });

  fastify.get('/whatsapp', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string | undefined>;
    const valid = query['hub.mode'] === 'subscribe'
      && Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)
      && query['hub.verify_token'] === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
      && typeof query['hub.challenge'] === 'string';
    if (!valid) return reply.status(403).send();
    return reply.type('text/plain').status(200).send(query['hub.challenge']);
  });

  fastify.post('/whatsapp', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-hub-signature-256'];
    if (!validSignature(request.rawBody, typeof signature === 'string' ? signature : undefined)) {
      return reply.status(401).send();
    }
    const body = request.body as { object?: string; entry?: Array<{ changes?: Array<{ value?: WebhookValue }> }> };
    if (body?.object !== 'whatsapp_business_account') return reply.status(200).send('EVENT_RECEIVED');

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;
        const config = await prisma.campaignWhatsAppConfig.findUnique({
          where: { phoneNumberId },
          select: { campaignId: true },
        });
        if (!config) continue;

        const statusOperations: Prisma.PrismaPromise<unknown>[] = [
          prisma.campaignWhatsAppConfig.update({ where: { campaignId: config.campaignId }, data: { lastWebhookAt: new Date() } }),
        ];
        for (const status of value?.statuses || []) {
          const mapped = mapStatus(status.status);
          if (!status.id || !mapped) continue;
          statusOperations.push(prisma.whatsAppMessage.updateMany({
            where: { campaignId: config.campaignId, metaMessageId: status.id },
            data: {
              status: mapped,
              ...(mapped === WhatsAppMessageStatus.FAILED ? {
                errorCode: status.errors?.[0]?.code ? String(status.errors[0].code) : undefined,
                errorMessage: 'A Meta informou falha na entrega',
              } : {}),
            },
          }));
        }
        await prisma.$transaction(statusOperations);
        for (const message of value?.messages || []) {
          await processInboundMessage(fastify, config.campaignId, message);
        }
      }
    }
    return reply.status(200).send('EVENT_RECEIVED');
  });
}
