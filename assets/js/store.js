/**
 * Selena Media Archive — Reactive Application Store
 * Coordinates state, active filters, user session, admin rights, and subscribers.
 */

import { AuthAPI } from './api/auth-api.js';
import { PinsAPI } from './api/pins-api.js';

const storage = {
  get: (k, d = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
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
    boardId: null,
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
    savedPinIds: storage.get('pinterest_saved_pins', []),
    reactions: storage.get('pinterest_reactions', {}),
    followedCreators: storage.get('pinterest_followed', []),

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

    getSavedCount() {
      return state.savedPinIds.length;
    },

    getFollowingCount() {
      return state.followedCreators.length;
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },

    async refreshBoards() {
      try {
        const boards = await PinsAPI.fetchBoards(state.user?.id);
        state.boards = boards;
        notify();
      } catch (err) {
        console.warn('[Store] refreshBoards error:', err);
      }
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
      if (state.creator === creator && state.boardId === null) return;
      state.creator = creator;
      state.boardId = null;
      state.page = 1;
      state.pins = [];
      notify();
    },

    setBoard(boardId) {
      if (state.boardId === boardId) return;
      state.boardId = boardId;
      state.creator = 'all';
      state.page = 1;
      state.pins = [];
      notify();
    },

    setFilter(filter) {
      if (state.filter === filter && state.boardId === null) return;
      state.filter = filter;
      state.boardId = null;
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
      storage.set('pinterest_saved_pins', updated);
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
      storage.set('pinterest_reactions', state.reactions);
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
      storage.set('pinterest_followed', updated);
      notify();
    },

    /**
     * Get Reactions for Pin
     */
    getReactions(pinId) {
      return state.reactions[pinId] || {};
    },

    /**
     * Sign out current user
     */
    async signOut() {
      await AuthAPI.signOut();
      state.user = null;
      state.isAdmin = false;
      notify();
    }
  };
}
