'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@platform/ui';
import { SupporterForm } from '@/components/forms/supporter-form';
import { api } from '@/lib/api';
import { redirectAfterPublicReferralRegistration } from '@/lib/public-referral-redirect';
import { PublicCampaignTheme } from './public-campaign-theme';
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
  const referrerInitials = `${referrer.firstName.charAt(0)}${referrer.lastName.charAt(0)}`.toUpperCase();
  const referrerRole = referrerType === 'leader' ? 'Líder da campanha' : 'Coordenador da campanha';
  return (
    <PublicCampaignTheme campaignSlug={campaignSlug}>
      <main className="min-h-screen overflow-x-hidden px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex justify-center">
            <Link href="/" aria-label="Conecta Eleitor — página inicial">
              <Image
                src="/Images/conecta-eleitor-horizontal.png"
                alt="Conecta Eleitor"
                width={1536}
                height={1024}
                priority
                className="h-auto w-44 sm:w-52"
              />
            </Link>
          </div>

          <div className="mx-auto -mt-4 overflow-hidden rounded-xl shadow-sm sm:-mt-6 sm:rounded-2xl">
            <Image
              src="/Images/Paula_quintanilha.png.jpeg"
              alt="Paula Quintanilha, candidata a deputada estadual, número 22252"
              width={1536}
              height={1024}
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="h-auto w-full"
            />
          </div>

          <section aria-labelledby="paula-presentation-title" className="mx-auto max-w-3xl py-10 text-center sm:py-14">
            <h1 id="paula-presentation-title" className="text-3xl font-bold leading-tight text-brand-900 sm:text-4xl">
              Trabalho que transforma. Experiência para fazer ainda mais.
            </h1>
            <div className="mx-auto mt-6 max-w-2xl space-y-4 text-left text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
              <p>Paula Quintanilha é vereadora, mãe, esposa, empresária e engenheira química formada pela UFRRJ.</p>
              <p>Em 2025, foi reconhecida como a melhor vereadora de Seropédica, uma conquista que representa o reconhecimento de um mandato construído com presença, trabalho e compromisso com as pessoas.</p>
              <p>Agora quer levar essa experiência para um desafio ainda maior: a Assembleia Legislativa do Estado do Rio de Janeiro. E, conto com a sua ajuda!</p>
              <p>Porque quem já mostrou trabalho pode fazer ainda mais.</p>
            </div>
          </section>

          <Card padding="lg" className="mx-auto max-w-2xl">
            {success ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">✓</div>
                <h2 className="text-2xl font-bold text-brand-900">Cadastro realizado!</h2>
                <p className="mt-2 text-slate-600">Obrigado pelo seu apoio. Em breve você receberá nossas atualizações pelo WhatsApp.</p>
              </div>
            ) : (
              <>
                <section aria-labelledby="referral-invitation-title" className="border-b border-slate-200 pb-6">
                  <p id="referral-invitation-title" className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Você recebeu um convite de:
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                      {referrerInitials}
                    </div>
                    <div>
                      <p className="font-bold text-brand-900">{referrerName}</p>
                      <p className="text-sm text-slate-500">{referrerRole}</p>
                    </div>
                  </div>
                </section>

                <div className="mt-7">
                  <CampaignRegistrationCopy headingLevel="h2" />
                </div>
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
      </main>
    </PublicCampaignTheme>
  );
}
