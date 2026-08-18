export const PUBLIC_REFERRAL_SUCCESS_URL = 'https://www.instagram.com/paulaquintanilha/';

interface NavigationLocation {
  assign(url: string): void;
}

export function redirectAfterPublicReferralRegistration(
  location: NavigationLocation = window.location,
) {
  location.assign(PUBLIC_REFERRAL_SUCCESS_URL);
}
