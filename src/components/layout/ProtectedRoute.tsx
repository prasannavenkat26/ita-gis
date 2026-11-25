import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream-50 dark:bg-forest-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-forest-200 border-t-forest-500 rounded-full animate-spin" />
          <p className="text-sm text-forest-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
