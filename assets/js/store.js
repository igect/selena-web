/**
 * Selena Media Archive — Reactive Application Store
 * Coordinates state, active filters, user session, admin rights, and subscribers.
 */

import { AuthAPI } from './api/auth-api.js';
import { PinsAPI } from './api/pins-api.js';

const safeStorage = {
  get(key, fallback = null) {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, val) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(val));
      }
    } catch {}
  }
};

export function createAppStore() {
  let state = {
    // Current user session & roles
    user: null,
    isAdmin: false,
    authLoading: true,

    // Navigation & Views
    view: 'home', // 'home' | 'explore' | 'profile' | 'admin' | 'pin'
    activePinId: null,
    profileTab: 'boards', // 'boards' | 'saved' | 'created'

    // Filtering & Query
    creator: 'all',
    filter: 'all', // 'all' | 'popular' | 'saved'
    query: '',
    sort: 'newest',
    onlySaved: false,

    // Data lists
    pins: [],
    totalPinsCount: 0,
    page: 1,
    hasMore: true,
    isLoading: false,

    // User Interactions
    savedPinIds: safeStorage.get('pinterest_saved_pins', []),
    reactions: safeStorage.get('pinterest_reactions', {}),
    followedCreators: safeStorage.get('pinterest_followed', []),

    // Creators & Boards metadata
    creators: [],
    boards: []
  };

  const listeners = new Set();

  function notify() {
    listeners.forEach(fn => {
      try {
        fn(state);
      } catch (err) {
        console.error('[Store] Listener error:', err);
      }
    });
  }

  return {
    getState() {
      return { ...state };
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },

    /**
     * Initialize Session & Metadata
     */
    async init() {
      state.authLoading = true;
      notify();

      try {
        const [user, isAdmin, creators, boards] = await Promise.all([
          AuthAPI.getCurrentUser(),
          AuthAPI.isCurrentUserAdmin(),
          PinsAPI.fetchCreators(),
          PinsAPI.fetchBoards()
        ]);

        state.user = user;
        state.isAdmin = isAdmin;
        state.creators = creators;
        state.boards = boards;
      } catch (err) {
        console.warn('[Store] Init warning:', err);
      } finally {
        state.authLoading = false;
        notify();
      }
    },

    setUser(user, isAdmin = false) {
      state.user = user;
      state.isAdmin = isAdmin;
      notify();
    },

    setView(view, extra = {}) {
      state.view = view;
      if (extra.pinId !== undefined) state.activePinId = extra.pinId;
      if (extra.profileTab !== undefined) state.profileTab = extra.profileTab;
      notify();
    },

    setCreator(creator) {
      if (state.creator === creator) return;
      state.creator = creator;
      state.page = 1;
      state.pins = [];
      notify();
    },

    setFilter(filter) {
      if (state.filter === filter) return;
      state.filter = filter;
      state.page = 1;
      state.pins = [];
      notify();
    },

    setQuery(query) {
      state.query = query;
      state.page = 1;
      state.pins = [];
      notify();
    },

    setSort(sort) {
      if (state.sort === sort) return;
      state.sort = sort;
      state.page = 1;
      state.pins = [];
      notify();
    },

    setProfileTab(tab) {
      state.profileTab = tab;
      notify();
    },

    setPinsData(pins, totalCount, hasMore, append = false) {
      state.pins = append ? [...state.pins, ...pins] : pins;
      state.totalPinsCount = totalCount;
      state.hasMore = hasMore;
      state.isLoading = false;
      notify();
    },

    setLoading(isLoading) {
      state.isLoading = isLoading;
      notify();
    },

    nextPage() {
      state.page += 1;
    },

    resetPage() {
      state.page = 1;
      state.pins = [];
    },

    /**
     * Bookmark / Save Pin
     */
    async toggleSave(pinId) {
      const isSaved = state.savedPinIds.includes(pinId);
      let updated;
      if (isSaved) {
        updated = state.savedPinIds.filter(id => id !== pinId);
      } else {
        updated = [...state.savedPinIds, pinId];
      }
      state.savedPinIds = updated;
      safeStorage.set('pinterest_saved_pins', updated);
      notify();

      if (state.user) {
        await PinsAPI.toggleSave(pinId, state.user.id, isSaved);
      }
    },

    /**
     * Toggle Reaction (love, sparkle, fire)
     */
    async toggleReaction(pinId, reactionType) {
      const pinRx = state.reactions[pinId] || {};
      const hasReacted = Boolean(pinRx[reactionType]);

      if (hasReacted) {
        delete pinRx[reactionType];
      } else {
        pinRx[reactionType] = true;
      }

      state.reactions[pinId] = pinRx;
      safeStorage.set('pinterest_reactions', state.reactions);
      notify();

      if (state.user) {
        await PinsAPI.toggleReaction(pinId, state.user.id, reactionType, hasReacted);
      }
    },

    /**
     * Follow/Unfollow Creator
     */
    toggleFollow(creatorId) {
      const isFollowing = state.followedCreators.includes(creatorId);
      let updated;
      if (isFollowing) {
        updated = state.followedCreators.filter(c => c !== creatorId);
      } else {
        updated = [...state.followedCreators, creatorId];
      }
      state.followedCreators = updated;
      safeStorage.set('pinterest_followed', updated);
      notify();
    }
  };
}
