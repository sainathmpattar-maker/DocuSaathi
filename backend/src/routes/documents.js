'use strict';

/**
 * routes/documents.js
 *
 * Secure document management & intelligence routes. All endpoints require authentication.
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { handleSingleUpload } = require('../middleware/upload');
const {
  uploadDocument,
  listDocuments,
  getDocument,
  getDocumentFile,
  deleteDocument,
  listUserDeadlines,
  toggleDeadline,
} = require('../controllers/documentsController');
const {
  analyzeDocument,
  getDocumentAnalysis,
} = require('../controllers/analysisController');

/**
 * Rate limiter for document uploads:
 * 60 uploads per 15-minute window per IP.
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many document uploads from this IP. Please try again in a few minutes.',
    },
  },
});

/**
 * Rate limiter for AI analysis calls:
 * 40 analyses per 15-minute window per IP.
 * Protects Gemini API quotas while allowing smooth hackathon demo testing.
 */
const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many AI analysis requests. Please wait a few moments before analyzing more documents.',
    },
  },
});

// GET /api/documents – List authenticated user's documents
router.get('/', requireAuth, listDocuments);

// POST /api/documents/upload – Securely upload a document
router.post(
  '/upload',
  requireAuth,
  uploadLimiter,
  handleSingleUpload('file'),
  uploadDocument
);

// GET /api/documents/deadlines – List authenticated user's upcoming deadlines
router.get('/deadlines', requireAuth, listUserDeadlines);

// PATCH /api/documents/deadlines/:id – Toggle deadline completion status
router.patch('/deadlines/:id', requireAuth, toggleDeadline);

// GET /api/documents/:id – Get single document metadata
router.get('/:id', requireAuth, getDocument);

// GET /api/documents/:id/file – Generate short-lived signed URL for private file access
router.get('/:id/file', requireAuth, getDocumentFile);

// POST /api/documents/:id/analyze – Trigger DocuSaathi Intelligence Engine
router.post('/:id/analyze', requireAuth, analysisLimiter, analyzeDocument);

// GET /api/documents/:id/analysis – Retrieve saved intelligence, extractions, risks, and deadlines
router.get('/:id/analysis', requireAuth, getDocumentAnalysis);

// DELETE /api/documents/:id – Delete document record and storage file
router.delete('/:id', requireAuth, deleteDocument);

module.exports = router;
