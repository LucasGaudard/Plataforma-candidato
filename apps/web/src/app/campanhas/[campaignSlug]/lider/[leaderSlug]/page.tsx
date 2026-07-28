'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@platform/ui';
import { SupporterForm } from '@/components/forms/supporter-form';
import { api } from '@/lib/api';
import { PublicCampaignTheme } from '@/components/campaign/public-campaign-theme';
import { CampaignIdentity } from '@/components/campaign/campaign-identity';
import { CampaignRegistrationCopy } from '@/components/campaign/campaign-registration-copy';

export default function CampaignLeaderRegistrationPage() {
  const params = useParams();
  const campaignSlug = params.campaignSlug as string;
  const leaderSlug = params.leaderSlug as string;
  const [leader, setLeader] = useState<{ firstName: string; lastName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .getLeaderBySlug(campaignSlug, leaderSlug)
      .then(setLeader)
      .catch(() => setError('Líder não encontrado'))
      .finally(() => setLoading(false));
  }, [campaignSlug, leaderSlug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !leader) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-bold text-brand-900">Link inválido</h1>
          <p className="mt-2 text-sm text-slate-500">O link de cadastro não foi encontrado.</p>
          <Link
            href={`/campanhas/${campaignSlug}/cadastro`}
            className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline"
          >
            Cadastrar sem indicação
          </Link>
        </Card>
      </div>
    );
  }

  const leaderName = `${leader.firstName} ${leader.lastName}`;

  return (
    <PublicCampaignTheme campaignSlug={campaignSlug}>
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/"><CampaignIdentity /></Link>
        </div>

        <Card padding="lg">
          {success ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
                ✓
              </div>
              <h2 className="text-2xl font-bold text-brand-900">Cadastro realizado!</h2>
              <p className="mt-2 text-slate-600">
                Obrigado pelo seu apoio. Em breve você receberá nossas atualizações pelo WhatsApp.
              </p>
            </div>
          ) : (
            <>
              <CampaignRegistrationCopy leaderName={leaderName} />
              <div className="mt-6">
                <SupporterForm
                  campaignSlug={campaignSlug}
                  leaderSlug={leaderSlug}
                  leaderName={leaderName}
                  onSuccess={() => setSuccess(true)}
                />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
    </PublicCampaignTheme>
  );
}
