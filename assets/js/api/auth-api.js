/**
 * Selena Media Archive — Authentication API
 * Pure live Supabase Auth API for production.
 */

import { getSupabase } from '../supabase-client.js';

export const AuthAPI = {
  /**
   * Get current active session
   */
  async getSession() {
    const supabase = await getSupabase();
    if (!supabase) return null;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[AuthAPI] getSession error:', error);
      return null;
    }
    return session;
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    const session = await this.getSession();
    return session?.user || null;
  },

  /**
   * Check if current user is an Admin
   */
  async isCurrentUserAdmin() {
    const user = await this.getCurrentUser();
    if (!user) return false;

    const supabase = await getSupabase();
    if (!supabase) return false;

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return false;
      return Boolean(data && data.role === 'admin');
    } catch {
      return false;
    }
  },

  /**
   * Sign in with Email and Password
   */
  async signInWithPassword(email, password) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live database connection unavailable.');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data?.user || null, session: data?.session || null, error };
  },

  /**
   * Sign up with Email and Password
   */
  async signUp(email, password, name = '') {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live database connection unavailable.');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email.split('@')[0] }
      }
    });
    return { user: data?.user || null, session: data?.session || null, error };
  },

  /**
   * Sign in with OAuth Provider (e.g. 'google', 'github')
   */
  async signInWithOAuth(provider) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live database connection unavailable.');

    const redirectUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl
      }
    });
    return { data, error };
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
  },

  /**
   * Listen to auth state changes
   */
  async onAuthStateChange(callback) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session?.user || null);
      });
      return subscription;
    }
    return { unsubscribe: () => {} };
  }
};
