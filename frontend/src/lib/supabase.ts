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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // In development, display a clear error rather than a cryptic failure later.
  console.warn(
    '[DocuSaathi] Supabase is not configured. ' +
    'Copy frontend/.env.example to frontend/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      // Persist session in localStorage for seamless page refreshes
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
