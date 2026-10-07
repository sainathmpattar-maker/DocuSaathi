'use strict';

/**
 * middleware/auth.js
 *
 * Express middleware that validates a Supabase JWT from the Authorization header.
 *
 * SECURITY NOTES:
 * - We use the Supabase admin client to verify the JWT server-side.
 * - req.user is ONLY set when the token is valid. Never trust a userId from the
 *   request body or query string — always use req.user.id.
 * - This prevents IDOR: a user cannot impersonate another user by supplying a
 *   different userId in the request.
 */

const { getSupabaseAdmin } = require('../lib/supabase');

/**
 * requireAuth — validates the Bearer JWT and attaches req.user.
 * Must be applied to every route that accesses user-scoped data.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // Attach verified user to request — downstream handlers trust this object
    req.user = data.user;
    next();
  } catch (err) {
    console.error('[DocuSaathi] Auth middleware error:', err.message);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
}

module.exports = { requireAuth };
