'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Role } from '@platform/types';
import { useAuth } from '@/contexts/auth-context';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: [Role.ADMIN, Role.COORDINATOR, Role.LEADER, Role.USER] },
  { href: '/dashboard/coordenadores', label: 'Coordenadores', icon: '👔', roles: [Role.ADMIN] },
  { href: '/dashboard/lideres', label: 'Líderes', icon: '👥', roles: [Role.ADMIN] },
  { href: '/dashboard/apoiadores', label: 'Apoiadores', icon: '🤝', roles: [Role.ADMIN, Role.COORDINATOR, Role.LEADER] },
  { href: '/dashboard/eventos', label: 'Eventos', icon: '📅', roles: [Role.ADMIN, Role.LEADER, Role.USER] },
  { href: '/dashboard/lives', label: 'Lives', icon: '📺', roles: [Role.ADMIN, Role.LEADER, Role.USER] },
  { href: '/dashboard/posts', label: 'Posts', icon: '📢', roles: [Role.ADMIN] },
  { href: '/dashboard/configuracoes/whatsapp', label: 'Config WhatsApp', icon: '⚙️', roles: [Role.ADMIN] },
];

const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.COORDINATOR]: 'Coordenador',
  [Role.LEADER]: 'Líder',
  [Role.USER]: 'Apoiador',
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-100 bg-white">
      {/* Logo / Marca */}
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-brand shadow-brand">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <p className="text-sm font-bold text-brand-700 tracking-wide">Conecta Eleitor</p>
              <p className="text-[10px] text-slate-400 font-medium">{roleLabels[user.role]}</p>
            </div>
          </Link>
          <NotificationBell />
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-0.5 p-3">
        {filteredItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-brand-50 text-brand-700 border border-brand-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Usuário */}
      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
