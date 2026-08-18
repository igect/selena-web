/**
 * Selena Media Archive — Supabase Client Module
 * Initializes official @supabase/supabase-js client using dynamic ESM import.
 */

import { CONFIG } from './config.js';

let supabaseClient = null;
let supabasePromise = null;

/**
 * Initializes or returns the Supabase client instance.
 * Dynamically loads the client from CDN in the browser if available.
 */
export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (supabasePromise) return supabasePromise;

  supabasePromise = (async () => {
    if (!CONFIG.isCloudConfigured()) {
      return null;
    }

    try {
      // Dynamic import from CDN for pure ES module browser runtime
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      supabaseClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined
        }
      });
      return supabaseClient;
    } catch (err) {
      console.warn('[Supabase] Failed to initialize Supabase client:', err);
      return null;
    }
  })();

  return supabasePromise;
}

/**
 * Synchronous accessor for the initialized client (returns null if not yet initialized)
 */
export function getSupabaseSync() {
  return supabaseClient;
}
