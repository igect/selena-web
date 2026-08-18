/**
 * Selena Archive — Deep ArchiveStore Module
 * Encapsulates all filtering, sorting, view mode state, favorites persistence, and reactive updates
 */

/**
 * In-Memory Storage Adapter (for tests and headless environments)
 */
export function createInMemoryStorageAdapter(initialIds = []) {
  const store = new Set(initialIds);
  return {
    getFavorites() {
      return Array.from(store);
    },
    setFavorites(ids) {
      store.clear();
      ids.forEach(id => store.add(id));
    }
  };
}

/**
 * LocalStorage Adapter (for browser production environments)
 */
export function createLocalStorageAdapter(storageKey = 'selena_favorites') {
  return {
    getFavorites() {
      if (typeof window === 'undefined' || !window.localStorage) {
        return [];
      }
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn('Failed to read favorites from localStorage:', e);
        return [];
      }
    },
    setFavorites(ids) {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(ids));
      } catch (e) {
        console.warn('Failed to save favorites to localStorage:', e);
      }
    }
  };
}

/**
 * Factory for creating a deep ArchiveStore
 */
export function createArchiveStore(items = [], storageAdapter = null) {
  const adapter = storageAdapter || (
    typeof window !== 'undefined' && window.localStorage
      ? createLocalStorageAdapter()
      : createInMemoryStorageAdapter()
  );

  // Private state
  const rawItems = [...items];
  const favorites = new Set(adapter.getFavorites());
  const listeners = new Set();

  let filterState = {
    creator: 'all',
    category: 'all',
    searchQuery: '',
    onlyFavorites: false,
    sort: 'newest',
    viewMode: 'editorial' // 'editorial' | 'masonry' | 'index'
  };

  function computeFilteredItems() {
    const q = filterState.searchQuery.trim().toLowerCase();

    return rawItems
      .filter(item => {
        // Creator match
        if (filterState.creator !== 'all' && item.creator !== filterState.creator) {
          return false;
        }

        // Category match
        if (filterState.category !== 'all' && item.category !== filterState.category) {
          return false;
        }

        // Favorites filter
        if (filterState.onlyFavorites && !favorites.has(item.id)) {
          return false;
        }

        // Search query match across title, description, tags, creatorName, accession, medium, location
        if (q) {
          const titleMatch = item.title && item.title.toLowerCase().includes(q);
          const descMatch = item.description && item.description.toLowerCase().includes(q);
          const tagMatch = item.tags && item.tags.some(t => t.toLowerCase().includes(q));
          const creatorMatch = item.creatorName && item.creatorName.toLowerCase().includes(q);
          const accessionMatch = item.accession && item.accession.toLowerCase().includes(q);
          const mediumMatch = item.medium && item.medium.toLowerCase().includes(q);
          const locMatch = item.location && item.location.toLowerCase().includes(q);

          if (!titleMatch && !descMatch && !tagMatch && !creatorMatch && !accessionMatch && !mediumMatch && !locMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (filterState.sort === 'newest') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (filterState.sort === 'oldest') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (filterState.sort === 'popular') {
          const favA = favorites.has(a.id) ? 1 : 0;
          const favB = favorites.has(b.id) ? 1 : 0;
          if (favA !== favB) return favB - favA;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (filterState.sort === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (filterState.sort === 'accession') {
          return (a.accession || '').localeCompare(b.accession || '');
        }
        return 0;
      });
  }

  function notify() {
    const state = getState();
    listeners.forEach(fn => {
      try {
        fn(state);
      } catch (err) {
        console.error('ArchiveStore subscriber error:', err);
      }
    });
  }

  function getState() {
    const filteredItems = computeFilteredItems();
    return {
      items: rawItems,
      filteredItems,
      totalCount: rawItems.length,
      filteredCount: filteredItems.length,
      favoritesCount: favorites.size,
      favorites: new Set(favorites),
      filters: { ...filterState },
      hasActiveFilters: filterState.creator !== 'all' ||
                        filterState.category !== 'all' ||
                        Boolean(filterState.searchQuery) ||
                        filterState.onlyFavorites
    };
  }

  // Public Interface
  return {
    getState,

    setFilter(patch) {
      filterState = { ...filterState, ...patch };
      notify();
    },

    setViewMode(viewMode) {
      if (['editorial', 'masonry', 'index'].includes(viewMode)) {
        filterState.viewMode = viewMode;
        notify();
      }
    },

    toggleFavorite(id) {
      if (favorites.has(id)) {
        favorites.delete(id);
      } else {
        favorites.add(id);
      }
      adapter.setFavorites(Array.from(favorites));
      notify();
    },

    isFavorite(id) {
      return favorites.has(id);
    },

    resetFilters() {
      filterState = {
        ...filterState,
        creator: 'all',
        category: 'all',
        searchQuery: '',
        onlyFavorites: false
      };
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      // Immediately emit current state to new subscriber
      listener(getState());
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
