import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

/**
 * ProtectedRoute:
 * - Shows an expressive branded loading screen while verifying Supabase session.
 * - Redirects unauthenticated users to /login preserving the requested path.
 * - Renders protected content safely without flash of unauthorized content.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050917] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          {/* Animated Brand Shield */}
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center shadow-md animate-bounce">
              <Sparkles className="w-3 h-3 text-slate-950" />
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white mb-2">DocuSaathi</h2>
          <p className="text-slate-400 text-sm font-medium animate-pulse">
            Verifying secure session...
          </p>

          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-6">
            <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-violet-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    // Preserve requested location for post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
