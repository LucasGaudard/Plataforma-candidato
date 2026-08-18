'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@platform/ui';
import { SupporterForm } from '@/components/forms/supporter-form';
import { api } from '@/lib/api';
import { redirectAfterPublicReferralRegistration } from '@/lib/public-referral-redirect';
import { PublicCampaignTheme } from './public-campaign-theme';
import { CampaignIdentity } from './campaign-identity';
import { CampaignRegistrationCopy } from './campaign-registration-copy';

interface ReferralRegistrationPageProps {
  campaignSlug: string;
  referrerSlug: string;
  referrerType: 'leader' | 'coordinator';
}

export function ReferralRegistrationPage({
  campaignSlug,
  referrerSlug,
  referrerType,
}: ReferralRegistrationPageProps) {
  const [referrer, setReferrer] = useState<{ firstName: string; lastName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const request = referrerType === 'leader'
      ? api.getLeaderBySlug(campaignSlug, referrerSlug)
      : api.getCoordinatorBySlug(campaignSlug, referrerSlug);
    request
      .then(setReferrer)
      .catch(() => setError('Link de indicação não encontrado'))
      .finally(() => setLoading(false));
  }, [campaignSlug, referrerSlug, referrerType]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>;
  }

  if (error || !referrer) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-bold text-brand-900">Link inválido</h1>
          <p className="mt-2 text-sm text-slate-500">O link de cadastro não foi encontrado.</p>
          <Link href={`/campanhas/${campaignSlug}/cadastro`} className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
            Cadastrar sem indicação
          </Link>
        </Card>
      </div>
    );
  }

  const referrerName = `${referrer.firstName} ${referrer.lastName}`;
  return (
    <PublicCampaignTheme campaignSlug={campaignSlug}>
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center"><Link href="/"><CampaignIdentity /></Link></div>
          <Card padding="lg">
            {success ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">✓</div>
                <h2 className="text-2xl font-bold text-brand-900">Cadastro realizado!</h2>
                <p className="mt-2 text-slate-600">Obrigado pelo seu apoio. Em breve você receberá nossas atualizações pelo WhatsApp.</p>
              </div>
            ) : (
              <>
                <CampaignRegistrationCopy leaderName={referrerName} />
                <div className="mt-6">
                  <SupporterForm
                    campaignSlug={campaignSlug}
                    referrerSlug={referrerSlug}
                    referrerName={referrerName}
                    referrerType={referrerType}
                    onSuccess={() => {
                      setSuccess(true);
                      redirectAfterPublicReferralRegistration();
                    }}
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
