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
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: [Role.ADMIN, Role.LEADER, Role.USER] },
  { href: '/dashboard/eventos', label: 'Eventos', icon: '📅', roles: [Role.ADMIN, Role.LEADER, Role.USER] },
  { href: '/dashboard/lives', label: 'Lives', icon: '📺', roles: [Role.ADMIN, Role.LEADER, Role.USER] },
  { href: '/dashboard/posts', label: 'Posts', icon: '📢', roles: [Role.ADMIN] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold font-bold text-brand-900">
              C
            </div>
            <div>
              <p className="text-sm font-bold text-brand-900">Campanha 2026</p>
              <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {filteredItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
