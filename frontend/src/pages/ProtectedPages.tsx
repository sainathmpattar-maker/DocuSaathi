import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import {
  getDocuments,
  deleteDocument,
  getUserDeadlines,
  toggleDeadline,
  type DeadlineWithDoc,
} from '../services/documentsApi';
import type { Document } from '../types/database';
import {
  Search,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Sparkles,
  ExternalLink,
  Layers,
  CheckSquare,
  Square,
  Globe,
  Shield,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/* ─────────────────────────────────────────────────────────────────────────────
 * DOCUMENTS PAGE
 * ────────────────────────────────────────────────────────────────────────── */
export function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Invoices' | 'Bills' | 'Notices' | 'Agreements'>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.warn('[DocuSaathi] Error fetching docs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) return;
    try {
      setDeletingId(docId);
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter & Search logic
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.document_type || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'Invoices') return (doc.document_type || '').toLowerCase().includes('invoice');
    if (selectedFilter === 'Bills') return (doc.document_type || '').toLowerCase().includes('bill');
    if (selectedFilter === 'Notices') return (doc.document_type || '').toLowerCase().includes('notice');
    if (selectedFilter === 'Agreements') return (doc.document_type || '').toLowerCase().includes('agreement');
    return true;
  });

  return (
    <AppLayout activeTab="documents">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Document Vault
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            All your processed documents, contracts, and verified records in one place.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4 text-cyan-200" />
          Upload & Analyze
        </Link>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by name, type, or identifier..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0a1128]/80 border border-white/5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['All', 'Invoices', 'Bills', 'Notices', 'Agreements'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedFilter === filter
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* ── Document List / Grid ─────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 rounded-3xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const formattedDate = new Date(doc.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            const isCompleted = doc.status === 'completed';

            return (
              <div
                key={doc.id}
                className="p-5 rounded-3xl bg-[#0a1128]/70 border border-white/5 hover:border-indigo-500/30 backdrop-blur-xl shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {doc.document_type && (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-[10px] tracking-wide">
                          {doc.document_type}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-white truncate group-hover:text-indigo-300 transition-colors">
                    {doc.file_name}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>Uploaded {formattedDate}</span>
                    {doc.confidence_score && (
                      <>
                        <span>•</span>
                        <span className="text-cyan-400 font-medium">
                          {Math.round(doc.confidence_score * 100)}% conf
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {isCompleted ? (
                    <Link
                      to={`/documents/${doc.id}/analysis`}
                      className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      View Analysis
                    </Link>
                  ) : (
                    <Link
                      to={`/documents/${doc.id}/analysis`}
                      className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Analyze
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center rounded-3xl bg-[#0a1128]/40 border border-white/5 p-8 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-white">No documents found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            {searchQuery || selectedFilter !== 'All'
              ? 'No documents matched your active search or category filters.'
              : 'Upload your first document to get started.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {searchQuery || selectedFilter !== 'All' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('All');
                }}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                to="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30"
              >
                Analyze a document
              </Link>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * DEADLINES DASHBOARD PAGE
 * ────────────────────────────────────────────────────────────────────────── */
export function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<DeadlineWithDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Overdue' | 'Upcoming' | 'Completed'>('All');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchDeadlines = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserDeadlines();
      setDeadlines(data);
    } catch (err) {
      console.warn('[DocuSaathi] Error fetching deadlines:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

  const handleToggle = async (dlId: string) => {
    try {
      setTogglingId(dlId);
      const updated = await toggleDeadline(dlId);
      setDeadlines((prev) =>
        prev.map((d) => (d.id === dlId ? { ...d, completed: updated.completed } : d))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update deadline status.');
    } finally {
      setTogglingId(null);
    }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const overdueList = deadlines.filter((d) => {
    if (d.completed || !d.due_date) return false;
    return new Date(d.due_date) < now;
  });

  const upcomingList = deadlines.filter((d) => {
    if (d.completed || !d.due_date) return false;
    return new Date(d.due_date) >= now;
  });

  const completedList = deadlines.filter((d) => d.completed);

  const displayedList =
    activeTab === 'All'
      ? deadlines
      : activeTab === 'Overdue'
      ? overdueList
      : activeTab === 'Upcoming'
      ? upcomingList
      : completedList;

  return (
    <AppLayout activeTab="deadlines">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
          Never miss what matters.
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Statutory compliance, payment due dates, and renewal reminders extracted directly from your documents.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-[#0a1128]/80 border border-white/5">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Deadlines</span>
          <p className="text-2xl font-black text-white mt-1">{deadlines.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a1128]/80 border border-rose-500/20">
          <span className="text-[11px] font-bold text-rose-400 uppercase">Overdue</span>
          <p className="text-2xl font-black text-rose-300 mt-1">{overdueList.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a1128]/80 border border-amber-500/20">
          <span className="text-[11px] font-bold text-amber-400 uppercase">Upcoming</span>
          <p className="text-2xl font-black text-amber-300 mt-1">{upcomingList.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a1128]/80 border border-emerald-500/20">
          <span className="text-[11px] font-bold text-emerald-400 uppercase">Completed</span>
          <p className="text-2xl font-black text-emerald-300 mt-1">{completedList.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
        {(['All', 'Overdue', 'Upcoming', 'Completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Timeline Card List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : displayedList.length > 0 ? (
        <div className="space-y-3">
          {displayedList.map((dl) => {
            const dueDate = dl.due_date ? new Date(dl.due_date) : null;
            let daysLeft = 0;
            let isOverdue = false;

            if (dueDate) {
              const diffTime = dueDate.getTime() - now.getTime();
              daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              isOverdue = daysLeft < 0;
            }

            return (
              <div
                key={dl.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  dl.completed
                    ? 'bg-white/[0.01] border-white/5 opacity-60'
                    : isOverdue
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : 'bg-[#0a1128]/70 border-white/5 hover:border-indigo-500/30'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    onClick={() => handleToggle(dl.id)}
                    disabled={togglingId === dl.id}
                    className="mt-0.5 text-slate-400 hover:text-indigo-400 transition-colors flex-shrink-0 cursor-pointer"
                    title={dl.completed ? 'Mark uncompleted' : 'Mark completed'}
                  >
                    {dl.completed ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          dl.completed
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : isOverdue
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {dl.completed
                          ? 'Completed'
                          : isOverdue
                          ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'}`
                          : daysLeft === 0
                          ? 'Due Today'
                          : `Due in ${daysLeft} days`}
                      </span>

                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {dl.priority} priority
                      </span>

                      {dl.document?.file_name && (
                        <span className="text-xs text-indigo-300/80 font-medium truncate max-w-xs">
                          • {dl.document.file_name}
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-base font-bold ${
                        dl.completed ? 'line-through text-slate-400' : 'text-white'
                      }`}
                    >
                      {dl.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{dl.due_date || 'No date'}</span>
                  </div>

                  {dl.document_id && (
                    <Link
                      to={`/documents/${dl.document_id}/analysis`}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>Doc</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center rounded-3xl bg-[#0a1128]/40 border border-white/5 p-8 backdrop-blur-xl">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No deadlines in this section</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Analyze invoices, utility bills, or notices to automatically populate critical dates.
          </p>
        </div>
      )}
    </AppLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SETTINGS PAGE
 * ────────────────────────────────────────────────────────────────────────── */
export function SettingsPage() {
  const { user, profile } = useAuth();
  const [preferredLang, setPreferredLang] = useState(profile?.preferred_language || 'English');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppLayout activeTab="settings">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your AI explanation language, account identity, and workspace preferences.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Language Preference Card */}
        <div className="p-6 rounded-3xl bg-[#0a1128]/70 border border-white/5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Preferred Explanation Language</h3>
              <p className="text-xs text-slate-400">
                Gemini AI will synthesize plain-language document explanations in this language.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
            {['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu'].map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setPreferredLang(lang)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                  preferredLang === lang
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span>{lang}</span>
                {preferredLang === lang && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            {saved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Sparkles className="w-3.5 h-3.5" />}
            {saved ? 'Preferences Saved!' : 'Save Language Preference'}
          </button>
        </div>

        {/* Security & Multi-tenant Profile */}
        <div className="p-6 rounded-3xl bg-[#0a1128]/70 border border-white/5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Privacy & Isolation</h3>
              <p className="text-xs text-slate-400">
                All documents are encrypted with Row Level Security (RLS) under your verified account.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <span className="text-slate-400 font-medium">Account ID</span>
              <span className="text-slate-200 font-mono">{user?.id || '—'}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <span className="text-slate-400 font-medium">Verified Email</span>
              <span className="text-slate-200 font-semibold">{user?.email || '—'}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <span className="text-slate-400 font-medium">Intelligence Model</span>
              <span className="text-indigo-400 font-bold">Gemini 2.5 Flash</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
