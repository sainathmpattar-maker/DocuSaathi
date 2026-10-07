import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import IntelligencePipelineModal from '../components/IntelligencePipelineModal';
import {
  getDocuments,
  uploadDocument,
  triggerAnalysis,
  getUserDeadlines,
  type DeadlineWithDoc,
} from '../services/documentsApi';
import type { Document } from '../types/database';
import {
  UploadCloud,
  FileText,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  X,
  FileCheck2,
  Layers,
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineWithDoc[]>([]);

  // Upload & Drag-and-drop state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Analysis pipeline modal state
  const [isPipelineActive, setIsPipelineActive] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Dynamic greeting based on Indian local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = useCallback(async () => {
    try {
      const [docs, dls] = await Promise.all([
        getDocuments(),
        getUserDeadlines().catch(() => []),
      ]);
      setDocuments(docs);
      setDeadlines(dls);
    } catch (err) {
      console.warn('[DocuSaathi] Dashboard load error:', err);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle file drop / selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      alert('Please select a valid PDF, JPG, or PNG document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10 MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  // Upload & start analysis pipeline
  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    try {
      setPipelineError(null);
      setIsPipelineActive(true);

      // 1. Upload to Supabase Storage via backend API
      const uploadedDoc = await uploadDocument(selectedFile);

      // 2. Trigger Gemini Analysis Pipeline
      await triggerAnalysis(uploadedDoc.id);

      // 3. Navigate to analysis dashboard upon completion
      navigate(`/documents/${uploadedDoc.id}/analysis`);
    } catch (err: any) {
      console.error('[DocuSaathi] Upload or analysis failed:', err);
      setPipelineError(err.message || 'Failed to process document with AI.');
    }
  };

  const scrollToUpload = () => {
    uploadAreaRef.current?.scrollIntoView({ behavior: 'smooth' });
    fileInputRef.current?.click();
  };

  // Metrics computation
  const analyzedCount = documents.filter((d) => d.status === 'completed').length;
  const pendingDeadlinesCount = deadlines.filter((d) => !d.completed).length;
  const overdueDeadlinesCount = deadlines.filter((d) => {
    if (d.completed || !d.due_date) return false;
    const due = new Date(d.due_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return due < now;
  }).length;

  return (
    <AppLayout activeTab="dashboard">
      {/* ── Intelligence Pipeline Modal ──────────────────────────────────── */}
      <IntelligencePipelineModal
        isOpen={isPipelineActive}
        fileName={selectedFile?.name || 'Document'}
        isAnalyzing={isPipelineActive}
        error={pipelineError}
        onRetry={handleStartAnalysis}
        onClose={() => setIsPipelineActive(false)}
      />

      {/* ── Header Greeting & Primary CTAs ───────────────────────────────── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            {getGreeting()} 👋
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">
            Your documents, understood.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={scrollToUpload}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-200" />
            Analyze a document
          </button>
          <Link
            to="/documents"
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-sm border border-white/10 transition-colors"
          >
            View documents
          </Link>
        </div>
      </div>

      {/* ── Animated Metrics Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-3xl bg-[#0a1128]/70 border border-white/5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Documents Analyzed
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{analyzedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total verified with AI</p>
        </div>

        <div className="p-5 rounded-3xl bg-[#0a1128]/70 border border-white/5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Upcoming Deadlines
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{pendingDeadlinesCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Pending payments & filings</p>
        </div>

        <div className="p-5 rounded-3xl bg-[#0a1128]/70 border border-white/5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Issues Flagged
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{overdueDeadlinesCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Overdue or inconsistent items</p>
        </div>

        <div className="p-5 rounded-3xl bg-[#0a1128]/70 border border-white/5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Actions Pending
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {pendingDeadlinesCount > 0 ? pendingDeadlinesCount : 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Next steps to complete</p>
        </div>
      </div>

      {/* ── HERO / PROMINENT UPLOAD EXPERIENCE ────────────────────────────── */}
      <div
        ref={uploadAreaRef}
        className="mb-10 rounded-3xl bg-gradient-to-br from-[#0c132e] via-[#091024] to-[#070b18] border border-indigo-500/30 p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mb-8">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              AI Document Ingestion
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
            Turn confusing documents into clear next steps.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
            Upload a bill, invoice, notice, or agreement. DocuSaathi extracts what matters, checks for issues, and tells you what to do next.
          </p>
        </div>

        {/* Drag-and-drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
          className={`relative z-10 rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
              : selectedFile
              ? 'border-indigo-500/50 bg-[#0a1128]/80'
              : 'border-indigo-500/30 hover:border-indigo-400 bg-slate-950/40 hover:bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFile ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600/20 via-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-indigo-500/10">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                Drag & drop your document here, or <span className="text-indigo-400 underline underline-offset-4">browse</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Supports PDF, JPG, JPEG, and PNG files up to 10 MB. Encrypted and processed privately.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] text-slate-400">
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5">GST Invoices</span>
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5">Utility Bills</span>
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5">Tax Notices</span>
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5">Agreements</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 flex-shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="p-2.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-white/5 transition-colors"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartAnalysis();
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  Analyze with DocuSaathi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT DOCUMENTS SECTION ─────────────────────────────────────── */}
      <div className="rounded-3xl bg-[#0a1128]/70 border border-white/5 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Recent Documents</h3>
            <p className="text-xs text-slate-400">Your processed files and intelligence history</p>
          </div>
          <Link
            to="/documents"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            All documents <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.slice(0, 5).map((doc) => {
              const docDate = new Date(doc.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="capitalize">{doc.document_type || 'Unclassified'}</span>
                        <span>•</span>
                        <span>{docDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {doc.status === 'completed' ? (
                      <Link
                        to={`/documents/${doc.id}/analysis`}
                        className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        View Analysis
                      </Link>
                    ) : (
                      <button
                        onClick={async () => {
                          setIsPipelineActive(true);
                          await triggerAnalysis(doc.id);
                          navigate(`/documents/${doc.id}/analysis`);
                        }}
                        className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Analyze Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">No documents yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Upload your first document to get started.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
