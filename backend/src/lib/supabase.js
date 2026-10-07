'use strict';

/**
 * lib/supabase.js
 *
 * Supabase Admin client for backend use ONLY.
 *
 * CRITICAL SECURITY RULES:
 * 1. This module uses the SERVICE_ROLE key which bypasses Row Level Security.
 * 2. It must NEVER be imported by any code that runs in the browser.
 * 3. Every query made with this client MUST enforce ownership manually
 *    (i.e. filter by user_id derived from the authenticated JWT — never from
 *    a value supplied by the client body/query).
 * 4. The service_role key must NEVER be logged, sent in responses, or included
 *    in any data sent to the frontend.
 *
 * Initialisation is lazy so that unit tests can be run without real credentials.
 */

const { createClient } = require('@supabase/supabase-js');
const { env } = require('../config/env');

let _client = null;

/**
 * Returns the singleton Supabase admin client.
 * Throws clearly if credentials are missing.
 */
function getSupabaseAdmin() {
  if (_client) return _client;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '[DocuSaathi] Supabase is not configured. ' +
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env'
    );
  }

  _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // Do not persist session on server — each request is stateless
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _client;
}

module.exports = { getSupabaseAdmin };
