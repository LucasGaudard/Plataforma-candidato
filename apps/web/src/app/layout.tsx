import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  applicationName: 'Conecta Eleitor',
  manifest: '/manifest.webmanifest',
  title: {
    default: 'Conecta Eleitor',
    template: '%s | Conecta Eleitor',
  },
  description:
    'Plataforma de gestão, comunicação e relacionamento para campanhas eleitorais.',
  keywords: ['Conecta Eleitor', 'campanha política', 'gestão de campanha', 'participação', 'eleições'],
  authors: [{ name: 'Conecta Eleitor' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'Conecta Eleitor',
    title: 'Conecta Eleitor',
    description:
      'Plataforma de gestão, comunicação e relacionamento para campanhas eleitorais.',
    images: [{ url: `${siteUrl}/icons/icon-512x512.png`, width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conecta Eleitor',
    description:
      'Plataforma de gestão, comunicação e relacionamento para campanhas eleitorais.',
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Conecta Eleitor',
  },
  icons: {
    icon: [
      { url: '/icons/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#db2777',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
