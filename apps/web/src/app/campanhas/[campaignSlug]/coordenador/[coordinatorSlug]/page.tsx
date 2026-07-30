'use client';

import { useParams } from 'next/navigation';
import { ReferralRegistrationPage } from '@/components/campaign/referral-registration-page';

export default function CampaignCoordinatorRegistrationPage() {
  const params = useParams<{ campaignSlug: string; coordinatorSlug: string }>();
  return (
    <ReferralRegistrationPage
      campaignSlug={params.campaignSlug}
      referrerSlug={params.coordinatorSlug}
      referrerType="coordinator"
    />
  );
}
