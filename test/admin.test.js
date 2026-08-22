import test from 'node:test';
import assert from 'node:assert/strict';
import { AdminAPI } from '../assets/js/api/admin.js';

test('AdminAPI Module Suite', async (t) => {
  await t.test('exports core admin management methods', () => {
    assert.equal(typeof AdminAPI.fetchDashboardMetrics, 'function');
    assert.equal(typeof AdminAPI.fetchAdminPins, 'function');
    assert.equal(typeof AdminAPI.uploadMedia, 'function');
    assert.equal(typeof AdminAPI.createAdminPin, 'function');
    assert.equal(typeof AdminAPI.updateAdminPin, 'function');
    assert.equal(typeof AdminAPI.deleteAdminPin, 'function');
    assert.equal(typeof AdminAPI.batchPublish, 'function');
    assert.equal(typeof AdminAPI.batchDelete, 'function');
  });

  await t.test('safely handles dashboard metrics fallback when unauthenticated or offline', async () => {
    const metrics = await AdminAPI.fetchDashboardMetrics();
    assert.deepEqual(metrics, {
      totalPins: 0,
      publishedPins: 0,
      draftPins: 0,
      totalCreators: 0,
      totalBoards: 0,
      totalSaves: 0
    });
  });

  await t.test('safely handles admin pins catalog fallback when unauthenticated or offline', async () => {
    const res = await AdminAPI.fetchAdminPins({ page: 1, pageSize: 20 });
    assert.deepEqual(res, {
      pins: [],
      totalCount: 0,
      hasMore: false
    });
  });
});
