import { Link } from 'react-router-dom';
import { FileText, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#050917] text-slate-100 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
        <FileText className="w-8 h-8 text-rose-400" />
      </div>
      <h1 className="text-6xl font-black tracking-tighter mb-4">404</h1>
      <p className="text-slate-400 text-lg mb-8">This page doesn&apos;t exist.</p>
      <Link
        to="/"
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
      >
        <Home className="w-4 h-4" />
        Back to home
      </Link>
    </div>
  );
}
