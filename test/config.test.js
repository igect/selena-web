import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../assets/js/config.js';

describe('Config Module Suite', () => {
  it('resolves absolute https and http URLs as-is', () => {
    const url = 'https://mdsoymxqbbgzdwtsuyll.supabase.co/storage/v1/object/public/archive-pins/sample.jpg';
    assert.equal(CONFIG.resolveImageUrl(url), url);

    const httpUrl = 'http://example.com/image.png';
    assert.equal(CONFIG.resolveImageUrl(httpUrl), httpUrl);
  });

  it('resolves data: URLs as-is', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    assert.equal(CONFIG.resolveImageUrl(dataUrl), dataUrl);
  });

  it('falls back to default logo if path is empty', () => {
    assert.equal(CONFIG.resolveImageUrl(''), 'assets/images/logo.png');
    assert.equal(CONFIG.resolveImageUrl(null), 'assets/images/logo.png');
    assert.equal(CONFIG.resolveImageUrl(undefined), 'assets/images/logo.png');
  });
});
