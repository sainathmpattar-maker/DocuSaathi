'use strict';

const express = require('express');
const router = express.Router();
const { getSupabaseAdmin } = require('../lib/supabase');
const { env } = require('../config/env');

/**
 * GET /api/health
 * Returns service health status.
 * Optionally tests Supabase connectivity (non-blocking).
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'docusaathi-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    supabase: 'not_configured',
  };

  // Only check Supabase if it is configured (doesn't block startup if not)
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = getSupabaseAdmin();
      // Lightweight check: list tables (should return instantly)
      const { error } = await supabase.from('profiles').select('id').limit(1);
      health.supabase = error ? `error: ${error.message}` : 'connected';
    } catch (err) {
      health.supabase = `error: ${err.message}`;
    }
  }

  res.json(health);
});

module.exports = router;
