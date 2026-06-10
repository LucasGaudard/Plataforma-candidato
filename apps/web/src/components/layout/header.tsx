'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@platform/ui';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-gold font-bold text-brand-900">
            C
          </div>
          <span className="text-lg font-bold text-white">Campanha 2026</span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden text-sm font-medium text-white/80 hover:text-white sm:block"
              >
                Dashboard
              </Link>
              <Button variant="outline" size="sm" onClick={logout} className="border-white/30 text-white hover:bg-white/10">
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  Entrar
                </Button>
              </Link>
              <Link href="/cadastro">
                <Button variant="secondary" size="sm">
                  Cadastrar
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
