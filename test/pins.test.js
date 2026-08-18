import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PinsAPI } from '../assets/js/api/pins.js';

describe('PinsAPI Module Suite', () => {
  it('formats raw PostgreSQL row into normalized Pin object', () => {
    const rawRow = {
      id: 'd9b3d111-2222-3333-4444-555555555555',
      legacy_id: 'rose-01',
      user_id: 'user-uuid-999',
      title: 'Velvet Midnight Shoot',
      creator_id: 'rose',
      creators: { name: 'Rosé', handle: '@roses_are_rosie', avatar_url: 'assets/images/logo.png', follower_count: 1420000 },
      category: 'photo',
      aspect_ratio: 1.5,
      image_url: 'https://mdsoymxqbbgzdwtsuyll.supabase.co/storage/v1/object/public/archive-pins/archive/rose_01.jpg',
      image_path: 'archive/rose_01.jpg',
      destination_link: 'https://instagram.com/roses_are_rosie',
      tags: ['fashion', 'velvet', 'editorial'],
      saves_count: 342,
      likes_count: 120,
      is_published: true,
      is_featured: true,
      published_at: '2026-05-10T12:00:00Z',
      boards: { id: '11111111-1111-1111-1111-111111111111', name: 'Rosé Collection', slug: 'rose-collection' }
    };

    const formatted = PinsAPI.formatPinRow(rawRow);

    assert.equal(formatted.id, 'd9b3d111-2222-3333-4444-555555555555');
    assert.equal(formatted.userId, 'user-uuid-999');
    assert.equal(formatted.title, 'Velvet Midnight Shoot');
    assert.equal(formatted.creator, 'rose');
    assert.equal(formatted.creatorName, 'Rosé');
    assert.equal(formatted.creatorHandle, '@roses_are_rosie');
    assert.equal(formatted.creatorFollowers, 1420000);
    assert.equal(formatted.board, 'Rosé Collection');
    assert.equal(formatted.savesCount, 342);
    assert.equal(formatted.likesCount, 120);
    assert.equal(formatted.isPublished, true);
    assert.equal(formatted.aspectRatio, 1.5);
    assert.deepEqual(formatted.tags, ['fashion', 'velvet', 'editorial']);
  });

  it('handles null row safely', () => {
    assert.equal(PinsAPI.formatPinRow(null), null);
    assert.equal(PinsAPI.formatPinRow(undefined), null);
  });

  it('falls back gracefully on missing relations and defaults', () => {
    const rawRow = {
      id: 'test-uuid-99',
      title: 'Minimal Pin',
      creator_id: 'yamu',
      creators: null,
      boards: null,
      image_url: 'https://example.com/photo.jpg',
      published_at: '2026-06-01T00:00:00Z'
    };

    const formatted = PinsAPI.formatPinRow(rawRow);

    assert.equal(formatted.creatorName, 'yamu');
    assert.equal(formatted.creatorHandle, '');
    assert.equal(formatted.creatorAvatar, 'assets/images/logo.png');
    assert.equal(formatted.board, 'General');
    assert.equal(formatted.userId, null);
    assert.equal(formatted.aspectRatio, null);
    assert.equal(formatted.savesCount, 0);
    assert.equal(formatted.likesCount, 0);
    assert.deepEqual(formatted.tags, []);
  });

  it('correctly parses tags array and comma strings in formatPinRow', () => {
    const pin1 = PinsAPI.formatPinRow({
      id: 'p1',
      title: 'Tag Test 1',
      creator_id: 'rose',
      image_url: 'https://example.com/p1.jpg',
      tags: ['one', 'two']
    });
    assert.deepEqual(pin1.tags, ['one', 'two']);

    const pin2 = PinsAPI.formatPinRow({
      id: 'p2',
      title: 'Tag Test 2',
      creator_id: 'rose',
      image_url: 'https://example.com/p2.jpg',
      tags: null
    });
    assert.deepEqual(pin2.tags, []);
  });

  it('returns clean zero reaction counts when uninitialized', async () => {
    const counts = await PinsAPI.fetchReactionCounts(null);
    assert.deepEqual(counts, { love: 0, sparkle: 0, fire: 0 });
  });
});
