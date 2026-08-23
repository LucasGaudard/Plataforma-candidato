'use client';

import { useState } from 'react';
import { Button, Card } from '@platform/ui';
import { useToast } from '@/contexts/toast-context';
import { openPublicReferralInvitation } from '@/lib/public-referral-share';

export function ReferralLinkCard({ inviterName, referralLink }: { inviterName: string; referralLink?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast('Link copiado!', 'success');
    setTimeout(() => setCopied(false), 2000);
  }

  function shareInvitation() {
    if (!referralLink) return;
    const result = openPublicReferralInvitation(inviterName, referralLink);
    if (result === 'BLOCKED') {
      toast('O navegador bloqueou a abertura do WhatsApp. Permita pop-ups e tente novamente.', 'error');
    }
  }

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500">Link de indicação</h3>
      <p className="mt-2 max-w-full break-all font-mono text-xs text-brand-700">{referralLink}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" onClick={copyLink} variant="outline" size="sm">
          {copied ? 'Copiado!' : 'Copiar link'}
        </Button>
        <Button type="button" onClick={shareInvitation} size="sm">
          <span aria-hidden="true">💬</span> Compartilhar convite
        </Button>
      </div>
    </Card>
  );
}
