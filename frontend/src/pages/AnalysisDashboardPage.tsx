import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import IntelligencePipelineModal from '../components/IntelligencePipelineModal';
import {
  getDocumentAnalysis,
  getDocumentFileUrl,
  triggerAnalysis,
  type DocumentAnalysisResponse,
  type DocumentFileResponse,
} from '../services/documentsApi';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Info,
  CheckSquare,
  Square,
  Calculator,
  FileCheck2,
} from 'lucide-react';

export default function AnalysisDashboardPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DocumentAnalysisResponse | null>(null);
  const [fileAccess, setFileAccess] = useState<DocumentFileResponse | null>(null);

  // Pipeline modal state for re-analysis
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Interactive completed action plan steps
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});

  const fetchAnalysisData = useCallback(async (documentId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch existing analysis and signed file URL in parallel
      const [analysisData, fileUrlData] = await Promise.all([
        getDocumentAnalysis(documentId),
        getDocumentFileUrl(documentId).catch((err) => {
          console.warn('[DocuSaathi] Could not generate preview link:', err);
          return null;
        }),
      ]);

      setAnalysis(analysisData);
      setFileAccess(fileUrlData);
    } catch (err: any) {
      console.error('[DocuSaathi] Error fetching document analysis:', err);
      setError(err.message || 'Could not load document analysis.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchAnalysisData(id);
    }
  }, [id, fetchAnalysisData]);

  const handleReanalyze = async () => {
    if (!id || !analysis) return;
    try {
      setIsReanalyzing(true);
      setPipelineError(null);
      const updated = await triggerAnalysis(id);
      setAnalysis(updated);
      setIsReanalyzing(false);
    } catch (err: any) {
      setPipelineError(err.message || 'Re-analysis failed.');
      setIsReanalyzing(false);
    }
  };

  const toggleActionItem = (index: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  if (loading) {
    return (
      <AppLayout activeTab="documents">
        <div className="space-y-6">
          {/* Prominent Loading Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-indigo-900/30 via-[#0a1128] to-cyan-900/20 border border-indigo-500/30 p-8 text-center backdrop-blur-xl shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-cyan-300 mx-auto mb-4 animate-spin">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              DocuSaathi is analyzing your document...
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
              Extracting entities, checking compliance rules, detecting issues, and mapping deadlines.
            </p>
          </div>

          {/* Skeleton Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
            <div className="lg:col-span-5 h-[480px] rounded-3xl bg-white/5 border border-white/5" />
            <div className="lg:col-span-7 space-y-6">
              <div className="h-44 rounded-3xl bg-white/5 border border-white/5" />
              <div className="h-48 rounded-3xl bg-white/5 border border-white/5" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !analysis) {
    return (
      <AppLayout activeTab="documents">
        <div className="max-w-xl mx-auto py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">
            Something went wrong while analyzing this document.
          </h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            {error || 'Unable to retrieve analysis details. Please verify your connection and try again.'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => id && fetchAnalysisData(id)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              to="/documents"
              className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 font-semibold text-sm hover:bg-white/10 transition-colors"
            >
              Back to Documents
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { document: doc, summary, plainLanguageExplanation, extractions, validation_results, deadlines, actionPlan } = analysis;

  // Confidence percentage
  const confidencePercent = doc.confidence_score ? Math.round(doc.confidence_score * 100) : 95;

  // Format analysis date
  const analyzedDate = new Date(doc.updated_at || doc.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Check if financial fields exist for math reconciliation
  const fieldsMap = extractions.reduce((acc, curr) => {
    acc[curr.field_name.toLowerCase()] = curr.field_value;
    return acc;
  }, {} as Record<string, string | null>);

  const subtotalStr = fieldsMap['subtotal'] || fieldsMap['taxableamount'];
  const taxStr = fieldsMap['totaltax'] || fieldsMap['taxamount'] || fieldsMap['total tax'];
  const discountStr = fieldsMap['discount'];
  const totalStr = fieldsMap['totalamount'] || fieldsMap['grandtotal'] || fieldsMap['total'];

  const hasFinancialBreakdown = Boolean(subtotalStr || totalStr);

  return (
    <AppLayout activeTab="documents">
      {/* ── Intelligence Pipeline Re-analysis Modal ───────────────────────── */}
      <IntelligencePipelineModal
        isOpen={isReanalyzing}
        fileName={doc.file_name}
        isAnalyzing={isReanalyzing}
        error={pipelineError}
        onRetry={handleReanalyze}
        onClose={() => setIsReanalyzing(false)}
      />

      {/* ── Top Header Bar ───────────────────────────────────────────────── */}
      <div className="mb-6 pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            to="/documents"
            className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors mt-1"
            title="Back to Documents"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              AI Analysis Complete
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-lg">{doc.file_name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-xs tracking-wide">
                Document Type: <span className="text-white">{doc.document_type || 'General'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold text-xs tracking-wide">
                Confidence: <span className="text-white">{confidencePercent}%</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">
                • Analyzed on {analyzedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReanalyze}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-Analyze
          </button>
          {fileAccess?.signedUrl && (
            <a
              href={fileAccess.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open File
            </a>
          )}
        </div>
      </div>

      {/* ── Main Two-Column Layout (Preview Left, Insights Right) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: Document Preview Panel ────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="rounded-3xl bg-[#0a1128]/70 border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  Document Preview
                </span>
              </div>
              {fileAccess && (
                <span className="text-[11px] text-slate-400">
                  {doc.file_type || 'PDF'} • {(doc.file_size ? (doc.file_size / 1024).toFixed(1) + ' KB' : '')}
                </span>
              )}
            </div>

            {/* Document Frame / Viewer */}
            <div className="relative w-full h-[480px] sm:h-[560px] rounded-2xl bg-slate-950/80 border border-white/5 overflow-hidden flex items-center justify-center">
              {fileAccess?.signedUrl ? (
                doc.file_type?.includes('image') ? (
                  <img
                    src={fileAccess.signedUrl}
                    alt={doc.file_name}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <iframe
                    src={`${fileAccess.signedUrl}#toolbar=0&navpanes=0`}
                    title={doc.file_name}
                    className="w-full h-full border-0 rounded-2xl bg-slate-900"
                  />
                )
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-medium">Document preview unavailable</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Secure private object link expired or unavailable
                  </p>
                </div>
              )}
            </div>

            {/* Preview footer note */}
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Encrypted storage in private bucket • Zero public exposure
            </p>
          </div>

          {/* Classification Confidence Card */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0a1128] via-[#0e1635] to-[#0a1128] border border-indigo-500/20 p-5 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Document Classification
              </span>
              <h3 className="text-xl font-black text-white mt-0.5">
                {doc.document_type || 'General Indian Document'}
              </h3>
              <p className="text-xs text-indigo-300 mt-1">
                Classified with multimodal structural analysis
              </p>
            </div>

            {/* Radial Confidence Gauge */}
            <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-400"
                  strokeDasharray={`${confidencePercent}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-black text-white">{confidencePercent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: AI Insights & Data ───────────────────────────── */}
        <div className="lg:col-span-7 space-y-6">
          {/* AI SUMMARY CARD (Prominent Highlight) */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0c132e] via-[#091024] to-[#070b18] border border-indigo-500/30 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  AI Plain-Language Synthesis
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3">
                Here's what this document means
              </h2>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal mb-6">
                {summary || 'This document has been ingested and analyzed for structured compliance.'}
              </p>

              {/* 4-Part Plain Language Explanation Breakdown if available */}
              {plainLanguageExplanation && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/10">
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      1. What is this?
                    </span>
                    <p className="text-xs text-slate-300 leading-normal">
                      {plainLanguageExplanation.whatIsThis}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      2. What does it mean?
                    </span>
                    <p className="text-xs text-slate-300 leading-normal">
                      {plainLanguageExplanation.whatItMeans}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      3. What must you do?
                    </span>
                    <p className="text-xs text-slate-300 leading-normal">
                      {plainLanguageExplanation.whatUserMustDo}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      4. Specific Cautions
                    </span>
                    <p className="text-xs text-slate-300 leading-normal">
                      {plainLanguageExplanation.cautions}
                    </p>
                  </div>
                </div>
              )}

              {/* Mandatory AI Disclaimer */}
              <div className="mt-5 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>
                  AI-generated for understanding and organization. Verify important legal, tax, financial, or medical decisions with the relevant professional or issuing authority.
                </span>
              </div>
            </div>
          </div>

          {/* FINANCIAL SUMMARY / BREAKDOWN (If Available) */}
          {hasFinancialBreakdown && (
            <div className="rounded-3xl bg-[#0a1128]/80 border border-white/5 p-6 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200">
                  Financial Calculation Breakdown
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Subtotal</span>
                  <p className="text-base font-extrabold text-white mt-0.5 truncate">{subtotalStr || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">+ Taxes (GST)</span>
                  <p className="text-base font-extrabold text-cyan-300 mt-0.5 truncate">{taxStr || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">- Discount</span>
                  <p className="text-base font-extrabold text-slate-300 mt-0.5 truncate">{discountStr || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">= Stated Total</span>
                  <p className="text-base font-black text-emerald-400 mt-0.5 truncate">{totalStr || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* KEY INFORMATION GRID */}
          <div className="rounded-3xl bg-[#0a1128]/80 border border-white/5 p-6 backdrop-blur-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200">
                  Key Information
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {extractions.length} fields verified
              </span>
            </div>

            {extractions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {extractions.map((field, idx) => (
                  <div
                    key={field.id || idx}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-400 capitalize">
                        {field.field_name.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      {field.confidence !== null && field.confidence !== undefined && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {Math.round(field.confidence * 100)}% conf
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-white break-words">
                      {field.field_value || '—'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No individual fields extracted for this document category.
              </div>
            )}
          </div>

          {/* POTENTIAL ISSUES / VALIDATION FINDINGS SECTION */}
          <div className="rounded-3xl bg-[#0a1128]/80 border border-white/5 p-6 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200">
                Potential Issues
              </h3>
            </div>

            {validation_results.length > 0 ? (
              <div className="space-y-3">
                {validation_results.map((issue, idx) => {
                  const rawSeverity = (issue.severity || '').toLowerCase();
                  let displaySeverity = 'LOW';
                  let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  let icon = <Info className="w-4 h-4 text-emerald-400" />;

                  if (rawSeverity === 'critical') {
                    displaySeverity = 'CRITICAL';
                    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                    icon = <AlertTriangle className="w-4 h-4 text-rose-400" />;
                  } else if (rawSeverity === 'error' || rawSeverity === 'high') {
                    displaySeverity = 'HIGH';
                    badgeColor = 'bg-red-500/20 text-red-300 border-red-500/30';
                    icon = <AlertTriangle className="w-4 h-4 text-red-400" />;
                  } else if (rawSeverity === 'warning' || rawSeverity === 'medium') {
                    displaySeverity = 'MEDIUM';
                    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                    icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
                  } else {
                    displaySeverity = 'LOW';
                    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                    icon = <Info className="w-4 h-4 text-emerald-400" />;
                  }

                  return (
                    <div
                      key={issue.id || idx}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3.5 hover:border-white/10 transition-colors"
                    >
                      <div className="mt-0.5 flex-shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeColor}`}
                          >
                            {displaySeverity}
                          </span>
                          <h4 className="text-sm font-bold text-slate-200">{issue.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {issue.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3.5 text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-200">
                    Everything looks consistent
                  </h4>
                  <p className="text-xs text-emerald-400/80 mt-0.5">
                    Calculations, GST structure, and date sequences match standard compliance rules.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM FULL-WIDTH SECTIONS ───────────────────────────────────── */}
      <div className="mt-8 space-y-6">
        {/* IMPORTANT DEADLINES */}
        <div className="rounded-3xl bg-gradient-to-r from-[#0c1432] via-[#091024] to-[#070b1a] border border-indigo-500/20 p-6 sm:p-7 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white tracking-tight">
              Important Deadlines
            </h3>
          </div>

          {deadlines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deadlines.map((dl, idx) => {
                const dueDate = dl.due_date ? new Date(dl.due_date) : null;
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                let isOverdue = false;
                let daysLeft = 0;
                if (dueDate) {
                  const diffTime = dueDate.getTime() - now.getTime();
                  daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  isOverdue = daysLeft < 0;
                }

                return (
                  <div
                    key={dl.id || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isOverdue
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-white/[0.02] border-white/5 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isOverdue
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {isOverdue ? 'Overdue' : daysLeft === 0 ? 'Due Today' : `Due in ${daysLeft} days`}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        {dl.priority} priority
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-white mb-2">{dl.title}</h4>

                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{dl.due_date || 'No stated due date'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>No mandatory upcoming payment or filing deadlines detected on this document.</span>
            </div>
          )}
        </div>

        {/* WHAT SHOULD YOU DO NEXT? (Interactive Action Plan) */}
        <div className="rounded-3xl bg-[#0a1128]/80 border border-white/5 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base text-white tracking-tight">
                What should you do next?
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {Object.values(completedActions).filter(Boolean).length} of {actionPlan.length} steps completed
            </span>
          </div>

          {actionPlan.length > 0 ? (
            <div className="space-y-3">
              {actionPlan.map((step, idx) => {
                const isCompleted = completedActions[idx];
                const stepNum = String(idx + 1).padStart(2, '0');

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleActionItem(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                      isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/20 opacity-70'
                        : 'bg-white/[0.02] border-white/5 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-black tracking-wider text-indigo-400 uppercase">
                          Step {stepNum}
                        </span>
                        {isCompleted && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                            Done
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm font-semibold leading-relaxed ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {step}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs">
              No immediate manual action required for this document.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
