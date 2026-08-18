/**
 * Selena Media Archive — SPA Client Router
 * Uses URL hash routing compatible with static hosting (GitHub Pages).
 */

export function createRouter(store) {
  function handleRouteChange() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const segments = hash.split('/').filter(Boolean);

    const titles = {
      home: 'Selena — Visual Media & Aesthetic Archive',
      explore: 'Explore Collections — Selena',
      profile: 'My Saved Ideas — Selena',
      admin: 'Admin CMS Dashboard — Selena',
      pin: 'Visual Pin — Selena'
    };

    if (segments.length === 0 || segments[0] === 'home') {
      store.setView('home');
      if (typeof document !== 'undefined') document.title = titles.home;
    } else if (segments[0] === 'explore') {
      store.setView('explore');
      if (typeof document !== 'undefined') document.title = titles.explore;
    } else if (segments[0] === 'profile') {
      const tab = segments[1] || 'boards';
      store.setView('profile', { profileTab: tab });
      if (typeof document !== 'undefined') document.title = titles.profile;
    } else if (segments[0] === 'admin') {
      store.setView('admin');
      if (typeof document !== 'undefined') document.title = titles.admin;
    } else if (segments[0] === 'pin' && segments[1]) {
      store.setView('pin', { pinId: decodeURIComponent(segments[1]) });
      if (typeof document !== 'undefined') document.title = titles.pin;
    } else if (segments[0] === 'creator' && segments[1]) {
      store.setCreator(decodeURIComponent(segments[1]));
      store.setView('home');
      if (typeof document !== 'undefined') document.title = `${decodeURIComponent(segments[1])} — Selena`;
    } else {
      store.setView('home');
      if (typeof document !== 'undefined') document.title = titles.home;
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
