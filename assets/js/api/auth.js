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
   * Update Member profile metadata (name, handle, avatar_url)
   */
  async updateProfile({ name, handle, avatarUrl }) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const metadata = {};
    if (name !== undefined) metadata.name = name.trim();
    if (handle !== undefined) metadata.handle = handle.trim().replace(/^@+/, '');
    if (avatarUrl !== undefined) metadata.avatar_url = avatarUrl.trim();

    const { data, error } = await sb.auth.updateUser({ data: metadata });
    if (error) throw error;
    return data.user;
  },

  /**
   * Update Member email address
   */
  async updateEmail(email) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const { data, error } = await sb.auth.updateUser({ email: email.trim() });
    if (error) throw error;
    return data.user;
  },

  /**
   * Update Member password
   */
  async updatePassword(password) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const { data, error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    return data.user;
  },

  /**
   * Enroll a new TOTP 2FA Factor
   */
  async enrollTOTP(issuer = 'Selena Media Archive') {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const { data, error } = await sb.auth.mfa.enroll({
      factorType: 'totp',
      issuer
    });
    if (error) throw error;
    return data;
  },

  /**
   * Verify and activate a TOTP 2FA Factor using 6-digit code
   */
  async verifyTOTP(factorId, code) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const challenge = await sb.auth.mfa.challenge({ factorId });
    if (challenge.error) throw challenge.error;

    const verify = await sb.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: code.trim()
    });
    if (verify.error) throw verify.error;
    return verify.data;
  },

  /**
   * Unenroll / Disable a 2FA Factor
   */
  async unenrollTOTP(factorId) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const { data, error } = await sb.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    return data;
  },

  /**
   * List enrolled MFA Factors for the current user
   */
  async listMFAFactors() {
    const sb = await getSupabase();
    if (!sb) return { all: [], totp: [] };

    try {
      const { data, error } = await sb.auth.mfa.listFactors();
      if (error) return { all: [], totp: [] };
      return data || { all: [], totp: [] };
    } catch {
      return { all: [], totp: [] };
    }
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
