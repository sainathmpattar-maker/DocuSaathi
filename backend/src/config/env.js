'use strict';

/**
 * config/env.js
 *
 * Centralised environment-variable access for the backend.
 * All process.env reads happen here so there is one place to audit.
 *
 * IMPORTANT SECURITY CONTRACT:
 * - SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY are NEVER exposed to the
 *   frontend, NEVER logged, and NEVER sent in HTTP responses.
 * - This module is server-side only.
 */

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

/**
 * Validates that every required environment variable is present.
 * Call this once at startup so the server refuses to start with a
 * misconfigured environment rather than failing silently at runtime.
 */
function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[DocuSaathi] Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy backend/.env.example to backend/.env and fill in all values.'
    );
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),

  // Supabase — backend only
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Google Gemini — backend only
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',

  // CORS
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),

  // File upload limits
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES || String(10 * 1024 * 1024), 10),
};

module.exports = { env, validateEnv };
