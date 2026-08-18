import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAppStore } from '../assets/js/core/store.js';

describe('AppStore Deep Module Suite', () => {
  it('initializes with default state', () => {
    const store = createAppStore();
    const state = store.getState();

    assert.equal(state.view, 'home');
    assert.equal(state.activeCreatorId, 'all');
    assert.equal(state.activeBoardId, null);
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
    assert.equal(state.activeCreatorId, 'rose');
    assert.equal(state.activeBoardId, null);
    assert.equal(state.page, 1);
  });

  it('atomically applies routes with applyRoute', () => {
    const store = createAppStore();
    store.nextPage();

    store.applyRoute({ view: 'home', params: { creatorId: 'yamu' } });
    let state = store.getState();
    assert.equal(state.view, 'home');
    assert.equal(state.activeCreatorId, 'yamu');
    assert.equal(state.activeBoardId, null);
    assert.equal(state.filter, 'all');
    assert.equal(state.page, 1);

    store.applyRoute({ view: 'profile', params: { profileTab: 'saved' } });
    state = store.getState();
    assert.equal(state.view, 'profile');
    assert.equal(state.profileTab, 'saved');
  });

  it('sets and merges savedPinIds from server', () => {
    const store = createAppStore();
    store.setSavedPinIds(['pin-1', 'pin-2']);
    assert.deepEqual(store.getState().savedPinIds, ['pin-1', 'pin-2']);
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
    const pinId = 'pin-test-101';

    const saved1 = await store.toggleSave(pinId);
    assert.equal(saved1, true);
    assert.equal(store.getState().savedPinIds.includes(pinId), true);

    const saved2 = await store.toggleSave(pinId);
    assert.equal(saved2, false);
    assert.equal(store.getState().savedPinIds.includes(pinId), false);
  });

  it('toggles pin reactions', async () => {
    const store = createAppStore();
    const pinId = 'pin-test-202';

    const rx1 = await store.toggleReaction(pinId, 'love');
    assert.equal(rx1, true);
    assert.equal(Boolean(store.getState().reactions[pinId]?.love), true);

    const rx2 = await store.toggleReaction(pinId, 'love');
    assert.equal(rx2, false);
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

    assert.equal(callCount, 1);

    store.setSort('popular');
    assert.equal(callCount, 2);

    unsubscribe();
    store.setSort('oldest');
    assert.equal(callCount, 2);
  });

  it('updates board filter and resets creator and page', () => {
    const store = createAppStore();
    store.setCreator('rose');
    store.nextPage();
    assert.equal(store.getState().page, 2);

    store.setBoard('board-uuid-123');
    const state = store.getState();
    assert.equal(state.activeBoardId, 'board-uuid-123');
    assert.equal(state.activeCreatorId, 'all');
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
