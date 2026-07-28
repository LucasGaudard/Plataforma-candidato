'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Role } from '@platform/types';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';

const links = [
  { href: '/super-admin', label: 'Visão geral' },
  { href: '/super-admin/campanhas', label: 'Campanhas' },
  { href: '/super-admin/campanhas/nova', label: 'Nova campanha' },
];

export function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <ProtectedRoute allowedRoles={[Role.SUPER_ADMIN]}>
      <div className="min-h-screen bg-slate-100 lg:flex">
        <aside className="bg-slate-950 p-6 text-white lg:min-h-screen lg:w-64">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Conecta Eleitor</p>
          <h1 className="mt-2 text-xl font-bold">Super Admin</h1>
          <nav className="mt-8 flex gap-2 overflow-x-auto lg:flex-col">
            {links.map((link) => {
              const active = link.href === '/super-admin'
                ? pathname === link.href
                : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                    active ? 'bg-cyan-500 font-semibold text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 border-t border-slate-800 pt-4 text-sm text-slate-400">
            <p className="truncate">{user?.email}</p>
            <button className="mt-3 text-red-300 hover:text-red-200" onClick={handleLogout}>Sair</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
