import { CampaignLanding } from '@/components/campaign/campaign-landing';
import { configuredPublicCampaignSlug } from '@/lib/public-campaign';

export default function HomePage() {
  if (!configuredPublicCampaignSlug) {
    return <main className="flex min-h-screen items-center justify-center"><p>Campanha não configurada.</p></main>;
  }
  return <CampaignLanding campaignSlug={configuredPublicCampaignSlug} />;
}
