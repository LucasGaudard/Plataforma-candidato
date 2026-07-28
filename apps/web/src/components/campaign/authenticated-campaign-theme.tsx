'use client';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { CampaignThemeProvider } from './campaign-theme-provider';
export function AuthenticatedCampaignTheme({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <CampaignThemeProvider campaign={user?.campaign}>{children}</CampaignThemeProvider>;
}
