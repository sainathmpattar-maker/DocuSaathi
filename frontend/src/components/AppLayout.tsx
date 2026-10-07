import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  FileText,
  LayoutDashboard,
  FolderOpen,
  CalendarClock,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab?: 'dashboard' | 'documents' | 'deadlines' | 'settings';
}

export default function AppLayout({ children, activeTab }: AppLayoutProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName =
    profile?.name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'DocuSaathi User';
  const displayEmail = profile?.email || user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  const navItems = [
    {
      to: '/dashboard',
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      to: '/documents',
      id: 'documents',
      label: 'Documents',
      icon: FolderOpen,
      badge: undefined,
    },
    {
      to: '/deadlines',
      id: 'deadlines',
      label: 'Deadlines',
      icon: CalendarClock,
      badge: undefined,
    },
    {
      to: '/settings',
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-[#050917] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* ── Mobile Top Header ────────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0a1128]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              DocuSaathi
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AI
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* ── Mobile Drawer ────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
          <div className="flex flex-col flex-1 max-w-xs w-full bg-[#0a1128] border-r border-white/10 p-5 justify-between">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-white/5 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-lg text-white">DocuSaathi</span>
                    <p className="text-[11px] text-slate-400">Understand. Verify. Act.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout (Desktop Sidebar + Content) ──────────────────────── */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 bg-[#0a1128]/70 backdrop-blur-xl fixed inset-y-0 left-0 z-40 justify-between">
          <div>
            {/* Logo & Tagline */}
            <div className="h-20 flex flex-col justify-center px-6 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-white">DocuSaathi</span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    AI
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium pl-10.5 mt-0.5">
                Understand. Verify. Act.
              </p>
            </div>

            {/* Navigation links */}
            <nav className="p-4 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/25 via-indigo-600/15 to-transparent text-indigo-300 border-l-2 border-indigo-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 hover:translate-x-0.5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50" />
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Intelligence Engine Status Pill */}
            <div className="mx-4 mt-2 p-3 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/40 to-transparent border border-indigo-500/20 shadow-inner">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-200 tracking-wide">
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Deterministic validation & Indian compliance active
              </p>
            </div>
          </div>

          {/* User Profile Footer in Sidebar */}
          <div className="p-4 border-t border-white/5 bg-slate-950/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{displayName}</p>
                <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20 active:scale-[0.98]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
