'use strict';

const express = require('express');
const router = express.Router();

/**
 * Stub routes for document chat (RAG-style conversation).
 * Will integrate Gemini chat + document context in a future phase.
 */

// POST /api/chat/:documentId – send a message about a document
router.post('/:documentId', (req, res) => {
  res.json({
    message: `POST /api/chat/${req.params.documentId} – stub. Chat integration pending.`,
  });
});

// GET /api/chat/:documentId – fetch message history
router.get('/:documentId', (req, res) => {
  res.json({
    message: `GET /api/chat/${req.params.documentId} – stub. Not yet implemented.`,
  });
});

module.exports = router;
