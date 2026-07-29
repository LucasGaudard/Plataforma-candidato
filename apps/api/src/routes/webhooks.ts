import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, WhatsAppMessageDirection, WhatsAppMessageStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

type WebhookValue = {
  metadata?: { phone_number_id?: string };
  statuses?: Array<{ id?: string; status?: string; errors?: Array<{ code?: number }> }>;
  messages?: Array<{ id?: string; from?: string; type?: string }>;
};

function validSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
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

export default async function webhookRoutes(fastify: FastifyInstance) {
  fastify.addHook('preParsing', async (request, _reply, payload) => {
    const chunks: Buffer[] = [];
    payload.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    payload.on('end', () => { request.rawBody = Buffer.concat(chunks); });
    return payload;
  });

  fastify.get('/whatsapp', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string | undefined>;
    const valid =
      query['hub.mode'] === 'subscribe' &&
      Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) &&
      query['hub.verify_token'] === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
      typeof query['hub.challenge'] === 'string';
    if (!valid) return reply.status(403).send();
    return reply.type('text/plain').status(200).send(query['hub.challenge']);
  });

  fastify.post('/whatsapp', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-hub-signature-256'];
    if (!validSignature(request.rawBody, typeof signature === 'string' ? signature : undefined)) {
      return reply.status(401).send();
    }
    const body = request.body as {
      object?: string;
      entry?: Array<{ changes?: Array<{ value?: WebhookValue }> }>;
    };
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

        const operations: Prisma.PrismaPromise<unknown>[] = [
          prisma.campaignWhatsAppConfig.update({
            where: { campaignId: config.campaignId },
            data: { lastWebhookAt: new Date() },
          }),
        ];
        for (const status of value?.statuses || []) {
          const mapped = mapStatus(status.status);
          if (!status.id || !mapped) continue;
          operations.push(prisma.whatsAppMessage.updateMany({
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
        for (const message of value?.messages || []) {
          if (!message.id || !message.from) continue;
          operations.push(prisma.whatsAppMessage.upsert({
            where: { metaMessageId: message.id },
            create: {
              campaignId: config.campaignId,
              metaMessageId: message.id,
              recipient: message.from,
              direction: WhatsAppMessageDirection.INBOUND,
              type: message.type || 'unknown',
              status: WhatsAppMessageStatus.RECEIVED,
            },
            update: {},
          }));
        }
        await prisma.$transaction(operations);
      }
    }
    return reply.status(200).send('EVENT_RECEIVED');
  });
}
