/**
 * Selena Media Archive — Application Configuration
 * Holds public runtime environment settings, Supabase keys, and CDN paths.
 */

// Priority order: window.APP_CONFIG (injected at build) > localStorage > defaults
const runtimeConfig = (typeof window !== 'undefined' && window.APP_CONFIG) || {};

const getSafeStorage = (key) => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : '';
  } catch {
    return '';
  }
};

export const CONFIG = {
  // Public Supabase Configuration
  // Note: Anon key is designed for public client use and secured via Row Level Security (RLS).
  SUPABASE_URL: runtimeConfig.SUPABASE_URL || getSafeStorage('selena_supabase_url') || '',
  SUPABASE_ANON_KEY: runtimeConfig.SUPABASE_ANON_KEY || getSafeStorage('selena_supabase_anon_key') || '',

  // Media CDN Base URL (Cloudflare R2 / Supabase Storage / local fallback)
  MEDIA_CDN_URL: runtimeConfig.MEDIA_CDN_URL || '',

  // Pagination Settings
  PAGE_SIZE: 24,

  // App Metadata
  APP_NAME: 'Selena Media Archive',
  VERSION: '2.0.0',
  IS_PRODUCTION: typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',

  /**
   * Checks whether live Supabase backend is configured
   */
  isCloudConfigured() {
    return Boolean(this.SUPABASE_URL && this.SUPABASE_ANON_KEY);
  },

  /**
   * Helper to resolve full image URL
   */
  resolveImageUrl(pathOrUrl) {
    if (!pathOrUrl) return 'assets/images/logo.png';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl;
    }
    if (this.MEDIA_CDN_URL) {
      const cleanBase = this.MEDIA_CDN_URL.replace(/\/+$/, '');
      const cleanPath = pathOrUrl.replace(/^\/+/, '');
      return `${cleanBase}/${cleanPath}`;
    }
    return pathOrUrl;
  }
};
