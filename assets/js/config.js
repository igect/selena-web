/**
 * Selena Media Archive — Application Configuration
 * Public runtime settings and live Supabase endpoints.
 */

const runtimeConfig = (typeof window !== 'undefined' && window.APP_CONFIG) || {};

export const CONFIG = {
  SUPABASE_URL: runtimeConfig.SUPABASE_URL || 'https://mdsoymxqbbgzdwtsuyll.supabase.co',
  SUPABASE_ANON_KEY: runtimeConfig.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc295bXhxYmJnemR3dHN1eWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjEyOTgsImV4cCI6MjEwMjU5NzI5OH0.Wxz2WL8UwKUX9rnM19Htz7LI8TWaUecZKR7nWEpevUs',
  ENABLE_GOOGLE_AUTH: runtimeConfig.ENABLE_GOOGLE_AUTH !== false,
  MEDIA_CDN_URL: runtimeConfig.MEDIA_CDN_URL || '',
  PAGE_SIZE: 24,
  APP_NAME: 'Selena Media Archive',
  VERSION: '2.0.0',
  IS_PRODUCTION: true,

  isCloudConfigured() {
    return Boolean(this.SUPABASE_URL && this.SUPABASE_ANON_KEY);
  },

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
