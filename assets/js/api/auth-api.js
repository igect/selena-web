/**
 * Selena Media Archive — Authentication API
 * Provides login, signup, session restoration, and admin role checking.
 */

import { CONFIG } from '../config.js';
import { getSupabase } from '../supabase-client.js';

export const AuthAPI = {
  /**
   * Get current active session
   */
  async getSession() {
    const supabase = await getSupabase();
    if (!supabase) {
      // Local fallback session
      const localUser = localStorage.getItem('selena_local_user');
      return localUser ? { user: JSON.parse(localUser) } : null;
    }
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

    // Local fallback override (development only)
    if (!CONFIG.IS_PRODUCTION && localStorage.getItem('selena_local_is_admin') === 'true') {
      return true;
    }

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
    if (!supabase) {
      // Local offline mock login
      const mockUser = {
        id: 'local-admin-uuid',
        email,
        user_metadata: { name: email.split('@')[0], avatar_url: 'assets/images/logo.png' }
      };
      localStorage.setItem('selena_local_user', JSON.stringify(mockUser));
      localStorage.setItem('selena_local_is_admin', 'true');
      return { user: mockUser, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data?.user || null, session: data?.session || null, error };
  },

  /**
   * Sign up with Email and Password
   */
  async signUp(email, password, name = '') {
    const supabase = await getSupabase();
    if (!supabase) {
      const mockUser = {
        id: 'local-user-' + Date.now(),
        email,
        user_metadata: { name: name || email.split('@')[0], avatar_url: 'assets/images/logo.png' }
      };
      localStorage.setItem('selena_local_user', JSON.stringify(mockUser));
      return { user: mockUser, error: null };
    }

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
    if (!supabase) {
      return { data: null, error: new Error('Supabase is not configured for OAuth.') };
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    return { data, error };
  },

  /**
   * Sign out current user
   */
  async signOut() {
    localStorage.removeItem('selena_local_user');
    localStorage.removeItem('selena_local_is_admin');

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
