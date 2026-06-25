'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@platform/ui';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          {/* Logo Conecta Eleitor */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand shadow-brand">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2v2h-2zm0-8h2v6h-2z" className="hidden"/>
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold text-white tracking-wide">Conecta Eleitor</span>
            <span className="text-[10px] text-white/50 font-medium">Plataforma Política</span>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden text-sm font-medium text-white/80 hover:text-white transition-colors sm:block"
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
                <Button size="sm" className="bg-white text-brand-700 hover:bg-brand-50 font-semibold shadow-brand">
                  Quero apoiar
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
