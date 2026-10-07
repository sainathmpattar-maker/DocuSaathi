'use strict';

/**
 * controllers/analysisController.js
 *
 * HTTP layer for DocuSaathi document intelligence and analysis retrieval.
 */

const analysisService = require('../services/analysisService');

/**
 * POST /api/documents/:id/analyze
 * Triggers the AI intelligence pipeline for a document.
 */
async function analyzeDocument(req, res, next) {
  try {
    const documentId = req.params.id || req.params.documentId;
    const userId = req.user.id; // Verified strictly from Supabase token in requireAuth

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DOCUMENT_ID',
          message: 'Document ID is required.',
        },
      });
    }

    const results = await analysisService.analyzeDocument({
      documentId,
      userId,
    });

    return res.status(200).json(results);
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
 * GET /api/documents/:id/analysis
 * Retrieves existing analysis, extractions, risks, and deadlines for a document.
 */
async function getDocumentAnalysis(req, res, next) {
  try {
    const documentId = req.params.id || req.params.documentId;
    const userId = req.user.id;

    const results = await analysisService.getAnalysisResults({
      documentId,
      userId,
    });

    return res.status(200).json(results);
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

module.exports = {
  analyzeDocument,
  getDocumentAnalysis,
};
