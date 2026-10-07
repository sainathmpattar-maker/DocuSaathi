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
    return null; // Return nothing while resolving to avoid flashing content
  }

  if (session) {
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
