import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  FileText,
  Zap,
  Shield,
  ArrowRight,
  ShieldCheck,
  LogIn,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Smart Classification',
    description: 'Instantly identifies GST invoices, utility bills, legal notices, bank letters and more.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Plain-Language Explanations',
    description: 'Complex legal and financial documents translated into clear, actionable language in English & Hindi.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Risk Detection',
    description: 'Flags errors, missed deadlines, and hidden penalty clauses before they become costly issues.',
  },
];

export default function LandingPage() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-[#050917] text-slate-100 selection:bg-indigo-500 selection:text-white">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#050917]/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight">DocuSaathi</span>
          </Link>

          <div className="flex items-center gap-3">
            {session ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-5 py-2 rounded-xl transition-all duration-200 hover:scale-105 text-sm shadow-md shadow-indigo-500/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold px-4 py-2 text-sm transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl transition-all duration-200 hover:scale-105 text-sm shadow-md shadow-indigo-500/20"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-8 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Bank-Grade Privacy & AI Document Intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-none mb-6">
            Turn confusing documents{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
              into clear next steps.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10 font-normal">
            Upload a bill, invoice, notice, or agreement. DocuSaathi extracts what matters, detects potential issues, and tells you what to do next.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={session ? "/dashboard" : "/signup"}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:scale-105 shadow-xl shadow-indigo-500/25 text-lg"
            >
              <span>Analyze a Document</span> <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Feature Row */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-200 text-xs sm:text-sm px-4 py-2 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">AI Document Understanding</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-200 text-xs sm:text-sm px-4 py-2 rounded-xl backdrop-blur-sm">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Potential Issue Detection</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-200 text-xs sm:text-sm px-4 py-2 rounded-xl backdrop-blur-sm">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Deadline Intelligence</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6 border-t border-white/5 bg-[#070d24]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-white">
              Everything you need to understand any document
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              DocuSaathi analyses, explains, detects risks, and tracks deadlines — in seconds.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-slate-500 text-xs sm:text-sm">
        © 2026 DocuSaathi — Built for Indian Citizens & Enterprises.
      </footer>
    </div>
  );
}
