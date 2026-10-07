'use strict';

/**
 * routes/analysis.js
 *
 * Dedicated analysis route alias for DocuSaathi Intelligence Engine.
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const {
  analyzeDocument,
  getDocumentAnalysis,
} = require('../controllers/analysisController');

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

// POST /api/analysis/:documentId – trigger full analysis
router.post('/:documentId', requireAuth, analysisLimiter, analyzeDocument);

// GET /api/analysis/:documentId – get analysis results
router.get('/:documentId', requireAuth, getDocumentAnalysis);

module.exports = router;
