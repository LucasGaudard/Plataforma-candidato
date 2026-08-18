import { normalizeBrazilianPhoneForSending } from '@platform/utils';
import { WhatsappStatus } from '@platform/types';
import type { ManualWhatsappQueueResponse } from '@platform/types';

export function buildManualWhatsappLink(phone: string, message: string): string | null {
  const destination = normalizeBrazilianPhoneForSending(phone);
  const normalizedMessage = message.trim();
  if (!destination || !normalizedMessage) return null;
  return `https://wa.me/${destination}?text=${encodeURIComponent(normalizedMessage)}`;
}

export const MANUAL_WHATSAPP_WINDOW_NAME = 'conecta-eleitor-whatsapp';

type WhatsappWindowHandle = {
  closed?: boolean;
  location?: { href: string };
  focus?: () => void;
  opener?: unknown;
};

type BrowserWindowAdapter = {
  navigator?: { userAgent?: string };
  open: (url: string, target: string) => WhatsappWindowHandle | null;
};

export type ManualWhatsappOpenResult = 'OPENED' | 'REUSED' | 'MOBILE' | 'BLOCKED' | 'DUPLICATE' | 'INVALID';

export function isMobileWhatsappBrowser(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(userAgent);
}

export function createManualWhatsappOpener(options: {
  getWindow?: () => BrowserWindowAdapter;
  now?: () => number;
  isMobile?: (userAgent: string) => boolean;
} = {}) {
  const getWindow = options.getWindow || (() => window as unknown as BrowserWindowAdapter);
  const now = options.now || Date.now;
  const detectMobile = options.isMobile || isMobileWhatsappBrowser;
  let whatsappWindow: WhatsappWindowHandle | null = null;
  let lastUrl = '';
  let lastOpenedAt = 0;

  return (phone: string, message: string): ManualWhatsappOpenResult => {
    const url = buildManualWhatsappLink(phone, message);
    if (!url) return 'INVALID';
    const currentTime = now();
    if (url === lastUrl && currentTime - lastOpenedAt < 800) return 'DUPLICATE';

    const browser = getWindow();
    const mobile = detectMobile(browser.navigator?.userAgent || '');
    if (mobile) {
      const opened = browser.open(url, '_blank');
      if (!opened) return 'BLOCKED';
      lastUrl = url; lastOpenedAt = currentTime;
      try { opened.opener = null; opened.focus?.(); } catch { /* Browser controls focus/opener. */ }
      return 'MOBILE';
    }

    if (whatsappWindow && !whatsappWindow.closed) {
      try {
        if (whatsappWindow.location) whatsappWindow.location.href = url;
        whatsappWindow.focus?.();
        lastUrl = url; lastOpenedAt = currentTime;
        return 'REUSED';
      } catch {
        whatsappWindow = null;
      }
    }

    whatsappWindow = browser.open(url, MANUAL_WHATSAPP_WINDOW_NAME);
    if (!whatsappWindow) return 'BLOCKED';
    lastUrl = url; lastOpenedAt = currentTime;
    try { whatsappWindow.opener = null; whatsappWindow.focus?.(); } catch { /* Browser controls focus/opener. */ }
    return 'OPENED';
  };
}

export const openManualWhatsappConversation = createManualWhatsappOpener();

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
