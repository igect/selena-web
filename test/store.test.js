import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAppStore } from '../assets/js/store.js';

describe('AppStore Reactive State Suite', () => {
  it('initializes with default state', () => {
    const store = createAppStore();
    const state = store.getState();

    assert.equal(state.view, 'home');
    assert.equal(state.creator, 'all');
    assert.equal(state.filter, 'all');
    assert.equal(state.sort, 'newest');
    assert.equal(state.query, '');
    assert.equal(Array.isArray(state.pins), true);
  });

  it('updates creator and resets page', () => {
    const store = createAppStore();
    store.nextPage();
    assert.equal(store.getState().page, 2);

    store.setCreator('rose');
    const state = store.getState();
    assert.equal(state.creator, 'rose');
    assert.equal(state.page, 1);
  });

  it('updates search query and resets page', () => {
    const store = createAppStore();
    store.nextPage();

    store.setQuery('Crimson');
    const state = store.getState();
    assert.equal(state.query, 'Crimson');
    assert.equal(state.page, 1);
  });

  it('toggles pin bookmarks (saves)', async () => {
    const store = createAppStore();
    const pinId = 'test-pin-101';

    await store.toggleSave(pinId);
    assert.equal(store.getState().savedPinIds.includes(pinId), true);

    await store.toggleSave(pinId);
    assert.equal(store.getState().savedPinIds.includes(pinId), false);
  });

  it('toggles pin reactions', async () => {
    const store = createAppStore();
    const pinId = 'test-pin-202';

    await store.toggleReaction(pinId, 'love');
    assert.equal(Boolean(store.getState().reactions[pinId]?.love), true);

    await store.toggleReaction(pinId, 'love');
    assert.equal(Boolean(store.getState().reactions[pinId]?.love), false);
  });

  it('toggles creator follow status', () => {
    const store = createAppStore();
    const creatorId = 'rose';

    store.toggleFollow(creatorId);
    assert.equal(store.getState().followedCreators.includes(creatorId), true);

    store.toggleFollow(creatorId);
    assert.equal(store.getState().followedCreators.includes(creatorId), false);
  });

  it('notifies subscribers on state changes', () => {
    const store = createAppStore();
    let callCount = 0;
    const unsubscribe = store.subscribe(() => {
      callCount++;
    });

    assert.equal(callCount, 1); // Initial notification on subscribe

    store.setSort('popular');
    assert.equal(callCount, 2);

    unsubscribe();
    store.setSort('oldest');
    assert.equal(callCount, 2); // Unsubscribed, no extra call
  });

  it('updates board filter and resets creator and page', () => {
    const store = createAppStore();
    store.setCreator('rose');
    store.nextPage();
    assert.equal(store.getState().page, 2);

    store.setBoard('board-uuid-123');
    const state = store.getState();
    assert.equal(state.boardId, 'board-uuid-123');
    assert.equal(state.creator, 'all');
    assert.equal(state.page, 1);
  });

  it('signs out user and clears admin state', async () => {
    const store = createAppStore();
    store.setUser({ id: 'user-1', email: 'test@example.com' }, true);
    assert.equal(store.getState().isAdmin, true);

    await store.signOut();
    assert.equal(store.getState().user, null);
    assert.equal(store.getState().isAdmin, false);
  });
});
