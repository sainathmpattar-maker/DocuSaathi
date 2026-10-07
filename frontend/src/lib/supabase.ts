/**
 * lib/supabase.ts
 *
 * Public Supabase client for the browser.
 *
 * SECURITY RULES:
 * - Uses ONLY the anon key (VITE_SUPABASE_ANON_KEY).
 * - The anon key is safe to ship in the browser because Supabase Row Level
 *   Security (RLS) restricts what anonymous/authenticated users can access.
 * - Never import anything from the backend service_role client here.
 * - Never perform privileged database operations directly from the frontend.
 *   Those must go through the Express backend API.
 * - Auth state is managed by Supabase Auth — never implement custom auth logic.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://toibvnwospyupdergjjr.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_anon_placeholder_key_docusaathi';

if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[DocuSaathi] VITE_SUPABASE_ANON_KEY is not defined in environment variables. ' +
    'Set VITE_SUPABASE_ANON_KEY in Vercel project settings to enable authentication.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
