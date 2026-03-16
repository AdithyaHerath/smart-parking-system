import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/lib/constants';

interface Props {
  children: ReactNode;
  allowedRoles: AppRole[];
}

export default function RoleGuard({ children, allowedRoles }: Props) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard
    const redirectMap: Record<string, string> = {
      student: '/dashboard',
      super_admin: '/admin',
      security: '/security',
      cashier: '/cashier',
    };
    return <Navigate to={redirectMap[role] || '/login'} replace />;
  }

  return <>{children}</>;
}
