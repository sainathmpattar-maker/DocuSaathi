'use strict';

/**
 * controllers/documentsController.js
 *
 * Thin HTTP layer: validates input, calls documentsService, and returns standard JSON responses.
 * Never accesses the database or storage directly.
 */

const documentsService = require('../services/documentsService');

/**
 * POST /api/documents/upload
 * Authenticated file upload endpoint.
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_PROVIDED',
          message: 'Please provide a document file to upload.',
        },
      });
    }

    // req.user.id is derived strictly from verified Supabase token in requireAuth
    const userId = req.user.id;

    const document = await documentsService.uploadDocument({
      userId,
      file: req.file,
    });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully.',
      document: {
        id: document.id,
        file_name: document.file_name,
        file_type: document.file_type,
        file_size: document.file_size,
        document_type: document.document_type || null,
        status: document.status,
        confidence_score: document.confidence_score,
        created_at: document.created_at,
        updated_at: document.updated_at,
      },
    });
  } catch (err) {
    if (err.status && err.code) {
      return res.status(err.status).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }
    next(err);
  }
}

/**
 * GET /api/documents
 * Lists authenticated user's documents.
 */
async function listDocuments(req, res, next) {
  try {
    const userId = req.user.id;
    const documents = await documentsService.listDocuments(userId);

    return res.json({
      success: true,
      documents,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents/:id
 * Gets metadata for a specific document with ownership check.
 */
async function getDocument(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await documentsService.getDocumentById(id, userId);

    if (!document) {
      // 404 prevents resource enumeration/confirmation
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found.',
        },
      });
    }

    // Exclude internal storage keys from standard metadata response
    const { file_url, ...safeDoc } = document;

    return res.json({
      success: true,
      document: safeDoc,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents/:id/file
 * Generates a short-lived signed URL to securely view/download the private document.
 */
async function getDocumentFile(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const fileAccess = await documentsService.getSignedFileUrl(id, userId);

    if (!fileAccess) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found.',
        },
      });
    }

    return res.json({
      success: true,
      ...fileAccess,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/documents/:id
 * Deletes document record and associated storage file with ownership check.
 */
async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await documentsService.deleteDocument(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found.',
        },
      });
    }

    return res.json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents/deadlines
 * Lists all deadlines for the user's documents.
 */
async function listUserDeadlines(req, res, next) {
  try {
    const userId = req.user.id;
    const deadlines = await documentsService.listUserDeadlines(userId);
    return res.json({
      success: true,
      deadlines,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/documents/deadlines/:id
 * Toggles a deadline's completed status.
 */
async function toggleDeadline(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updated = await documentsService.toggleDeadline(id, userId);
    return res.json({
      success: true,
      deadline: updated,
    });
  } catch (err) {
    if (err.status && err.code) {
      return res.status(err.status).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    next(err);
  }
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  getDocumentFile,
  deleteDocument,
  listUserDeadlines,
  toggleDeadline,
};
