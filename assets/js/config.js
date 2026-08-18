/**
 * Selena Media Archive — Application Configuration
 * Single source of truth for runtime constants, endpoints, and CDN resolvers.
 */

const runtime = (typeof window !== 'undefined' && window.APP_CONFIG) || {};

export const CONFIG = {
  SUPABASE_URL: runtime.SUPABASE_URL,
  SUPABASE_ANON_KEY: runtime.SUPABASE_ANON_KEY,
  MEDIA_CDN_URL: runtime.MEDIA_CDN_URL,
  DEFAULT_IMAGE_URL: runtime.DEFAULT_IMAGE_URL || 'assets/images/logo.png',
  PAGE_SIZE: 24,
  APP_NAME: 'Selena Media Archive',
  VERSION: '3.0.0',

  /**
   * Resolves a media path into an absolute or relative image URL.
   */
  resolveImageUrl(pathOrUrl) {
    if (!pathOrUrl) return this.DEFAULT_IMAGE_URL;
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl;
    }
    if (this.MEDIA_CDN_URL) {
      return `${this.MEDIA_CDN_URL.replace(/\/+$/, '')}/${pathOrUrl.replace(/^\/+/, '')}`;
    }
    return pathOrUrl;
  }
};
