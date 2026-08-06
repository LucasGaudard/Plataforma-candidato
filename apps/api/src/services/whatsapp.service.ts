import {
  Prisma,
  Role,
  User,
  WhatsappStatus,
  WhatsAppConnectionStatus,
  WhatsAppMessageDirection,
  WhatsAppMessageStatus,
} from '@prisma/client';
import { normalizeBrazilianPhoneForSending } from '@platform/utils';
import { prisma } from '../lib/prisma';
import { WhatsAppApiError, WhatsAppClient } from './whatsapp/client';
import { decryptSecret } from './whatsapp/crypto';

const CONFIRMATION_TEMPLATE = 'confirmacao_apoiador';
const CONFIRMATION_LANGUAGE = 'pt_BR';
const MAX_NAME_LENGTH = 80;
const BLOCKING_CONFIRMATION_STATUSES: WhatsAppMessageStatus[] = [
  WhatsAppMessageStatus.QUEUED,
  WhatsAppMessageStatus.SENT,
  WhatsAppMessageStatus.DELIVERED,
  WhatsAppMessageStatus.READ,
];

function supporterName(user: User): string {
  const name = `${user.firstName} ${user.lastName}`.replace(/\s+/g, ' ').trim();
  return name.slice(0, MAX_NAME_LENGTH).trim();
}

function safeFailure(error: unknown): { code?: string; message: string } {
  if (error instanceof WhatsAppApiError) return { code: error.code, message: error.message };
  return { message: 'Não foi possível enviar a confirmação pelo WhatsApp' };
}

function maskedDestination(recipient: string): string {
  return recipient.length <= 4 ? '****' : `${'*'.repeat(recipient.length - 4)}${recipient.slice(-4)}`;
}

function safeMetaLogMessage(error: unknown): string {
  if (error instanceof WhatsAppApiError) return error.metaDetails?.message || error.message;
  return 'Não foi possível enviar a confirmação pelo WhatsApp';
}

export function blocksConfirmationRetry(status: WhatsAppMessageStatus): boolean {
  return BLOCKING_CONFIRMATION_STATUSES.includes(status);
}

async function reserveConfirmation(campaignId: string, recipient: string) {
  const deduplicationKey = `${campaignId}:${recipient}:${CONFIRMATION_TEMPLATE}`;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${deduplicationKey}))`);
    const previousSend = await tx.whatsAppMessage.findFirst({
      where: {
        campaignId,
        recipient,
        templateName: CONFIRMATION_TEMPLATE,
        direction: WhatsAppMessageDirection.OUTBOUND,
        status: { in: BLOCKING_CONFIRMATION_STATUSES },
      },
      select: { id: true },
    });
    if (previousSend) return null;
    return tx.whatsAppMessage.create({
      data: {
        campaignId,
        recipient,
        direction: WhatsAppMessageDirection.OUTBOUND,
        type: 'template',
        status: WhatsAppMessageStatus.QUEUED,
        templateName: CONFIRMATION_TEMPLATE,
      },
      select: { id: true },
    });
  });
}

export class WhatsappService {
  async sendConfirmationMessage(user: User): Promise<void> {
    if (user.role !== Role.USER || !user.campaignId) return;
    const campaignId = user.campaignId;
    const currentUser = await prisma.user.findFirst({
      where: { id: user.id, campaignId, role: Role.USER },
    });
    if (
      !currentUser ||
      !currentUser.lgpdConsent ||
      currentUser.whatsappStatus === WhatsappStatus.CONFIRMED ||
      currentUser.whatsappStatus === WhatsappStatus.OPT_OUT
    ) return;
    user = currentUser;

    const recipient = normalizeBrazilianPhoneForSending(user.phone);
    if (!recipient) {
      await prisma.user.updateMany({
        where: { id: user.id, campaignId, role: Role.USER },
        data: { whatsappStatus: WhatsappStatus.FAILED, whatsappError: 'Telefone inválido para envio' },
      });
      throw new Error('Telefone inválido para envio');
    }

    const config = await prisma.campaignWhatsAppConfig.findUnique({ where: { campaignId } });
    if (
      !config ||
      !config.enabled ||
      config.connectionStatus !== WhatsAppConnectionStatus.CONNECTED ||
      !config.phoneNumberId ||
      !config.businessAccountId ||
      !config.accessTokenEncrypted ||
      !config.apiVersion
    ) {
      const message = 'Integração do WhatsApp indisponível';
      await prisma.$transaction([
        prisma.whatsAppMessage.create({
          data: {
            campaignId,
            recipient,
            direction: WhatsAppMessageDirection.OUTBOUND,
            type: 'template',
            status: WhatsAppMessageStatus.FAILED,
            templateName: CONFIRMATION_TEMPLATE,
            errorMessage: message,
          },
        }),
        prisma.user.updateMany({
          where: { id: user.id, campaignId, role: Role.USER },
          data: { whatsappStatus: WhatsappStatus.FAILED, whatsappError: message },
        }),
      ]);
      throw new Error(message);
    }

    const reservation = await reserveConfirmation(campaignId, recipient);
    if (!reservation) return;

    const stillEligible = await prisma.user.findFirst({
      where: {
        id: user.id,
        campaignId,
        role: Role.USER,
        lgpdConsent: true,
        whatsappStatus: { notIn: [WhatsappStatus.CONFIRMED, WhatsappStatus.OPT_OUT] },
      },
      select: { id: true },
    });
    if (!stillEligible) {
      await prisma.whatsAppMessage.update({
        where: { id: reservation.id },
        data: {
          status: WhatsAppMessageStatus.FAILED,
          errorMessage: 'Envio cancelado pelo estado atual do apoiador',
        },
      });
      return;
    }

    const sentAt = new Date();
    let metaMessageId: string;
    let metaHttpStatus: number | undefined;
    try {
      const result = await new WhatsAppClient(decryptSecret(config.accessTokenEncrypted), config.apiVersion)
        .sendTemplate(config.phoneNumberId, recipient, {
          name: CONFIRMATION_TEMPLATE,
          language: CONFIRMATION_LANGUAGE,
          bodyParameters: [supporterName(user)],
        }, (status) => { metaHttpStatus = status; });
      metaMessageId = result.messages?.[0]?.id || '';
      if (!metaMessageId) throw new WhatsAppApiError('A Meta não retornou o identificador da mensagem');
    } catch (error) {
      console.error({ message: safeMetaLogMessage(error) }, 'Falha no envio real do template pela Meta');
      const failure = safeFailure(error);
      await prisma.$transaction([
        prisma.whatsAppMessage.update({
          where: { id: reservation.id },
          data: { status: WhatsAppMessageStatus.FAILED, errorCode: failure.code, errorMessage: failure.message },
        }),
        prisma.user.updateMany({
          where: {
            id: user.id,
            campaignId,
            role: Role.USER,
            whatsappStatus: { notIn: [WhatsappStatus.CONFIRMED, WhatsappStatus.OPT_OUT] },
          },
          data: { whatsappStatus: WhatsappStatus.FAILED, whatsappError: failure.message },
        }),
      ]);
      throw new Error(failure.message);
    }

    console.info({
      template: CONFIRMATION_TEMPLATE,
      phoneNumberId: config.phoneNumberId,
      destination: maskedDestination(recipient),
      metaHttpStatus,
      metaMessageId,
    }, 'Template enviado pela WhatsApp Cloud API');

    try {
      await prisma.$transaction([
        prisma.whatsAppMessage.update({
          where: { id: reservation.id },
          data: { metaMessageId, status: WhatsAppMessageStatus.SENT, errorCode: null, errorMessage: null },
        }),
        prisma.user.updateMany({
          where: {
            id: user.id,
            campaignId,
            role: Role.USER,
            whatsappStatus: { notIn: [WhatsappStatus.CONFIRMED, WhatsappStatus.OPT_OUT] },
          },
          data: { whatsappStatus: WhatsappStatus.SENT, whatsappLastSent: sentAt, whatsappError: null },
        }),
      ]);
    } catch {
      // A Meta já aceitou a mensagem. A reserva permanece QUEUED para impedir reenvio potencialmente duplicado.
      throw new Error('Mensagem aceita pela Meta, mas não foi possível persistir a confirmação do envio');
    }
  }
}

export const whatsappService = new WhatsappService();
