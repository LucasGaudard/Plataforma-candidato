import Link from 'next/link';
import { Card } from '@platform/ui';
import { RegisterForm } from '@/components/forms/register-form';
import { PublicCampaignTheme } from '@/components/campaign/public-campaign-theme';
import { CampaignIdentity } from '@/components/campaign/campaign-identity';

export default function CampaignRegistrationPage({
  params,
}: {
  params: { campaignSlug: string };
}) {
  return (
    <PublicCampaignTheme campaignSlug={params.campaignSlug}>
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/"><CampaignIdentity /></Link>
        </div>

        <Card padding="lg">
          <h1 className="text-2xl font-bold text-brand-900">Criar conta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Preencha seus dados para se cadastrar na campanha
          </p>

          <div className="mt-6">
            <RegisterForm campaignSlug={params.campaignSlug} />
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              Entrar
            </Link>
          </p>
        </Card>
      </div>
    </div>
    </PublicCampaignTheme>
  );
}
