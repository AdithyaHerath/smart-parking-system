import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
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

  if (!user) return <Navigate to="/login" replace />;

  const redirectMap: Record<string, string> = {
    student: '/dashboard',
    super_admin: '/admin',
    security: '/security',
    cashier: '/cashier',
  };

  return <Navigate to={redirectMap[role || 'student'] || '/dashboard'} replace />;
}
