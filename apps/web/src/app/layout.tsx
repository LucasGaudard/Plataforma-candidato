import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: 'Conecta Eleitor — Paula Quintanilha',
    template: '%s | Conecta Eleitor',
  },
  description:
    'Plataforma oficial da campanha de Paula Quintanilha. Cadastre-se, acompanhe novidades, eventos, lives e faça parte da mudança que a Baixada precisa.',
  keywords: ['Paula Quintanilha', 'Conecta Eleitor', 'campanha política', 'deputada estadual', 'Baixada Fluminense', 'eleições 2026'],
  authors: [{ name: 'Conecta Eleitor' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'Conecta Eleitor',
    title: 'Conecta Eleitor — Paula Quintanilha',
    description: 'Plataforma oficial de gestão de apoiadores e mobilização digital da campanha de Paula Quintanilha.',
    images: [{ url: `${siteUrl}/Images/PaulaQuintanilha.jpeg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conecta Eleitor — Paula Quintanilha',
    description: 'Plataforma de gestão de apoiadores e mobilização digital.',
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
