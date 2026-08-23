export const PUBLIC_REFERRAL_WHATSAPP_WINDOW_NAME = 'conecta-eleitor-convite';

export function buildPublicReferralInvitation(inviterName: string, referralLink: string): string {
  const name = inviterName.trim().replace(/\s+/g, ' ');
  const link = referralLink.trim();
  return `Oi! Tudo bem? 😊

Eu sou ${name} e estou apoiando o trabalho da Paula Quintanilha.

Quero te convidar para conhecer um pouco mais sobre ela e, se você quiser, fazer parte também.

Através deste link você pode conhecer a Paula e realizar seu próprio cadastro como apoiador(a):

${link}

O cadastro é opcional, feito por você mesmo e com o seu consentimento. Leva menos de 1 minuto. 💙`;
}

export function buildPublicReferralWhatsappUrl(inviterName: string, referralLink: string): string {
  return `https://wa.me/?text=${encodeURIComponent(buildPublicReferralInvitation(inviterName, referralLink))}`;
}

type ShareWindow = {
  open(url: string, target: string, features?: string): { opener?: unknown } | null;
};

export function openPublicReferralInvitation(
  inviterName: string,
  referralLink: string,
  browser: ShareWindow = window,
): 'OPENED' | 'BLOCKED' | 'INVALID' {
  if (!inviterName.trim() || !referralLink.trim()) return 'INVALID';
  const opened = browser.open(
    buildPublicReferralWhatsappUrl(inviterName, referralLink),
    PUBLIC_REFERRAL_WHATSAPP_WINDOW_NAME,
    'noopener,noreferrer',
  );
  if (!opened) return 'BLOCKED';
  try { opened.opener = null; } catch { /* O navegador controla opener. */ }
  return 'OPENED';
}
