import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuthAPI } from '../assets/js/api/auth.js';

describe('AuthAPI Deep Module Suite', () => {
  it('exports core authentication methods', () => {
    assert.equal(typeof AuthAPI.getSession, 'function');
    assert.equal(typeof AuthAPI.getCurrentUser, 'function');
    assert.equal(typeof AuthAPI.isCurrentUserAdmin, 'function');
    assert.equal(typeof AuthAPI.updateProfile, 'function');
    assert.equal(typeof AuthAPI.updateEmail, 'function');
    assert.equal(typeof AuthAPI.updatePassword, 'function');
    assert.equal(typeof AuthAPI.enrollTOTP, 'function');
    assert.equal(typeof AuthAPI.verifyTOTP, 'function');
    assert.equal(typeof AuthAPI.unenrollTOTP, 'function');
    assert.equal(typeof AuthAPI.listMFAFactors, 'function');
  });

  it('safely handles missing session and mfa factors when unauthenticated', async () => {
    const session = await AuthAPI.getSession();
    assert.equal(session, null);

    const user = await AuthAPI.getCurrentUser();
    assert.equal(user, null);

    const isAdmin = await AuthAPI.isCurrentUserAdmin();
    assert.equal(isAdmin, false);

    const factors = await AuthAPI.listMFAFactors();
    assert.deepEqual(factors, { all: [], totp: [] });
  });
});
