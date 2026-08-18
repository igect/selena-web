import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createArchiveStore, createInMemoryStorageAdapter } from '../assets/js/archive-store.js';

const mockItems = [
  {
    id: "item-1",
    accession: "ACC-2024-001",
    title: "Selena Portrait",
    creator: "selena",
    creatorName: "Selena",
    category: "highlight",
    date: "2024-01-15",
    medium: "Medium Format Digital",
    location: "Milk Studios, Los Angeles",
    tags: ["Portrait", "Visual Identity"]
  },
  {
    id: "item-2",
    accession: "ACC-2023-088",
    title: "Vogue Paris Editorial",
    creator: "editorial",
    creatorName: "Editorial",
    category: "photo",
    date: "2023-11-20",
    medium: "35mm Kodak Tri-X 400",
    location: "Place Vendôme, Paris",
    tags: ["Editorial", "Fashion"]
  },
  {
    id: "item-3",
    accession: "ACC-2023-074",
    title: "World Tour Concert",
    creator: "live",
    creatorName: "Live",
    category: "video",
    date: "2023-09-05",
    medium: "Arri Alexa Mini LF",
    location: "The O2 Arena, London",
    tags: ["Live", "Concert"]
  }
];

describe('ArchiveStore Deep Module', () => {
  it('initializes with all items and empty favorites by default', () => {
    const adapter = createInMemoryStorageAdapter();
    const store = createArchiveStore(mockItems, adapter);
    const state = store.getState();

    assert.equal(state.totalCount, 3);
    assert.equal(state.filteredCount, 3);
    assert.equal(state.favoritesCount, 0);
    assert.equal(state.hasActiveFilters, false);
    assert.equal(state.filters.viewMode, 'editorial');
  });

  it('filters items by creator', () => {
    const adapter = createInMemoryStorageAdapter();
    const store = createArchiveStore(mockItems, adapter);

    store.setFilter({ creator: 'selena' });
    const state = store.getState();

    assert.equal(state.filteredCount, 1);
    assert.equal(state.filteredItems[0].id, 'item-1');
    assert.equal(state.hasActiveFilters, true);
  });

  it('filters items by category', () => {
    const adapter = createInMemoryStorageAdapter();
    const store = createArchiveStore(mockItems, adapter);

    store.setFilter({ category: 'photo' });
    const state = store.getState();

    assert.equal(state.filteredCount, 1);
    assert.equal(state.filteredItems[0].id, 'item-2');
  });

  it('filters items by fuzzy search across title, description, tags, accession, medium, and location', () => {
    const adapter = createInMemoryStorageAdapter();
    const store = createArchiveStore(mockItems, adapter);

    store.setFilter({ searchQuery: 'concert' });
    let state = store.getState();
    assert.equal(state.filteredCount, 1);
    assert.equal(state.filteredItems[0].id, 'item-3');

    store.setFilter({ searchQuery: 'paris' });
    state = store.getState();
    assert.equal(state.filteredCount, 1);
    assert.equal(state.filteredItems[0].id, 'item-2');

    store.setFilter({ searchQuery: 'ACC-2024-001' });
    state = store.getState();
    assert.equal(state.filteredCount, 1);
    assert.equal(state.filteredItems[0].id, 'item-1');
  });

  it('updates view mode via setViewMode', () => {
    const adapter = createInMemoryStorageAdapter();
    const store = createArchiveStore(mockItems, adapter);

    store.setViewMode('masonry');
    assert.equal(store.getState().filters.viewMode, 'masonry');

    store.setViewMode('index');
    assert.equal(store.getState().filters.viewMode, 'index');
  });

  it('toggles favorites and persists to adapter', () => {
    const adapter = createInMemoryStorageAdapter();
    const store = createArchiveStore(mockItems, adapter);

    store.toggleFavorite('item-1');
    assert.equal(store.isFavorite('item-1'), true);
    assert.equal(store.getState().favoritesCount, 1);
    assert.deepEqual(adapter.getFavorites(), ['item-1']);

    store.toggleFavorite('item-1');
    assert.equal(store.isFavorite('item-1'), false);
    assert.equal(store.getState().favoritesCount, 0);
    assert.deepEqual(adapter.getFavorites(), []);
  });

  it('filters only favorites when onlyFavorites is active', () => {
    const adapter = createInMemoryStorageAdapter(['item-2', 'item-3']);
    const store = createArchiveStore(mockItems, adapter);

    store.setFilter({ onlyFavorites: true });
    const state = store.getState();

    assert.equal(state.filteredCount, 2);
    assert.deepEqual(state.filteredItems.map(i => i.id), ['item-2', 'item-3']);
  });

  it('resets all filters cleanly', () => {
    const adapter = createInMemoryStorageAdapter();
    const store = createArchiveStore(mockItems, adapter);

    store.setFilter({ creator: 'live', searchQuery: 'tour', onlyFavorites: true });
    assert.equal(store.getState().hasActiveFilters, true);

    store.resetFilters();
    const state = store.getState();
    assert.equal(state.filteredCount, 3);
    assert.equal(state.hasActiveFilters, false);
    assert.equal(state.filters.creator, 'all');
    assert.equal(state.filters.searchQuery, '');
    assert.equal(state.filters.onlyFavorites, false);
  });

  it('notifies subscribers reactively on state updates', () => {
    const adapter = createInMemoryStorageAdapter();
    const store = createArchiveStore(mockItems, adapter);
    let notifications = 0;

    const unsubscribe = store.subscribe((state) => {
      notifications++;
    });

    // 1 call immediately on subscribe
    assert.equal(notifications, 1);

    store.setFilter({ category: 'video' });
    assert.equal(notifications, 2);

    store.toggleFavorite('item-3');
    assert.equal(notifications, 3);

    unsubscribe();
    store.setFilter({ category: 'all' });
    assert.equal(notifications, 3); // No more notifications after unsubscribe
  });
});
