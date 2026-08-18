/**
 * Selena Media Archive — Client-Side Hash Router
 * Deep module resolving URL hashes into structured routing intents.
 */

export class AppRouter {
  constructor(onRouteChange) {
    this.onRouteChange = onRouteChange;
    this.handleHashChange = this.handleHashChange.bind(this);
    this.lastNonPinRoute = '';
  }

  /**
   * Initializes the router and binds window event listeners
   */
  init() {
    window.addEventListener('hashchange', this.handleHashChange);
    this.handleHashChange();
  }

  /**
   * Parses the current window location hash into route descriptor
   */
  parseRoute() {
    const raw = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '').trim();
    const parts = raw.split('/').filter(Boolean);

    if (parts.length === 0) {
      return { view: 'home', params: {} };
    }

    const [segment, param] = parts;

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

  handleHashChange() {
    const raw = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '').trim();
    const route = this.parseRoute();
    if (route.view !== 'pin') {
      this.lastNonPinRoute = raw;
    }
    if (typeof this.onRouteChange === 'function') {
      this.onRouteChange(route);
    }
  }

  /**
   * Programmatically navigates to a route
   */
  navigate(path, replace = false) {
    const clean = path.replace(/^#\/?/, '');
    const targetHash = clean ? `#/${clean}` : '#/';

    if (typeof window === 'undefined') return;

    if (window.location.hash === targetHash) {
      this.handleHashChange();
      return;
    }

    if (replace) {
      const url = window.location.pathname + window.location.search + targetHash;
      window.location.replace(url);
    } else {
      window.location.hash = targetHash;
    }
  }

  /**
   * Closes pin modal and restores the prior view/filter route
   */
  closePin() {
    this.navigate(this.lastNonPinRoute || '');
  }

  /**
   * Destroys router event listeners
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('hashchange', this.handleHashChange);
    }
  }
}
