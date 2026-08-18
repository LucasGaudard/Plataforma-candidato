import { normalizeBrazilianPhoneForSending } from '@platform/utils';
import { WhatsappStatus } from '@platform/types';
import type { ManualWhatsappQueueResponse } from '@platform/types';

export function buildManualWhatsappLink(phone: string, message: string): string | null {
  const destination = normalizeBrazilianPhoneForSending(phone);
  const normalizedMessage = message.trim();
  if (!destination || !normalizedMessage) return null;
  return `https://wa.me/${destination}?text=${encodeURIComponent(normalizedMessage)}`;
}

export function canUseManualWhatsapp(phone: string, whatsappStatus: string | undefined): boolean {
  return whatsappStatus !== WhatsappStatus.OPT_OUT && normalizeBrazilianPhoneForSending(phone) !== null;
}

export function removeSentItemFromManualQueue(
  queue: ManualWhatsappQueueResponse,
  supporterId: string,
): ManualWhatsappQueueResponse {
  if (!queue.items.some((item) => item.id === supporterId)) return queue;
  return {
    ...queue,
    items: queue.items.filter((item) => item.id !== supporterId),
    totalPending: Math.max(0, queue.totalPending - 1),
    totalSent: queue.totalSent + 1,
  };
}
