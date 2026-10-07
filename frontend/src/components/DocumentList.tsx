import { useState } from 'react';
import type { Document } from '../types/database';
import { getDocumentFileUrl, deleteDocument } from '../services/documentsApi';
import {
  FileText,
  FileImage,
  Trash2,
  ExternalLink,
  Calendar,
  HardDrive,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  FileQuestion
} from 'lucide-react';

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  onRefresh: () => void;
  onSelectDocument?: (document: Document) => void;
}

export default function DocumentList({
  documents,
  loading,
  onRefresh,
  onSelectDocument,
}: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  const handleOpenSecureFile = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    setOpeningId(docId);
    try {
      const { signedUrl } = await getDocumentFileUrl(docId);
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to open document file.');
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (docId: string, docName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete "${docName}"?`)) {
      return;
    }

    setActionError(null);
    setDeletingId(docId);
    try {
      await deleteDocument(docId);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Analyzed</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full animate-pulse">
            <Clock className="w-3 h-3 text-indigo-400 animate-spin" />
            <span>Processing</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'uploaded':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>Uploaded</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="w-full h-20 bg-slate-900/40 border border-white/5 rounded-2xl animate-pulse flex items-center px-6 gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="w-48 h-4 bg-white/5 rounded" />
              <div className="w-24 h-3 bg-white/5 rounded" />
            </div>
            <div className="w-20 h-6 bg-white/5 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-[#0a1128]/30 border border-white/5 rounded-3xl backdrop-blur-xl">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400">
          <FileQuestion className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-white mb-1">No documents in your vault</h4>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Upload your GST invoices, legal notices, or bank letters above to see them organized here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-xl flex items-center justify-between">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-white font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {documents.map((doc) => {
          const isPdf = doc.file_type?.includes('pdf') || doc.file_name.endsWith('.pdf');
          const isDeleting = deletingId === doc.id;
          const isOpening = openingId === doc.id;

          return (
            <div
              key={doc.id}
              onClick={() => onSelectDocument && onSelectDocument(doc)}
              className="group bg-[#0a1128]/60 hover:bg-[#0a1128]/90 border border-white/8 hover:border-indigo-500/30 rounded-2xl p-4 sm:p-5 transition-all duration-200 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-lg hover:shadow-indigo-950/30"
            >
              {/* Left: Icon and Metadata */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                    isPdf
                      ? 'bg-rose-500/15 border border-rose-500/25 text-rose-400'
                      : 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-400'
                  }`}
                >
                  {isPdf ? <FileText className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white truncate max-w-sm" title={doc.file_name}>
                      {doc.file_name}
                    </h4>
                    {getStatusBadge(doc.status)}
                    {doc.document_type && (
                      <span className="text-[10px] font-semibold bg-white/5 border border-white/10 text-slate-300 px-2 py-0.5 rounded-md">
                        {doc.document_type}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-slate-500" />
                      {formatFileSize(doc.file_size)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {formatDate(doc.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={(e) => handleOpenSecureFile(doc.id, e)}
                  disabled={isOpening}
                  title="View / Download via secure signed URL"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/25 hover:border-indigo-500/40 transition-all duration-200 disabled:opacity-50"
                >
                  {isOpening ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  <span>View</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDelete(doc.id, doc.file_name, e)}
                  disabled={isDeleting}
                  title="Delete document and remove from secure storage"
                  className="p-2 rounded-xl text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
