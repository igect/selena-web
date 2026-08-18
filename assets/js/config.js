/**
 * Selena Media Archive — Application Configuration
 * Single source of truth for runtime constants, endpoints, and CDN resolvers.
 */

const runtime = (typeof window !== 'undefined' && window.APP_CONFIG) || {};

export const CONFIG = {
  SUPABASE_URL: runtime.SUPABASE_URL || 'https://mdsoymxqbbgzdwtsuyll.supabase.co',
  SUPABASE_ANON_KEY: runtime.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc295bXhxYmJnemR3dHN1eWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjEyOTgsImV4cCI6MjEwMjU5NzI5OH0.Wxz2WL8UwKUX9rnM19Htz7LI8TWaUecZKR7nWEpevUs',
  MEDIA_CDN_URL: runtime.MEDIA_CDN_URL || '',
  PAGE_SIZE: 24,
  APP_NAME: 'Selena Media Archive',
  VERSION: '3.0.0',

  /**
   * Resolves a media path into an absolute or relative image URL.
   */
  resolveImageUrl(pathOrUrl) {
    if (!pathOrUrl) return 'assets/images/logo.png';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl;
    }
    if (this.MEDIA_CDN_URL) {
      return `${this.MEDIA_CDN_URL.replace(/\/+$/, '')}/${pathOrUrl.replace(/^\/+/, '')}`;
    }
    return pathOrUrl;
  }
};
