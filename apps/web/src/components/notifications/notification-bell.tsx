'use client';

import { useCallback, useEffect, useState } from 'react';
import type { NotificationPublic } from '@platform/types';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPublic[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getNotifications({ limit: 10 });
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleRead(id: string) {
    await api.markNotificationRead(id);
    load();
  }

  async function handleReadAll() {
    await api.markAllNotificationsRead();
    load();
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notificações"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-brand-900">Notificações</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleReadAll}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <p className="p-4 text-center text-sm text-slate-400">Carregando...</p>
              )}
              {!loading && notifications.length === 0 && (
                <p className="p-4 text-center text-sm text-slate-400">Nenhuma notificação</p>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && handleRead(n.id)}
                  className={`w-full border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                    !n.read ? 'bg-brand-50/50' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(n.createdAt).toLocaleString('pt-BR')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
