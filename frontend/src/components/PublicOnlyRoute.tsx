import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PublicOnlyRouteProps {
  children?: React.ReactNode;
}

/**
 * PublicOnlyRoute:
 * Prevents already authenticated users from seeing the login/signup pages again.
 * Redirects directly to /dashboard or their intended destination.
 */
export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050917] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session) {
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
