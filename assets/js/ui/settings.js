/**
 * Selena Media Archive — UI Account Settings & 2FA Modal
 * Deep module managing profile metadata, credentials, and Supabase TOTP MFA.
 */

import { AuthAPI } from '../api/auth.js';

export function createSettingsModalUI({
  modalEl,
  getUser,
  onProfileUpdated,
  onToast
}) {
  const scrim = modalEl.querySelector('#pSettingsScrim');
  const closeBtn = modalEl.querySelector('#pCloseSettingsBtn');

  // Tabs
  const tabProfileBtn = modalEl.querySelector('#pTabSettingsProfile');
  const tabSecurityBtn = modalEl.querySelector('#pTabSettingsSecurity');
  const panelProfile = modalEl.querySelector('#pPanelSettingsProfile');
  const panelSecurity = modalEl.querySelector('#pPanelSettingsSecurity');

  // Profile Form Elements
  const nameInput = modalEl.querySelector('#pSettingsNameInput');
  const handleInput = modalEl.querySelector('#pSettingsHandleInput');
  const avatarInput = modalEl.querySelector('#pSettingsAvatarInput');
  const avatarPreview = modalEl.querySelector('#pSettingsAvatarPreview');
  const saveProfileBtn = modalEl.querySelector('#pSaveProfileBtn');

  // Security Form Elements
  const currentEmailEl = modalEl.querySelector('#pSettingsCurrentEmail');
  const newEmailInput = modalEl.querySelector('#pSettingsNewEmailInput');
  const updateEmailBtn = modalEl.querySelector('#pUpdateEmailBtn');

  const newPasswordInput = modalEl.querySelector('#pSettingsNewPasswordInput');
  const confirmPasswordInput = modalEl.querySelector('#pSettingsConfirmPasswordInput');
  const updatePasswordBtn = modalEl.querySelector('#pUpdatePasswordBtn');

  // 2FA MFA Elements
  const mfaStatusEl = modalEl.querySelector('#pMFAStatusText');
  const mfaBadgeEl = modalEl.querySelector('#pMFABadge');
  const start2FABtn = modalEl.querySelector('#pStart2FABtn');
  const disable2FABtn = modalEl.querySelector('#pDisable2FABtn');
  const mfaSetupBox = modalEl.querySelector('#pMFASetupBox');
  const mfaQrImg = modalEl.querySelector('#pMFAQrCode');
  const mfaSecretCode = modalEl.querySelector('#pMFASecretCode');
  const mfaCodeInput = modalEl.querySelector('#pMFACodeInput');
  const verify2FABtn = modalEl.querySelector('#pVerify2FABtn');
  const cancel2FABtn = modalEl.querySelector('#pCancel2FABtn');

  let activeFactorId = null;
  let pendingFactorId = null;

  function init() {
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (scrim) scrim.addEventListener('click', close);

    if (tabProfileBtn && tabSecurityBtn) {
      tabProfileBtn.addEventListener('click', () => switchTab('profile'));
      tabSecurityBtn.addEventListener('click', () => switchTab('security'));
    }

    if (avatarInput) {
      avatarInput.addEventListener('input', () => {
        if (avatarPreview) {
          avatarPreview.src = avatarInput.value.trim() || 'assets/images/logo.png';
        }
      });
    }

    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', handleSaveProfile);
    }

    if (updateEmailBtn) {
      updateEmailBtn.addEventListener('click', handleUpdateEmail);
    }

    if (updatePasswordBtn) {
      updatePasswordBtn.addEventListener('click', handleUpdatePassword);
    }

    if (start2FABtn) {
      start2FABtn.addEventListener('click', handleStart2FA);
    }

    if (verify2FABtn) {
      verify2FABtn.addEventListener('click', handleVerify2FA);
    }

    if (cancel2FABtn) {
      cancel2FABtn.addEventListener('click', () => {
        if (mfaSetupBox) mfaSetupBox.hidden = true;
        if (start2FABtn) start2FABtn.hidden = false;
        pendingFactorId = null;
      });
    }

    if (disable2FABtn) {
      disable2FABtn.addEventListener('click', handleDisable2FA);
    }
  }

  function switchTab(tab) {
    if (tab === 'profile') {
      tabProfileBtn?.classList.add('active');
      tabSecurityBtn?.classList.remove('active');
      if (panelProfile) panelProfile.hidden = false;
      if (panelSecurity) panelSecurity.hidden = true;
    } else {
      tabSecurityBtn?.classList.add('active');
      tabProfileBtn?.classList.remove('active');
      if (panelProfile) panelProfile.hidden = true;
      if (panelSecurity) panelSecurity.hidden = false;
      refreshMFAState();
    }
  }

  function open(initialTab = 'profile') {
    const user = getUser ? getUser() : null;
    if (!user) {
      if (onToast) onToast('Please log in to access settings');
      return;
    }

    populateUserData(user);
    switchTab(initialTab);
    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modalEl.hidden = true;
    document.body.style.overflow = '';
    if (mfaSetupBox) mfaSetupBox.hidden = true;
    pendingFactorId = null;
  }

  function populateUserData(user) {
    const name = user.user_metadata?.name || '';
    const handle = user.user_metadata?.handle || user.email?.split('@')[0] || '';
    const avatar = user.user_metadata?.avatar_url || 'assets/images/logo.png';
    const email = user.email || '';

    if (nameInput) nameInput.value = name;
    if (handleInput) handleInput.value = handle;
    if (avatarInput) avatarInput.value = avatar;
    if (avatarPreview) avatarPreview.src = avatar;
    if (currentEmailEl) currentEmailEl.textContent = email;
    if (newEmailInput) newEmailInput.value = '';
    if (newPasswordInput) newPasswordInput.value = '';
    if (confirmPasswordInput) confirmPasswordInput.value = '';
  }

  async function handleSaveProfile() {
    const user = getUser ? getUser() : null;
    if (!user) return;

    const name = nameInput?.value.trim() || '';
    const handle = handleInput?.value.trim().replace(/^@+/, '') || '';
    const avatarUrl = avatarInput?.value.trim() || '';

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = 'Saving...';

    try {
      const updatedUser = await AuthAPI.updateProfile({ name, handle, avatarUrl });
      if (onProfileUpdated) onProfileUpdated(updatedUser);
      if (onToast) onToast('Profile settings saved!');
      close();
    } catch (err) {
      alert('Error updating profile: ' + (err.message || err));
    } finally {
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = 'Save Changes';
    }
  }

  async function handleUpdateEmail() {
    const newEmail = newEmailInput?.value.trim();
    if (!newEmail || !newEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    updateEmailBtn.disabled = true;
    updateEmailBtn.textContent = 'Updating...';

    try {
      await AuthAPI.updateEmail(newEmail);
      if (onToast) onToast('Confirmation email sent to new address!');
      if (newEmailInput) newEmailInput.value = '';
    } catch (err) {
      alert('Error updating email: ' + (err.message || err));
    } finally {
      updateEmailBtn.disabled = false;
      updateEmailBtn.textContent = 'Update Email';
    }
  }

  async function handleUpdatePassword() {
    const newPass = newPasswordInput?.value;
    const confirmPass = confirmPasswordInput?.value;

    if (!newPass || newPass.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    if (newPass !== confirmPass) {
      alert('Passwords do not match.');
      return;
    }

    updatePasswordBtn.disabled = true;
    updatePasswordBtn.textContent = 'Changing...';

    try {
      await AuthAPI.updatePassword(newPass);
      if (onToast) onToast('Password changed successfully!');
      if (newPasswordInput) newPasswordInput.value = '';
      if (confirmPasswordInput) confirmPasswordInput.value = '';
    } catch (err) {
      alert('Error updating password: ' + (err.message || err));
    } finally {
      updatePasswordBtn.disabled = false;
      updatePasswordBtn.textContent = 'Change Password';
    }
  }

  async function refreshMFAState() {
    try {
      const factors = await AuthAPI.listMFAFactors();
      const verifiedTotp = factors?.totp?.find(f => f.status === 'verified');

      if (verifiedTotp) {
        activeFactorId = verifiedTotp.id;
        if (mfaStatusEl) mfaStatusEl.textContent = 'Two-Factor Authentication is currently active on your account.';
        if (mfaBadgeEl) {
          mfaBadgeEl.textContent = 'Enabled';
          mfaBadgeEl.className = 'p-badge-status p-status-active';
        }
        if (start2FABtn) start2FABtn.hidden = true;
        if (disable2FABtn) disable2FABtn.hidden = false;
      } else {
        activeFactorId = null;
        if (mfaStatusEl) mfaStatusEl.textContent = 'Protect your account with standard TOTP authenticator app verification.';
        if (mfaBadgeEl) {
          mfaBadgeEl.textContent = 'Disabled';
          mfaBadgeEl.className = 'p-badge-status p-status-inactive';
        }
        if (start2FABtn) start2FABtn.hidden = false;
        if (disable2FABtn) disable2FABtn.hidden = true;
      }
    } catch (err) {
      console.warn('[SettingsUI] refreshMFAState failed:', err);
    }
  }

  async function handleStart2FA() {
    start2FABtn.disabled = true;
    start2FABtn.textContent = 'Generating QR...';

    try {
      const enrollment = await AuthAPI.enrollTOTP('Selena Archive');
      pendingFactorId = enrollment.id;

      if (mfaQrImg && enrollment.totp?.qr_code) {
        mfaQrImg.src = enrollment.totp.qr_code;
      }
      if (mfaSecretCode && enrollment.totp?.secret) {
        mfaSecretCode.textContent = enrollment.totp.secret;
      }

      if (mfaSetupBox) mfaSetupBox.hidden = false;
      if (start2FABtn) start2FABtn.hidden = true;
      if (mfaCodeInput) {
        mfaCodeInput.value = '';
        mfaCodeInput.focus();
      }
    } catch (err) {
      alert('Could not initialize 2FA: ' + (err.message || err));
      if (start2FABtn) start2FABtn.hidden = false;
    } finally {
      start2FABtn.disabled = false;
      start2FABtn.textContent = 'Set up 2FA';
    }
  }

  async function handleVerify2FA() {
    const code = mfaCodeInput?.value.trim();
    if (!code || code.length < 6 || !pendingFactorId) {
      alert('Please enter a valid 6-digit verification code.');
      return;
    }

    verify2FABtn.disabled = true;
    verify2FABtn.textContent = 'Verifying...';

    try {
      await AuthAPI.verifyTOTP(pendingFactorId, code);
      if (onToast) onToast('Two-Factor Authentication successfully enabled!');
      if (mfaSetupBox) mfaSetupBox.hidden = true;
      pendingFactorId = null;
      await refreshMFAState();
    } catch (err) {
      alert('Invalid verification code: ' + (err.message || err));
    } finally {
      verify2FABtn.disabled = false;
      verify2FABtn.textContent = 'Verify & Activate';
    }
  }

  async function handleDisable2FA() {
    if (!activeFactorId) return;
    if (!confirm('Are you sure you want to disable Two-Factor Authentication?')) return;

    disable2FABtn.disabled = true;
    disable2FABtn.textContent = 'Disabling...';

    try {
      await AuthAPI.unenrollTOTP(activeFactorId);
      if (onToast) onToast('2FA has been disabled.');
      activeFactorId = null;
      await refreshMFAState();
    } catch (err) {
      alert('Could not disable 2FA: ' + (err.message || err));
    } finally {
      disable2FABtn.disabled = false;
      disable2FABtn.textContent = 'Disable 2FA';
    }
  }

  init();

  return {
    open,
    close,
    populateUserData
  };
}
