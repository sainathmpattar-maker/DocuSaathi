import React, { useState, useRef } from 'react';
import { uploadDocument } from '../services/documentsApi';
import type { Document } from '../types/database';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Loader2,
  RefreshCw,
  FileImage,
  ShieldCheck
} from 'lucide-react';

interface DocumentUploadZoneProps {
  onUploadSuccess?: (document: Document) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export default function DocumentUploadZone({
  onUploadSuccess,
  onUploadError,
  className = '',
}: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'selected' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`,
      };
    }

    const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
    const isExtValid = ALLOWED_EXTENSIONS.includes(fileExt);

    if (!isMimeValid && !isExtValid) {
      return {
        valid: false,
        error: 'Unsupported file format. Please upload a PDF, JPG, or PNG document.',
      };
    }

    return { valid: true };
  };

  const handleFile = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file');
      setUploadStatus('error');
      if (onUploadError) onUploadError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setUploadStatus('selected');
    startUpload(file);
  };

  const startUpload = async (file: File) => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const createdDoc = await uploadDocument(file, (percent) => {
        setUploadProgress(percent);
      });

      setUploadStatus('success');
      setUploadProgress(100);

      if (onUploadSuccess) {
        onUploadSuccess(createdDoc);
      }

      // Reset to ready state after 2.5s
      setTimeout(() => {
        setSelectedFile(null);
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 2500);
    } catch (err: any) {
      const msg = err.message || 'Upload failed. Please try again.';
      setErrorMessage(msg);
      setUploadStatus('error');
      if (onUploadError) onUploadError(msg);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
      e.target.value = ''; // Reset file input
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage(null);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedFile) {
      startUpload(selectedFile);
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Main Drag-Drop Zone Card */}
      <div
        onClick={() => {
          if (uploadStatus !== 'uploading' && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-8 sm:p-12 transition-all duration-300 text-center flex flex-col items-center justify-center backdrop-blur-xl ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-500/15 shadow-2xl shadow-indigo-500/30 scale-[1.01]'
            : uploadStatus === 'error'
            ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60'
            : uploadStatus === 'success'
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-white/10 bg-[#0a1128]/70 hover:border-indigo-500/40 hover:bg-[#0a1128]/90 hover:shadow-xl hover:shadow-indigo-950/40'
        }`}
      >
        {/* Glow ambient highlight */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-500" />

        {/* ── State: UPLOADING ──────────────────────────────────────────────── */}
        {uploadStatus === 'uploading' && (
          <div className="w-full max-w-md space-y-5 relative z-10 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">Uploading document...</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs mx-auto">
                {selectedFile?.name} ({selectedFile ? formatFileSize(selectedFile.size) : ''})
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1">
                <span>Encrypting & streaming</span>
                <span className="text-indigo-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-violet-500 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── State: SUCCESS ────────────────────────────────────────────────── */}
        {uploadStatus === 'success' && (
          <div className="w-full max-w-md space-y-4 relative z-10 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-emerald-300 tracking-tight">✓ Document uploaded</h3>
              <p className="text-xs text-slate-400">
                Stored safely in private vault. Preparing it for AI analysis...
              </p>
            </div>
          </div>
        )}

        {/* ── State: ERROR ──────────────────────────────────────────────────── */}
        {uploadStatus === 'error' && (
          <div className="w-full max-w-md space-y-5 relative z-10 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-rose-300 tracking-tight">Upload Unsuccessful</h3>
              <p className="text-xs text-rose-300/90 leading-relaxed max-w-xs mx-auto">
                {errorMessage || 'Failed to upload document.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── State: IDLE / READY ───────────────────────────────────────────── */}
        {uploadStatus === 'idle' && (
          <div className="space-y-5 relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>✦ Understand any document</span>
            </div>

            {/* Icon stack */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                <Upload className="w-7 h-7 text-white" />
              </div>
            </div>

            {/* Main title & subtitle */}
            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Drop your document here
              </h3>
              <p className="text-sm text-slate-400">
                or <span className="text-indigo-400 font-semibold group-hover:underline">choose a file</span> from your device
              </p>
            </div>

            {/* File formats & limits */}
            <div className="pt-2 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>PDF</span>
                <span className="text-slate-500">•</span>
                <FileImage className="w-3.5 h-3.5 text-violet-400" />
                <span>JPG</span>
                <span className="text-slate-500">•</span>
                <span>PNG</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Maximum file size: 10 MB
              </span>
            </div>

            {/* Security note */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Private Vault • Row Level Security • Never Public</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
