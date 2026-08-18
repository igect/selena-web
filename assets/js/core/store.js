/**
 * Selena Media Archive — Core Reactive Application Store
 * Deep module managing state invariants, reactive subscriptions, and cached preferences.
 */

import { AuthAPI } from '../api/auth.js';
import { BoardsAPI } from '../api/boards.js';
import { PinsAPI } from '../api/pins.js';

const storage = {
  get: (k, d = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

export function createAppStore() {
  let state = {
    // Auth & Session
    user: null,
    isAdmin: false,
    authLoading: true,

    // Routing & View
    view: 'home', // 'home' | 'explore' | 'pin' | 'profile' | 'admin'
    activePinId: null,
    activeBoardId: null,
    activeCreatorId: 'all',
    profileTab: 'boards', // 'boards' | 'saved' | 'created'

    // Feed State
    filter: 'all', // 'all' | 'popular' | 'saved'
    query: '',
    sort: 'newest', // 'newest' | 'popular' | 'oldest'
    page: 1,
    pins: [],
    totalCount: 0,
    hasMore: true,
    isLoading: false,

    // User Interactions (optimistic cache)
    savedPinIds: storage.get('selena_saved_pins', []),
    reactions: storage.get('selena_reactions', {}),
    followedCreators: storage.get('selena_followed', []),

    // Metadata
    creators: [],
    boards: []
  };

  const listeners = new Set();

  function notify() {
    listeners.forEach(fn => {
      try {
        fn(state);
      } catch (err) {
        console.error('[Store] Subscriber error:', err);
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

    // Session Mutations
    setUser(user, isAdmin = false) {
      state.user = user;
      state.isAdmin = isAdmin;
      state.authLoading = false;
      notify();
    },

    setAuthLoading(loading) {
      state.authLoading = loading;
      notify();
    },

    setSavedPinIds(ids) {
      state.savedPinIds = Array.isArray(ids) ? ids : [];
      storage.set('selena_saved_pins', state.savedPinIds);
      notify();
    },

    // View & Filter Mutations
    setView(view, params = {}) {
      state.view = view;
      if (params.pinId !== undefined) state.activePinId = params.pinId;
      if (params.boardId !== undefined) state.activeBoardId = params.boardId;
      if (params.creatorId !== undefined) state.activeCreatorId = params.creatorId;
      if (params.profileTab !== undefined) state.profileTab = params.profileTab;
      notify();
    },

    applyRoute(route) {
      const { view, params = {} } = route;
      state.view = view;

      if (params.pinId !== undefined) {
        state.activePinId = params.pinId;
      }

      if (params.boardId !== undefined) {
        state.activeBoardId = params.boardId;
        state.activeCreatorId = 'all';
        state.filter = 'all';
        state.page = 1;
        state.pins = [];
      } else if (params.creatorId !== undefined) {
        state.activeCreatorId = params.creatorId;
        state.activeBoardId = null;
        state.filter = 'all';
        state.page = 1;
        state.pins = [];
      } else if (params.filter !== undefined) {
        state.filter = params.filter;
        state.activeBoardId = null;
        state.activeCreatorId = 'all';
        state.page = 1;
        state.pins = [];
      } else if (view === 'home') {
        state.activeCreatorId = 'all';
        state.activeBoardId = null;
        state.filter = 'all';
        state.page = 1;
        state.pins = [];
      }

      if (params.profileTab !== undefined) {
        state.profileTab = params.profileTab;
      }

      notify();
    },

    setCreator(creator) {
      state.activeCreatorId = creator;
      state.activeBoardId = null;
      state.filter = 'all';
      state.page = 1;
      state.pins = [];
      notify();
    },

    setBoard(boardId) {
      state.activeBoardId = boardId;
      state.activeCreatorId = 'all';
      state.filter = 'all';
      state.page = 1;
      state.pins = [];
      notify();
    },

    setFilter(filter) {
      state.filter = filter;
      state.activeCreatorId = 'all';
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
      state.sort = sort;
      state.page = 1;
      state.pins = [];
      notify();
    },

    setProfileTab(tab) {
      state.profileTab = tab;
      notify();
    },

    // Pins Data Mutations
    setPins(pins, totalCount, hasMore, append = false) {
      state.pins = append ? [...state.pins, ...pins] : pins;
      state.totalCount = totalCount;
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
      notify();
    },

    resetFeed() {
      state.page = 1;
      state.pins = [];
      state.hasMore = true;
      notify();
    },

    // Metadata Mutations
    setMetadata(creators = [], boards = []) {
      state.creators = creators;
      state.boards = boards;
      notify();
    },

    async refreshBoards() {
      try {
        const boards = await BoardsAPI.fetchBoards(state.user?.id);
        state.boards = boards;
        notify();
      } catch (err) {
        console.error('[Store] refreshBoards failed:', err);
      }
    },

    // User Interaction Actions with Rollback
    async toggleSave(pinId) {
      const isSaved = state.savedPinIds.includes(pinId);
      const updated = isSaved ? state.savedPinIds.filter(id => id !== pinId) : [...state.savedPinIds, pinId];
      state.savedPinIds = updated;
      storage.set('selena_saved_pins', updated);
      notify();

      if (state.user) {
        const success = await PinsAPI.toggleSave(pinId, state.user.id, isSaved);
        if (!success) {
          state.savedPinIds = isSaved ? [...state.savedPinIds, pinId] : state.savedPinIds.filter(id => id !== pinId);
          storage.set('selena_saved_pins', state.savedPinIds);
          notify();
          return isSaved;
        }
      }
      return !isSaved;
    },

    async toggleReaction(pinId, reactionType) {
      const rx = { ...(state.reactions[pinId] || {}) };
      const hasReacted = Boolean(rx[reactionType]);

      if (hasReacted) {
        delete rx[reactionType];
      } else {
        rx[reactionType] = true;
      }

      state.reactions[pinId] = rx;
      storage.set('selena_reactions', state.reactions);
      notify();

      if (state.user) {
        const success = await PinsAPI.toggleReaction(pinId, state.user.id, reactionType, hasReacted);
        if (!success) {
          if (hasReacted) rx[reactionType] = true;
          else delete rx[reactionType];
          state.reactions[pinId] = rx;
          storage.set('selena_reactions', state.reactions);
          notify();
          return hasReacted;
        }
      }
      return !hasReacted;
    },

    toggleFollow(creatorId) {
      const isFollowing = state.followedCreators.includes(creatorId);
      const updated = isFollowing
        ? state.followedCreators.filter(id => id !== creatorId)
        : [...state.followedCreators, creatorId];

      state.followedCreators = updated;
      storage.set('selena_followed', updated);
      notify();
      return !isFollowing;
    },

    getReactions(pinId) {
      return state.reactions[pinId] || {};
    },

    async signOut() {
      await AuthAPI.signOut();
      state.user = null;
      state.isAdmin = false;
      state.savedPinIds = [];
      state.reactions = {};
      state.followedCreators = [];
      storage.set('selena_saved_pins', []);
      storage.set('selena_reactions', {});
      storage.set('selena_followed', []);
      notify();
    }
  };
}
