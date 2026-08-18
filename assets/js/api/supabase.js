/**
 * Selena Media Archive — Supabase Client & Realtime Manager
 * Deep module encapsulating database connection, auth state, and WebSocket subscriptions.
 */

import { CONFIG } from '../config.js';

let client = null;
let clientPromise = null;
const realtimeChannels = new Map();

/**
 * Initializes and returns the Supabase client singleton.
 */
export async function getSupabase() {
  if (client) return client;
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    if (typeof window === 'undefined' || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
      return null;
    }

    try {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });
      return client;
    } catch (err) {
      console.error('[Supabase] Initialization failed:', err);
      return null;
    }
  })();

  return clientPromise;
}

/**
 * Subscribes to database table changes via Supabase Realtime WebSocket.
 * @param {string} channelName Unique channel identifier
 * @param {string} table Database table name
 * @param {Function} callback Handler for database events (INSERT, UPDATE, DELETE)
 * @returns {Promise<Function>} Unsubscribe cleanup function
 */
export async function subscribeTable(channelName, table, callback) {
  const sb = await getSupabase();
  if (!sb) return () => {};

  // Clean up any existing channel with same name
  if (realtimeChannels.has(channelName)) {
    const existing = realtimeChannels.get(channelName);
    sb.removeChannel(existing);
    realtimeChannels.delete(channelName);
  }

  const channel = sb
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      try {
        callback(payload);
      } catch (err) {
        console.error(`[Realtime:${table}] Callback error:`, err);
      }
    })
    .subscribe();

  realtimeChannels.set(channelName, channel);

  return () => {
    if (realtimeChannels.has(channelName)) {
      sb.removeChannel(channel);
      realtimeChannels.delete(channelName);
    }
  };
}

/**
 * Remove all active realtime subscriptions
 */
export async function unsubscribeAll() {
  const sb = await getSupabase();
  if (sb) {
    for (const [name, channel] of realtimeChannels.entries()) {
      try {
        sb.removeChannel(channel);
      } catch {}
    }
  }
  realtimeChannels.clear();
}

