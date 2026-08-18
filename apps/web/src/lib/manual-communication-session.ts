import type { ManualCommunicationRecipientStatus, ManualCommunicationSession } from '@platform/types';

export function applyManualRecipientAction(
  session: ManualCommunicationSession,
  recipientId: string,
  status: Exclude<ManualCommunicationRecipientStatus, 'PENDING'>,
): ManualCommunicationSession {
  const recipient = session.recipients?.find((item) => item.id === recipientId);
  if (!recipient || recipient.status !== 'PENDING') return session;
  const now = new Date().toISOString();
  const recipients = session.recipients!.map((item) => item.id === recipientId ? {
    ...item, status,
    sentAt: status === 'SENT' ? now : item.sentAt,
    skippedAt: status === 'SKIPPED' ? now : item.skippedAt,
    optOutAt: status === 'OPT_OUT' ? now : item.optOutAt,
  } : item);
  const counts = { ...session.counts, PENDING: session.counts.PENDING - 1, [status]: session.counts[status] + 1 };
  return { ...session, recipients, counts, status: counts.PENDING === 0 ? 'COMPLETED' : session.status };
}
