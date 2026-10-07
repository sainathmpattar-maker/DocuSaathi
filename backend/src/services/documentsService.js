'use strict';

/**
 * services/documentsService.js
 *
 * Secure server-side data & storage access for documents.
 *
 * SECURITY CONTRACT:
 * - Every query and mutation filters strictly by userId derived from the server-verified JWT (req.user.id).
 * - Storage path structure: documents/{userId}/{documentId}/{safeFileName}
 * - Supabase storage bucket 'documents' is private; files are never exposed via public URLs.
 * - Atomic cleanup: If DB insert fails after storage upload, storage file is immediately cleaned up.
 * - IDOR Prevention: Users can never read, download, or delete documents belonging to another user.
 */

const crypto = require('crypto');
const { getSupabaseAdmin } = require('../lib/supabase');
const {
  validateUploadedFile,
  sanitizeOriginalFilename,
  generateSafeStorageName,
} = require('../utils/fileValidation');

const STORAGE_BUCKET = 'documents';

/**
 * Uploads a document to Supabase Storage and creates a database record atomically.
 *
 * @param {Object} params
 * @param {string} params.userId - Verified user ID from JWT (never from request body)
 * @param {Object} params.file - Multer file object with buffer, mimetype, size, originalname
 * @returns {Promise<Object>} Created document record
 */
async function uploadDocument({ userId, file }) {
  if (!userId) {
    throw new Error('User authentication required for document upload.');
  }

  // 1. Strict validation (size, MIME, magic bytes)
  const validation = validateUploadedFile(file);
  if (!validation.valid) {
    const err = new Error(validation.message);
    err.code = validation.code;
    err.status = 400;
    throw err;
  }

  const supabase = getSupabaseAdmin();
  const documentId = crypto.randomUUID();
  const originalName = sanitizeOriginalFilename(file.originalname);
  const mimeType = (file.mimetype || 'application/octet-stream').toLowerCase();
  const safeStorageName = generateSafeStorageName(originalName, mimeType);

  // Storage path matching Supabase Storage RLS folder structure: {userId}/{documentId}/{filename}
  const storagePath = `${userId}/${documentId}/${safeStorageName}`;

  // 2. Upload file buffer to private Supabase Storage
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (storageError) {
    console.error('[DocuSaathi Storage] Upload error:', storageError.message);
    const err = new Error('Failed to upload document to secure storage.');
    err.code = 'STORAGE_UPLOAD_ERROR';
    err.status = 502;
    throw err;
  }

  // 3. Create document record in database
  try {
    const { data: docRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        user_id: userId,
        file_name: originalName,
        file_url: storagePath, // Store storage path/key (bucket is private)
        file_type: mimeType,
        file_size: file.size,
        status: 'uploaded',
      })
      .select('id, user_id, file_name, file_type, file_size, document_type, status, confidence_score, created_at, updated_at')
      .single();

    if (dbError) {
      throw dbError;
    }

    return docRecord;
  } catch (dbError) {
    // ATOMICITY: Clean up orphaned file in storage if DB insert failed
    console.error('[DocuSaathi DB] Document insert failed, rolling back storage upload:', dbError.message);
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    } catch (cleanupErr) {
      console.error('[DocuSaathi Storage] Cleanup failed for path:', storagePath, cleanupErr);
    }

    const err = new Error('Failed to register document in database.');
    err.code = 'DATABASE_INSERT_ERROR';
    err.status = 500;
    throw err;
  }
}

/**
 * Lists documents belonging to a specific user.
 *
 * @param {string} userId - Verified from JWT
 */
async function listDocuments(userId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('documents')
    .select('id, file_name, file_type, file_size, document_type, status, confidence_score, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DocuSaathi DB] List documents error:', error.message);
    throw new Error('Could not retrieve documents list.');
  }

  return data || [];
}

/**
 * Gets a single document — verifies ownership by filtering on both id AND user_id.
 * Returns null if not found or not owned by this user (IDOR protection).
 *
 * @param {string} documentId
 * @param {string} userId - Verified from JWT
 */
async function getDocumentById(documentId, userId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('documents')
    .select('id, user_id, file_name, file_url, file_type, file_size, document_type, status, confidence_score, created_at, updated_at')
    .eq('id', documentId)
    .eq('user_id', userId) // CRITICAL: Strict ownership filter
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[DocuSaathi DB] Get document error:', error.message);
    throw new Error('Error retrieving document.');
  }

  return data || null;
}

/**
 * Generates a short-lived signed URL for an authenticated user to view/download their private document.
 *
 * @param {string} documentId
 * @param {string} userId - Verified from JWT
 * @param {number} expiresInSeconds - Default 300s (5 minutes)
 */
async function getSignedFileUrl(documentId, userId, expiresInSeconds = 300) {
  const document = await getDocumentById(documentId, userId);
  if (!document) {
    return null; // Not found or unauthorized
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(document.file_url, expiresInSeconds, {
      download: false, // Allows inline browser viewing where supported
    });

  if (error || !data?.signedUrl) {
    console.error('[DocuSaathi Storage] Signed URL creation error:', error?.message);
    throw new Error('Failed to generate secure file access URL.');
  }

  return {
    signedUrl: data.signedUrl,
    fileName: document.file_name,
    fileType: document.file_type,
    fileSize: document.file_size,
    expiresIn: expiresInSeconds,
  };
}

/**
 * Deletes a document record and its associated storage file atomically.
 *
 * @param {string} documentId
 * @param {string} userId - Verified from JWT
 */
async function deleteDocument(documentId, userId) {
  // First verify document exists and belongs to the user
  const document = await getDocumentById(documentId, userId);
  if (!document) {
    return false; // Not found or not owned by user
  }

  const supabase = getSupabaseAdmin();

  // Delete DB record first (RLS & cascading relations)
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId);

  if (dbError) {
    console.error('[DocuSaathi DB] Delete document error:', dbError.message);
    throw new Error('Failed to delete document record.');
  }

  // Delete file from storage
  if (document.file_url) {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([document.file_url]);

    if (storageError) {
      console.warn('[DocuSaathi Storage] Storage file removal warning:', storageError.message);
    }
  }

  return true;
}

/**
 * Lists all deadlines across documents owned by the user.
 *
 * @param {string} userId - Verified from JWT
 */
async function listUserDeadlines(userId) {
  const supabase = getSupabaseAdmin();
  const { data: userDocs, error: docError } = await supabase
    .from('documents')
    .select('id, file_name, document_type')
    .eq('user_id', userId);

  if (docError) throw docError;
  if (!userDocs || userDocs.length === 0) return [];

  const docMap = new Map(userDocs.map((d) => [d.id, d]));
  const docIds = userDocs.map((d) => d.id);

  const { data: deadlines, error: dlError } = await supabase
    .from('deadlines')
    .select('*')
    .in('document_id', docIds)
    .order('due_date', { ascending: true });

  if (dlError) throw dlError;

  return (deadlines || []).map((d) => ({
    ...d,
    document: docMap.get(d.document_id) || null,
  }));
}

/**
 * Toggles a deadline's completion status with strict user ownership verification.
 *
 * @param {string} deadlineId
 * @param {string} userId - Verified from JWT
 */
async function toggleDeadline(deadlineId, userId) {
  const supabase = getSupabaseAdmin();

  const { data: deadline, error: dlError } = await supabase
    .from('deadlines')
    .select('id, document_id, completed')
    .eq('id', deadlineId)
    .single();

  if (dlError || !deadline) {
    const err = new Error('Deadline not found.');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Verify parent document belongs to user (IDOR prevention)
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id')
    .eq('id', deadline.document_id)
    .eq('user_id', userId)
    .single();

  if (docError || !doc) {
    const err = new Error('Unauthorized or deadline does not belong to your documents.');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  const { data: updated, error: updateError } = await supabase
    .from('deadlines')
    .update({ completed: !deadline.completed })
    .eq('id', deadlineId)
    .select('*')
    .single();

  if (updateError) throw updateError;
  return updated;
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocumentById,
  getSignedFileUrl,
  deleteDocument,
  listUserDeadlines,
  toggleDeadline,
};
