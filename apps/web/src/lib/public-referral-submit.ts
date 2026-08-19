import type { CreateSupporterRequest } from '@platform/types';

type ReferralApi = {
  createSupporter(campaignSlug: string, referrerSlug: string, body: CreateSupporterRequest): Promise<unknown>;
  createCoordinatorSupporter(campaignSlug: string, referrerSlug: string, body: CreateSupporterRequest): Promise<unknown>;
};

export async function submitPublicReferralRegistration(
  api: ReferralApi,
  input: {
    campaignSlug: string;
    referrerSlug: string;
    referrerType: 'leader' | 'coordinator';
    payload: CreateSupporterRequest;
  },
  onSuccess: () => void,
) {
  if (input.referrerType === 'leader') {
    await api.createSupporter(input.campaignSlug, input.referrerSlug, input.payload);
  } else {
    await api.createCoordinatorSupporter(input.campaignSlug, input.referrerSlug, input.payload);
  }
  onSuccess();
}
