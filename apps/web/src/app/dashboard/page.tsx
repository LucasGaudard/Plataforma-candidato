'use client';

import { Role } from '@platform/types';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminDashboardView } from '@/components/dashboard/admin-dashboard';
import { LeaderDashboardView } from '@/components/dashboard/leader-dashboard';
import { UserDashboardView } from '@/components/dashboard/user-dashboard';
import { useAuth } from '@/contexts/auth-context';

function DashboardContent() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case Role.ADMIN:
      return <AdminDashboardView />;
    case Role.LEADER:
      return <LeaderDashboardView />;
    default:
      return <UserDashboardView />;
  }
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
