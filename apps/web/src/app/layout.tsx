import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: 'Campanha 2026 — Plataforma Política',
    template: '%s | Campanha 2026',
  },
  description:
    'Plataforma oficial da campanha. Cadastre-se, acompanhe novidades, eventos, lives e faça parte da mudança.',
  keywords: ['campanha', 'política', 'deputado', 'eleições 2026'],
  authors: [{ name: 'Campanha 2026' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'Campanha 2026',
    title: 'Campanha 2026 — Plataforma Política',
    description: 'Plataforma oficial da campanha para deputado.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campanha 2026',
    description: 'Plataforma oficial da campanha para deputado.',
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
