/**
 * Selena Media Archive — Client-Side History Router
 * Deep module resolving URL paths into structured routing intents.
 */

export class AppRouter {
  constructor(onRouteChange) {
    this.onRouteChange = onRouteChange;
    this.handleLocationChange = this.handleLocationChange.bind(this);
    this.lastNonPinRoute = '/';
  }

  /**
   * Initializes the router and binds window event listeners
   */
  init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.handleLocationChange);

      // Handle SPA redirect query parameter (from 404.html)
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('p');
      if (redirectPath) {
        const cleanPath = redirectPath.startsWith('/') ? redirectPath : '/' + redirectPath;
        window.history.replaceState(null, '', cleanPath + window.location.hash);
      } else if (window.location.hash && window.location.hash.startsWith('#/')) {
        // Migrate legacy hash route to clean URL
        const cleanPath = '/' + window.location.hash.replace(/^#\/?/, '');
        window.history.replaceState(null, '', cleanPath);
      }
    }
    this.handleLocationChange();
  }

  /**
   * Parses the current window location path into route descriptor
   */
  parseRoute() {
    let raw = '';
    if (typeof window !== 'undefined') {
      // If there's an active hash route (e.g. legacy link or during migration)
      if (window.location.hash && window.location.hash.startsWith('#/')) {
        raw = window.location.hash.replace(/^#\/?/, '').trim();
      } else {
        raw = (window.location.pathname || '').replace(/^\/+/, '').trim();
      }
    }

    const parts = raw.split('/').filter(Boolean);

    if (parts.length === 0) {
      return { view: 'home', params: {} };
    }

    const knownSegments = ['pin', 'board', 'creator', 'filter', 'explore', 'profile', 'admin'];
    const knownIndex = parts.findIndex(p => knownSegments.includes(p.toLowerCase()));

    if (knownIndex === -1) {
      return { view: 'home', params: {} };
    }

    const segment = parts[knownIndex].toLowerCase();
    const param = parts[knownIndex + 1];

    switch (segment) {
      case 'pin':
        return { view: 'pin', params: { pinId: param } };

      case 'board':
        return { view: 'home', params: { boardId: param } };

      case 'creator':
        return { view: 'home', params: { creatorId: param } };

      case 'filter':
        return { view: 'home', params: { filter: param } };

      case 'explore':
        return { view: 'explore', params: {} };

      case 'profile':
        return { view: 'profile', params: { profileTab: param || 'boards' } };

      case 'admin':
        return { view: 'admin', params: {} };

      default:
        return { view: 'home', params: {} };
    }
  }

  handleLocationChange() {
    const raw = typeof window !== 'undefined'
      ? (window.location.pathname || '').replace(/^\/+/, '').trim()
      : '';
    const route = this.parseRoute();
    if (route.view !== 'pin') {
      this.lastNonPinRoute = raw ? `/${raw}` : '/';
    }
    if (typeof this.onRouteChange === 'function') {
      this.onRouteChange(route);
    }
  }

  /**
   * Programmatically navigates to a route
   */
  navigate(path = '', replace = false) {
    if (typeof window === 'undefined') return;

    const clean = String(path).replace(/^#\/?/, '').replace(/^\/+/, '');
    const targetPath = clean ? `/${clean}` : '/';

    if (window.location.pathname === targetPath && !window.location.hash) {
      this.handleLocationChange();
      return;
    }

    if (replace) {
      window.history.replaceState(null, '', targetPath);
    } else {
      window.history.pushState(null, '', targetPath);
    }

    this.handleLocationChange();
  }

  /**
   * Closes pin modal and restores the prior view/filter route
   */
  closePin() {
    this.navigate(this.lastNonPinRoute || '/', true);
  }

  /**
   * Destroys router event listeners
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.handleLocationChange);
    }
  }
}
