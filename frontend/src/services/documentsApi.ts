import axios, { type AxiosProgressEvent } from 'axios';
import { supabase } from '../lib/supabase';
import type { Document } from '../types/database';

const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

/**
 * Retrieves the active session access token for authenticated API calls.
 */
async function getAuthHeader(): Promise<{ Authorization: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be logged in to perform this operation.');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export interface UploadProgressCallback {
  (percent: number): void;
}

export interface DocumentFileResponse {
  signedUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  expiresIn: number;
}

/**
 * Uploads a document file to the backend API.
 * Tracks upload percentage for responsive UI feedback.
 */
export async function uploadDocument(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<Document> {
  const headers = await getAuthHeader();
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(`${API_BASE_URL}/documents/upload`, formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    if (!response.data?.success || !response.data?.document) {
      throw new Error(response.data?.error?.message || 'Failed to upload document.');
    }

    return response.data.document as Document;
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'An error occurred during upload.';
    throw new Error(errorMsg);
  }
}

/**
 * Lists all documents belonging to the authenticated user.
 */
export async function getDocuments(): Promise<Document[]> {
  const headers = await getAuthHeader();
  try {
    const response = await axios.get(`${API_BASE_URL}/documents`, { headers });
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Failed to fetch documents.');
    }
    return (response.data.documents || []) as Document[];
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to load documents.';
    throw new Error(errorMsg);
  }
}

/**
 * Gets a single document by ID.
 */
export async function getDocument(id: string): Promise<Document> {
  const headers = await getAuthHeader();
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/${id}`, { headers });
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Document not found.');
    }
    return response.data.document as Document;
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to retrieve document.';
    throw new Error(errorMsg);
  }
}

/**
 * Generates a short-lived signed URL to securely preview or download a document.
 */
export async function getDocumentFileUrl(id: string): Promise<DocumentFileResponse> {
  const headers = await getAuthHeader();
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/${id}/file`, { headers });
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Failed to generate file access link.');
    }
    return response.data as DocumentFileResponse;
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to access file.';
    throw new Error(errorMsg);
  }
}

/**
 * Deletes a document and its storage object.
 */
export async function deleteDocument(id: string): Promise<void> {
  const headers = await getAuthHeader();
  try {
    const response = await axios.delete(`${API_BASE_URL}/documents/${id}`, { headers });
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Failed to delete document.');
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to delete document.';
    throw new Error(errorMsg);
  }
}

export interface PlainLanguageExplanation {
  whatIsThis: string;
  whatItMeans: string;
  whatUserMustDo: string;
  cautions: string;
}

export interface DocumentAnalysisResponse {
  success: boolean;
  document: Document;
  summary: string;
  plainLanguageExplanation: PlainLanguageExplanation | null;
  extractions: Array<{
    id?: string;
    field_name: string;
    field_value: string | null;
    confidence?: number | null;
  }>;
  validation_results: Array<{
    id?: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    description: string | null;
    status: 'open' | 'acknowledged' | 'resolved';
  }>;
  deadlines: Array<{
    id?: string;
    title: string;
    due_date: string | null;
    priority: 'low' | 'medium' | 'high' | 'critical';
    completed: boolean;
  }>;
  actionPlan: string[];
}

export interface DeadlineWithDoc {
  id: string;
  document_id: string;
  title: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  created_at?: string;
  document?: {
    id: string;
    file_name: string;
    document_type: string | null;
  } | null;
}

/**
 * Triggers the complete DocuSaathi Intelligence Engine analysis on a document.
 */
export async function triggerAnalysis(id: string): Promise<DocumentAnalysisResponse> {
  const headers = await getAuthHeader();
  try {
    const response = await axios.post(`${API_BASE_URL}/documents/${id}/analyze`, {}, { headers });
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Analysis failed.');
    }
    return response.data as DocumentAnalysisResponse;
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to analyze document.';
    throw new Error(errorMsg);
  }
}

/**
 * Retrieves existing analysis results, extractions, risks, and deadlines for a document.
 */
export async function getDocumentAnalysis(id: string): Promise<DocumentAnalysisResponse> {
  const headers = await getAuthHeader();
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/${id}/analysis`, { headers });
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Failed to retrieve analysis.');
    }
    return response.data as DocumentAnalysisResponse;
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to retrieve analysis.';
    throw new Error(errorMsg);
  }
}

/**
 * Lists all upcoming deadlines across the user's documents.
 */
export async function getUserDeadlines(): Promise<DeadlineWithDoc[]> {
  const headers = await getAuthHeader();
  try {
    const response = await axios.get(`${API_BASE_URL}/documents/deadlines`, { headers });
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Failed to retrieve deadlines.');
    }
    return (response.data.deadlines || []) as DeadlineWithDoc[];
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to retrieve deadlines.';
    throw new Error(errorMsg);
  }
}

/**
 * Toggles a deadline's completion status.
 */
export async function toggleDeadline(id: string): Promise<{ completed: boolean }> {
  const headers = await getAuthHeader();
  try {
    const response = await axios.patch(`${API_BASE_URL}/documents/deadlines/${id}`, {}, { headers });
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Failed to toggle deadline.');
    }
    return response.data.deadline;
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to toggle deadline.';
    throw new Error(errorMsg);
  }
}
