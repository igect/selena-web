/**
 * Selena Media Archive — SPA Client Router
 * Uses URL hash routing compatible with static hosting (GitHub Pages).
 */

export function createRouter(store) {
  function handleRouteChange() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const segments = hash.split('/').filter(Boolean);

    if (segments.length === 0 || segments[0] === 'home') {
      store.setView('home');
    } else if (segments[0] === 'explore') {
      store.setView('explore');
    } else if (segments[0] === 'profile') {
      const tab = segments[1] || 'boards';
      store.setView('profile', { profileTab: tab });
    } else if (segments[0] === 'admin') {
      store.setView('admin');
    } else if (segments[0] === 'pin' && segments[1]) {
      store.setView('pin', { pinId: decodeURIComponent(segments[1]) });
    } else if (segments[0] === 'creator' && segments[1]) {
      store.setCreator(decodeURIComponent(segments[1]));
      store.setView('home');
    } else {
      store.setView('home');
    }
  }

  function navigate(path) {
    const clean = path.startsWith('#') ? path : `#/${path.replace(/^\/+/, '')}`;
    if (window.location.hash !== clean) {
      window.location.hash = clean;
    } else {
      handleRouteChange();
    }
  }

  function init() {
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange();
  }

  return {
    init,
    navigate,
    getCurrentRoute() {
      return window.location.hash.replace(/^#\/?/, '');
    }
  };
}
