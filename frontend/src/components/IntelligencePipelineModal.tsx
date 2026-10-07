import { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Loader2,
  FileText,
  AlertTriangle,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface Stage {
  number: string;
  name: string;
  description: string;
  substeps: string[];
}

const STAGES: Stage[] = [
  {
    number: '01',
    name: 'Understand',
    description: 'Document received & multimodal structure ingestion',
    substeps: ['Ingesting document layout', 'Detecting Indian document category'],
  },
  {
    number: '02',
    name: 'Extract',
    description: 'Entity recognition & financial fields extraction',
    substeps: ['Extracting GSTIN, invoice & entity IDs', 'Structuring financial totals & items'],
  },
  {
    number: '03',
    name: 'Verify',
    description: 'Deterministic math & compliance verification',
    substeps: ['Verifying tax math (CGST + SGST = Tax)', 'Checking temporal date sequences'],
  },
  {
    number: '04',
    name: 'Explain',
    description: 'Plain-language synthesis & risk detection',
    substeps: ['Formulating clear plain-language summary', 'Flagging discrepancies & notice clauses'],
  },
  {
    number: '05',
    name: 'Act',
    description: 'Action plan generation & deadline mapping',
    substeps: ['Mapping urgent due dates & countdowns', 'Synthesizing step-by-step action plan'],
  },
];

interface IntelligencePipelineModalProps {
  isOpen: boolean;
  fileName: string;
  isAnalyzing: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClose?: () => void;
}

export default function IntelligencePipelineModal({
  isOpen,
  fileName,
  isAnalyzing,
  error,
  onRetry,
  onClose,
}: IntelligencePipelineModalProps) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStageIdx(0);
      setProgress(10);
      return;
    }

    if (error) {
      return;
    }

    // Step through the animation stages realistically
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (!isAnalyzing) {
          // If analysis finished, jump swiftly to 100%
          return 100;
        }

        // Creep forward naturally up to 92% while waiting for backend
        if (prev < 90) {
          const increment = Math.max(1, Math.floor((92 - prev) / 8));
          const next = prev + increment;
          if (next > 75) setCurrentStageIdx(4);
          else if (next > 55) setCurrentStageIdx(3);
          else if (next > 35) setCurrentStageIdx(2);
          else if (next > 18) setCurrentStageIdx(1);
          else setCurrentStageIdx(0);
          return next;
        }
        return prev;
      });
    }, 700);

    return () => clearInterval(interval);
  }, [isOpen, isAnalyzing, error]);

  useEffect(() => {
    if (!isAnalyzing && isOpen && !error) {
      setProgress(100);
      setCurrentStageIdx(4);
    }
  }, [isAnalyzing, isOpen, error]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0e1630] via-[#0a1128] to-[#070b1e] border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/80 overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between mb-6 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-widest uppercase text-cyan-400">
                  DocuSaathi Intelligence Engine
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                DocuSaathi is analyzing your document...
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              {progress}%
            </span>
            <p className="text-[11px] text-slate-400 font-medium">Pipeline execution</p>
          </div>
        </div>

        {/* Document Identifier Banner */}
        <div className="relative z-10 mb-6 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Target document</p>
              <p className="text-sm font-semibold text-slate-200 truncate">{fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Gemini 2.5 Flash</span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="relative z-10 mb-6">
          <div className="w-full h-2 rounded-full bg-slate-900 border border-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-cyan-400 transition-all duration-500 ease-out shadow-lg shadow-indigo-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error State if pipeline failed */}
        {error ? (
          <div className="relative z-10 my-4 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-rose-100">
                  Something went wrong while analyzing this document.
                </h3>
                <p className="text-xs text-rose-300 mt-1 leading-relaxed">{error}</p>
                <div className="mt-4 flex items-center gap-3">
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-colors flex items-center gap-1.5 shadow-md shadow-rose-900/40"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Try Again
                    </button>
                  )}
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 hover:text-white text-xs font-semibold hover:bg-white/10 transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Sequential Pipeline Stages */
          <div className="relative z-10 space-y-3">
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIdx || progress === 100;
              const isCurrent = idx === currentStageIdx && progress < 100;

              return (
                <div
                  key={stage.number}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                    isCurrent
                      ? 'bg-gradient-to-r from-indigo-950/60 to-slate-900/50 border-indigo-500/40 shadow-md shadow-indigo-950/50 scale-[1.01]'
                      : isPast
                      ? 'bg-white/[0.02] border-white/5 text-slate-400'
                      : 'bg-transparent border-transparent opacity-40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Step Indicator */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs transition-colors flex-shrink-0 ${
                          isPast
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isCurrent
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                            : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {isPast ? <Check className="w-3.5 h-3.5" /> : stage.number}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm tracking-tight ${
                              isCurrent ? 'text-white' : isPast ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {stage.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{stage.description}</p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 pl-2">
                      {isPast ? (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Done
                        </span>
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                      ) : (
                        <span className="text-xs text-slate-400">Waiting</span>
                      )}
                    </div>
                  </div>

                  {/* Substeps when active */}
                  {isCurrent && (
                    <div className="mt-2.5 pt-2.5 border-t border-indigo-500/20 flex flex-wrap gap-2 text-[11px] text-indigo-300">
                      {stage.substeps.map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20"
                        >
                          ✓ {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Secure ephemeral processing • Zero data retention outside Supabase</span>
          <span className="text-[11px] font-medium text-slate-400">DocuSaathi v1.0</span>
        </div>
      </div>
    </div>
  );
}
