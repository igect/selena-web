/**
 * Selena Media Archive — Authentication API
 * Deep module encapsulating Supabase Auth, roles, session management, and OAuth.
 */

import { getSupabase } from './supabase.js';

export const AuthAPI = {
  /**
   * Resolves current user session or null.
   */
  async getSession() {
    const sb = await getSupabase();
    if (!sb) return null;
    try {
      const { data: { session }, error } = await sb.auth.getSession();
      if (error) {
        console.warn('[AuthAPI] getSession error:', error.message);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  /**
   * Returns current authenticated user object or null.
   */
  async getCurrentUser() {
    const session = await this.getSession();
    return session?.user || null;
  },

  /**
   * Checks whether the current user has admin role in public.admin_users table.
   */
  async isCurrentUserAdmin() {
    const user = await this.getCurrentUser();
    if (!user) return false;

    const sb = await getSupabase();
    if (!sb) return false;

    try {
      const { data, error } = await sb
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      return Boolean(!error && data && data.role === 'admin');
    } catch {
      return false;
    }
  },

  /**
   * Log in with Email and Password
   */
  async signInWithPassword(email, password) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user: data.user, session: data.session };
  },

  /**
   * Sign up with Email and Password
   */
  async signUp(email, password, name = '') {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim() || email.split('@')[0] }
      }
    });
    if (error) throw error;
    return { user: data.user, session: data.session };
  },

  /**
   * Sign in with OAuth Provider (Google, GitHub)
   */
  async signInWithOAuth(provider = 'google') {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const redirectUrl = typeof window !== 'undefined'
      ? (window.location.origin + window.location.pathname).replace(/\/+$/, '') + '/'
      : '';

    const { data, error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUrl }
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const sb = await getSupabase();
    if (sb) {
      await sb.auth.signOut();
    }
  },

  /**
   * Listen to auth state transitions
   */
  async onAuthStateChange(callback) {
    const sb = await getSupabase();
    if (sb) {
      const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
        callback(event, session?.user || null);
      });
      return subscription;
    }
    return { unsubscribe: () => {} };
  }
};
