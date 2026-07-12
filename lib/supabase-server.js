// lib/supabase-server.js
// Server-side Supabase client using service role key (bypasses RLS)
// ONLY use in API Route Handlers and Server Components — NEVER expose to browser

import { createClient } from "@supabase/supabase-js";

const supabaseUrl         = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Returns a server-side Supabase admin client.
 * Creates a new instance per call (safe for serverless — not a singleton).
 */
export function createServerSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRole) {
    throw new Error(
      "[supabase-server] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
    );
  }

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
