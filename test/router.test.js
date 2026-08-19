import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppRouter } from '../assets/js/core/router.js';

describe('AppRouter Suite', () => {
  it('parses empty and root pathnames to home view', () => {
    globalThis.window = { location: { pathname: '/', hash: '' } };
    const router = new AppRouter();

    assert.deepEqual(router.parseRoute(), { view: 'home', params: {} });

    globalThis.window.location.pathname = '';
    assert.deepEqual(router.parseRoute(), { view: 'home', params: {} });
  });

  it('parses clean pin detail route', () => {
    globalThis.window = { location: { pathname: '/pin/11111111-2222-3333-4444-555555555555', hash: '' } };
    const router = new AppRouter();

    assert.deepEqual(router.parseRoute(), {
      view: 'pin',
      params: { pinId: '11111111-2222-3333-4444-555555555555' }
    });
  });

  it('parses creator, board, and filter routes', () => {
    const router = new AppRouter();

    globalThis.window = { location: { pathname: '/creator/rose', hash: '' } };
    assert.deepEqual(router.parseRoute(), {
      view: 'home',
      params: { creatorId: 'rose' }
    });

    globalThis.window = { location: { pathname: '/board/board-uuid-1', hash: '' } };
    assert.deepEqual(router.parseRoute(), {
      view: 'home',
      params: { boardId: 'board-uuid-1' }
    });

    globalThis.window = { location: { pathname: '/filter/popular', hash: '' } };
    assert.deepEqual(router.parseRoute(), {
      view: 'home',
      params: { filter: 'popular' }
    });
  });

  it('parses profile tabs and admin routes', () => {
    const router = new AppRouter();

    globalThis.window = { location: { pathname: '/profile/saved', hash: '' } };
    assert.deepEqual(router.parseRoute(), {
      view: 'profile',
      params: { profileTab: 'saved' }
    });

    globalThis.window = { location: { pathname: '/explore', hash: '' } };
    assert.deepEqual(router.parseRoute(), {
      view: 'explore',
      params: {}
    });

    globalThis.window = { location: { pathname: '/admin', hash: '' } };
    assert.deepEqual(router.parseRoute(), {
      view: 'admin',
      params: {}
    });
  });

  it('supports legacy hash routing fallback', () => {
    const router = new AppRouter();

    globalThis.window = { location: { pathname: '/', hash: '#/profile/saved' } };
    assert.deepEqual(router.parseRoute(), {
      view: 'profile',
      params: { profileTab: 'saved' }
    });

    globalThis.window = { location: { pathname: '/', hash: '#/pin/test-pin-id' } };
    assert.deepEqual(router.parseRoute(), {
      view: 'pin',
      params: { pinId: 'test-pin-id' }
    });
  });
});
