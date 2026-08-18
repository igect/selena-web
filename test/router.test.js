import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppRouter } from '../assets/js/core/router.js';

describe('AppRouter Suite', () => {
  it('parses empty and default routes to home view', () => {
    globalThis.window = { location: { hash: '' } };
    const router = new AppRouter();

    assert.deepEqual(router.parseRoute(), { view: 'home', params: {} });

    globalThis.window.location.hash = '#/';
    assert.deepEqual(router.parseRoute(), { view: 'home', params: {} });
  });

  it('parses pin detail route', () => {
    globalThis.window = { location: { hash: '#/pin/11111111-2222-3333-4444-555555555555' } };
    const router = new AppRouter();

    assert.deepEqual(router.parseRoute(), {
      view: 'pin',
      params: { pinId: '11111111-2222-3333-4444-555555555555' }
    });
  });

  it('parses creator, board, and filter routes', () => {
    const router = new AppRouter();

    globalThis.window.location.hash = '#/creator/rose';
    assert.deepEqual(router.parseRoute(), {
      view: 'home',
      params: { creatorId: 'rose' }
    });

    globalThis.window.location.hash = '#/board/board-uuid-1';
    assert.deepEqual(router.parseRoute(), {
      view: 'home',
      params: { boardId: 'board-uuid-1' }
    });

    globalThis.window.location.hash = '#/filter/popular';
    assert.deepEqual(router.parseRoute(), {
      view: 'home',
      params: { filter: 'popular' }
    });
  });

  it('parses profile tabs and admin routes', () => {
    const router = new AppRouter();

    globalThis.window.location.hash = '#/profile/saved';
    assert.deepEqual(router.parseRoute(), {
      view: 'profile',
      params: { profileTab: 'saved' }
    });

    globalThis.window.location.hash = '#/admin';
    assert.deepEqual(router.parseRoute(), {
      view: 'admin',
      params: {}
    });
  });
});
