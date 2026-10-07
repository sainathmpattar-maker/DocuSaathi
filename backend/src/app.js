'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');

const healthRouter = require('./routes/health');
const documentsRouter = require('./routes/documents');
const analysisRouter = require('./routes/analysis');
const chatRouter = require('./routes/chat');

const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * Creates and configures the Express application.
 * Separated from server start so it can be tested independently.
 */
function createApp() {
  const app = express();

  // ─── Security Headers ──────────────────────────────────────────────────────
  app.use(helmet());

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, server-to-server)
        if (!origin) return callback(null, true);
        const isAllowedExplicit = env.ALLOWED_ORIGINS.includes(origin);
        const isVercelDocuSaathi =
          origin.startsWith('https://') &&
          origin.endsWith('.vercel.app') &&
          (origin.includes('docusaathi') || origin.includes('sainathmpattar'));
        if (isAllowedExplicit || isVercelDocuSaathi) {
          return callback(null, true);
        }
        callback(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
    })
  );

  // ─── Request Logging ───────────────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // ─── Body Parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ─── Global Rate Limiter ───────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  });
  app.use(globalLimiter);

  // ─── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/health', healthRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/analysis', analysisRouter);
  app.use('/api/chat', chatRouter);

  // ─── 404 + Error Handlers ──────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
