import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldCheck, Zap, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#050917] text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/15 via-violet-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-gradient-to-tl from-cyan-500/10 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top minimal header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-20">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            DocuSaathi
          </span>
        </Link>
        <Link
          to="/"
          className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
        >
          Back to home <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Main split grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">
        {/* Left column: Hero & Value Proposition */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold px-3.5 py-1.5 rounded-full w-fit">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Bank-Grade Document Intelligence</span>
          </div>

          {/* Bold headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
              Understand your documents.{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
                Know what to do next.
              </span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl font-normal">
              From GST notices and rent agreements to bank statements and medical bills — transform complex paperwork into instant clarity, risk alerts, and clear deadlines.
            </p>
          </div>

          {/* 3-Step Flow Visual */}
          <div className="bg-[#0a1128]/70 border border-white/10 rounded-2xl p-5 backdrop-blur-xl space-y-3.5 shadow-xl">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> How DocuSaathi Works
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col items-center">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs mb-1.5">
                  1
                </div>
                <div className="font-semibold text-xs text-slate-200">Upload</div>
                <div className="text-[10px] text-slate-400">PDF, JPG, PNG</div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col items-center">
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs mb-1.5">
                  2
                </div>
                <div className="font-semibold text-xs text-slate-200">AI Analysis</div>
                <div className="text-[10px] text-slate-400">Gemini Extraction</div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col items-center">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs mb-1.5">
                  3
                </div>
                <div className="font-semibold text-xs text-slate-200">Action Plan</div>
                <div className="text-[10px] text-slate-400">Risks & Chat</div>
              </div>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Row Level Security (RLS) guarantees your files remain 100% private</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Multi-language summaries with native support for Hindi and English</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>No AI training on uploaded personal documents</span>
            </div>
          </div>
        </div>

        {/* Right column: Auth Card */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-md bg-[#0a1128]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-indigo-950/50">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                {title}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Child Form Component */}
            {children}

            {/* Security footnote */}
            <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Encrypted via Supabase Auth & Secure Session Tokens</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500 relative z-10 border-t border-white/5">
        © 2026 DocuSaathi • Built for Indian citizens, businesses, and professionals.
      </footer>
    </div>
  );
}
