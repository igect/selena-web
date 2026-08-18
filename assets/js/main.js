/**
 * Selena Media Archive — Application Main Coordinator
 * Coordinates Store, Router, Infinite Scrolling, Authentication, Lightbox, and Admin CMS.
 */

import { CONFIG } from './config.js';
import { createAppStore } from './store.js';
import { createRouter } from './router.js';
import { createAdminPanel } from './admin-panel.js';
import { PinsAPI } from './api/pins-api.js';
import { AuthAPI } from './api/auth-api.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Store, Router & Admin Panel
  const store = createAppStore();
  const router = createRouter(store);
  const adminPanel = createAdminPanel(store, router);

  // 2. DOM Elements Cache
  const els = {
    // Header Navigation
    navHome: document.getElementById('pNavHome'),
    navExplore: document.getElementById('pNavExplore'),
    navCreateBtn: document.getElementById('pNavCreateBtn'),
    logoHome: document.getElementById('pLogoHome'),
    searchInput: document.getElementById('pSearchInput'),
    searchClear: document.getElementById('pSearchClear'),
    savedBtn: document.getElementById('pSavedBtn'),
    savedBadge: document.getElementById('pSavedBadge'),
    themeBtn: document.getElementById('pThemeBtn'),
    profileBtn: document.getElementById('pProfileBtn'),
    profileAvatarImg: document.querySelector('.p-avatar-img'),

    // Views
    feedSection: document.getElementById('pFeedSection'),
    exploreSection: document.getElementById('pExploreSection'),
    profileSection: document.getElementById('pProfileSection'),
    adminSection: document.getElementById('pAdminSection'),

    // Chips & Sort
    chipsBar: document.getElementById('pChipsBar'),
    creatorChips: document.querySelectorAll('.p-chip'),
    sortBtn: document.getElementById('pSortBtn'),
    sortLabel: document.getElementById('pSortLabel'),
    sortMenu: document.getElementById('pSortMenu'),
    sortItems: document.querySelectorAll('.p-sort-item'),

    // Grids & Empty State
    pinGrid: document.getElementById('pPinGrid'),
    emptyState: document.getElementById('pEmptyState'),
    resetBtn: document.getElementById('pResetBtn'),

    // Profile Elements
    profileBoardsGrid: document.getElementById('pProfileBoardsGrid'),
    profilePinsGrid: document.getElementById('pProfileGrid'),
    tabBoards: document.getElementById('pTabBoards'),
    tabSaved: document.getElementById('pTabSaved'),
    tabCreated: document.getElementById('pTabCreated'),
    profileName: document.querySelector('.p-profile-name'),
    profileHandle: document.querySelector('.p-profile-handle'),

    // Pin Detail Modal
    pinModal: document.getElementById('pPinModal'),
    pinModalScrim: document.getElementById('pModalScrim'),
    closeModalBtn: document.getElementById('pCloseModalBtn'),
    detailImg: document.getElementById('pDetailImg'),
    detailTitle: document.getElementById('pDetailTitle'),
    detailDesc: document.getElementById('pDetailDesc'),
    detailDate: document.getElementById('pDetailDate'),
    detailCreatorAvatar: document.getElementById('pDetailCreatorAvatar'),
    detailCreatorName: document.getElementById('pDetailCreatorName'),
    detailFollowBtn: document.getElementById('pFollowBtn'),
    detailSaveBtn: document.getElementById('pDetailSaveBtn'),
    detailDownloadBtn: document.getElementById('pDetailDownloadBtn'),
    detailShareBtn: document.getElementById('pDetailShareBtn'),
    reactionBtns: document.querySelectorAll('.p-reaction-btn'),
    commentsContainer: document.querySelector('.p-comments-section'),
    commentInput: document.querySelector('.p-comment-input'),
    commentSendBtn: document.querySelector('.p-comment-send-btn'),
    relatedPinsGrid: document.querySelector('.p-related-pins-grid'),

    // Create Modal (Public Quick Create)
    createModal: document.getElementById('pCreateModal'),
    createScrim: document.getElementById('pCreateScrim'),
    closeCreateBtn: document.getElementById('pCloseCreateBtn'),

    // Auth Modal
    authModal: document.getElementById('pAuthModal'),
    authScrim: document.getElementById('pAuthScrim'),
    authCloseBtn: document.getElementById('pAuthCloseBtn'),
    authError: document.getElementById('pAuthError'),
    authForm: document.getElementById('pAuthForm'),
    authEmailInput: document.getElementById('pAuthEmail'),
    authPasswordInput: document.getElementById('pAuthPassword'),
    authSubmitBtn: document.getElementById('pAuthSubmitBtn'),
    authToggleModeBtn: document.getElementById('pAuthToggleMode'),
    authTitle: document.getElementById('pAuthTitle'),
    authOAuthGoogleBtn: document.getElementById('pAuthGoogleBtn'),

    // Popovers & Panels
    notifBtn: document.getElementById('pNotifBtn'),
    notifPanel: document.getElementById('pNotifPanel'),
    inboxBtn: document.getElementById('pInboxBtn'),
    inboxPanel: document.getElementById('pInboxPanel'),
    userDropdown: document.getElementById('pUserDropdown'),

    // Toast
    toast: document.getElementById('pToast'),
    toastMsg: document.getElementById('pToastMsg')
  };

  // 3. Toast Helper
  function showToast(msg) {
    if (!els.toast || !els.toastMsg) return;
    els.toastMsg.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(els.toast._timer);
    els.toast._timer = setTimeout(() => {
      els.toast.hidden = true;
    }, 2500);
  }

  // 4. Theme Manager
  const savedTheme = localStorage.getItem('selena_theme') || 'dark';
  applyTheme(savedTheme);

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    localStorage.setItem('selena_theme', theme);
  }

  if (els.themeBtn) {
    els.themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // 5. Infinite Scroll Observer
  let sentinel = document.createElement('div');
  sentinel.className = 'p-infinite-sentinel';
  if (els.feedSection) els.feedSection.appendChild(sentinel);

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      const st = store.getState();
      if (st.hasMore && !st.isLoading && st.view === 'home') {
        loadMorePins();
      }
    }
  }, { rootMargin: '400px' });

  observer.observe(sentinel);

  // 6. Data Loading Pipeline
  async function loadMorePins(reset = false) {
    const st = store.getState();
    if (st.isLoading) return;
    store.setLoading(true);

    if (reset) {
      store.resetPage();
      if (els.pinGrid) els.pinGrid.innerHTML = '';
    }

    try {
      const res = await PinsAPI.fetchPins({
        page: st.page,
        pageSize: CONFIG.PAGE_SIZE,
        creator: st.creator,
        query: st.query,
        filter: st.filter,
        sort: st.sort,
        onlySaved: st.onlySaved,
        savedPinIds: st.savedPinIds,
        userId: st.user?.id
      });

      store.setPinsData(res.pins, res.totalCount, res.hasMore, !reset);
      renderPins(res.pins, !reset);

      if (res.hasMore) {
        store.nextPage();
      }
    } catch (err) {
      console.error('[Main] Error loading pins:', err);
    } finally {
      store.setLoading(false);
    }
  }

  // 7. Render Pins in Masonry Grid
  function renderPins(pins, append = false) {
    if (!els.pinGrid) return;
    if (!append) els.pinGrid.innerHTML = '';

    const st = store.getState();

    if (pins.length === 0 && !append) {
      if (els.emptyState) els.emptyState.hidden = false;
      return;
    }
    if (els.emptyState) els.emptyState.hidden = true;

    const frag = document.createDocumentFragment();

    pins.forEach(pin => {
      const isSaved = st.savedPinIds.includes(pin.id);
      const card = document.createElement('article');
      card.className = 'p-pin-card';
      card.setAttribute('data-id', pin.id);
      card.setAttribute('data-creator', pin.creator);

      card.innerHTML = `
        <div class="p-pin-media">
          <img src="${pin.img}" alt="${escapeHtml(pin.title)}" class="p-pin-img" loading="lazy" decoding="async">
          <div class="p-pin-overlay">
            <div class="p-pin-top-row">
              <span class="p-pin-board-badge">${escapeHtml(pin.board || 'Collection')}</span>
              <button class="p-save-btn ${isSaved ? 'saved' : ''}" data-pin-id="${pin.id}" aria-label="Save Pin">
                ${isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
            <div class="p-pin-bottom-row">
              ${pin.destinationLink ? `
                <a href="${escapeHtml(pin.destinationLink)}" target="_blank" rel="noopener noreferrer" class="p-pin-link-btn" title="Visit destination">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>
                  <span>${extractDomain(pin.destinationLink)}</span>
                </a>
              ` : '<div></div>'}
              <div class="p-pin-actions">
                <button class="p-pin-icon-circle p-btn-share" data-pin-id="${pin.id}" title="Share">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="p-pin-info">
          <h3 class="p-pin-title">${escapeHtml(pin.title)}</h3>
          <div class="p-pin-creator">
            <span class="p-creator-avatar-sm">
              <img src="${pin.creatorAvatar || 'assets/images/logo.png'}" alt="" loading="lazy">
            </span>
            <span class="p-creator-name-sm">${escapeHtml(pin.creatorName || pin.creator)}</span>
          </div>
        </div>
      `;

      // Click card to open lightbox/detail modal
      card.addEventListener('click', (e) => {
        if (e.target.closest('.p-save-btn') || e.target.closest('.p-pin-link-btn') || e.target.closest('.p-btn-share')) {
          return;
        }
        router.navigate(`pin/${pin.id}`);
      });

      // Save button inside card
      const saveBtn = card.querySelector('.p-save-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          store.toggleSave(pin.id);
          const nowSaved = store.getState().savedPinIds.includes(pin.id);
          saveBtn.textContent = nowSaved ? 'Saved' : 'Save';
          saveBtn.classList.toggle('saved', nowSaved);
          showToast(nowSaved ? 'Saved to board!' : 'Removed from saved');
        });
      }

      frag.appendChild(card);
    });

    els.pinGrid.appendChild(frag);
  }

  // 8. Open Pin Detail Modal
  async function openPinDetail(pinId) {
    if (!els.pinModal) return;

    try {
      const pin = await PinsAPI.fetchPinById(pinId);
      if (!pin) {
        router.navigate('');
        return;
      }

      const st = store.getState();
      const isSaved = st.savedPinIds.includes(pin.id);
      const isFollowing = st.followedCreators.includes(pin.creator);
      const pinRx = st.reactions[pin.id] || {};

      els.detailImg.src = pin.img;
      els.detailTitle.textContent = pin.title;
      els.detailDesc.textContent = pin.description || 'Curated visual from the Selena media archive.';
      els.detailDate.textContent = `Published on ${pin.date} · Saved to ${pin.board || 'Collection'}`;
      els.detailCreatorName.textContent = pin.creatorName;
      els.detailCreatorAvatar.src = pin.creatorAvatar || 'assets/images/logo.png';

      els.detailSaveBtn.textContent = isSaved ? 'Saved' : 'Save';
      els.detailSaveBtn.classList.toggle('saved', isSaved);

      if (els.detailFollowBtn) {
        els.detailFollowBtn.textContent = isFollowing ? 'Following' : 'Follow';
        els.detailFollowBtn.classList.toggle('following', isFollowing);
      }

      // Update reactions UI
      els.reactionBtns.forEach(btn => {
        const type = btn.getAttribute('data-reaction');
        const active = Boolean(pinRx[type]);
        btn.classList.toggle('active', active);
      });

      // Load comments
      loadPinComments(pin.id);

      els.pinModal.hidden = false;
      document.body.classList.add('modal-open');
    } catch (err) {
      console.error('[Main] Error opening pin detail:', err);
    }
  }

  function closePinDetail() {
    if (els.pinModal) els.pinModal.hidden = true;
    document.body.classList.remove('modal-open');
    if (store.getState().view === 'pin') {
      router.navigate('');
    }
  }

  async function loadPinComments(pinId) {
    if (!els.commentsContainer) return;
    try {
      const comments = await PinsAPI.fetchComments(pinId);
      const listEl = els.commentsContainer.querySelector('.p-comment-item') || els.commentsContainer;
      
      let html = `<span class="p-comments-title">Comments (${comments.length})</span>`;
      if (comments.length === 0) {
        html += `<p class="p-no-comments">No comments yet. Be the first to share feedback!</p>`;
      } else {
        html += comments.map(c => `
          <div class="p-comment-item">
            <div class="p-comment-avatar">
              <img src="${c.user_avatar || 'assets/images/logo.png'}" alt="">
            </div>
            <div class="p-comment-body">
              <span class="p-comment-user">${escapeHtml(c.user_name || 'Guest')}</span>
              <p class="p-comment-text">${escapeHtml(c.content)}</p>
            </div>
          </div>
        `).join('');
      }
      els.commentsContainer.innerHTML = html;
    } catch (err) {
      console.warn('[Main] Comments error:', err);
    }
  }

  // 9. Auth Modal & Flow
  let isAuthSignUpMode = false;

  function showAuthError(msg) {
    if (!els.authError) return;
    els.authError.textContent = msg;
    els.authError.hidden = false;
  }

  function clearAuthError() {
    if (!els.authError) return;
    els.authError.textContent = '';
    els.authError.hidden = true;
  }

  function openAuthModal(signup = false) {
    if (!els.authModal) return;
    clearAuthError();
    isAuthSignUpMode = signup;
    updateAuthModalMode();
    els.authModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeAuthModal() {
    if (els.authModal) els.authModal.hidden = true;
    clearAuthError();
    document.body.classList.remove('modal-open');
  }

  function updateAuthModalMode() {
    clearAuthError();
    if (!els.authTitle || !els.authSubmitBtn || !els.authToggleModeBtn) return;
    if (isAuthSignUpMode) {
      els.authTitle.textContent = 'Create an Account';
      els.authSubmitBtn.textContent = 'Sign Up';
      els.authToggleModeBtn.textContent = 'Already have an account? Log In';
    } else {
      els.authTitle.textContent = 'Log In to Selena Archive';
      els.authSubmitBtn.textContent = 'Log In';
      els.authToggleModeBtn.textContent = "Don't have an account? Sign Up";
    }
  }

  // 10. Store State Change Listener
  store.subscribe((state) => {
    // 1. Update Saved Badge Counter
    if (els.savedBadge) {
      const count = state.savedPinIds.length;
      els.savedBadge.textContent = count;
      els.savedBadge.hidden = count === 0;
    }

    // 2. View Visibility Routing
    if (els.feedSection) els.feedSection.hidden = state.view !== 'home';
    if (els.exploreSection) els.exploreSection.hidden = state.view !== 'explore';
    if (els.profileSection) els.profileSection.hidden = state.view !== 'profile';
    if (els.adminSection) els.adminSection.hidden = state.view !== 'admin';
    if (els.chipsBar) els.chipsBar.hidden = state.view !== 'home';

    // 3. Navigation Active State
    if (els.navHome) els.navHome.classList.toggle('active', state.view === 'home');
    if (els.navExplore) els.navExplore.classList.toggle('active', state.view === 'explore');

    // 4. Pin Detail Modal
    if (state.view === 'pin' && state.activePinId) {
      openPinDetail(state.activePinId);
    } else if (state.view !== 'pin') {
      if (els.pinModal && !els.pinModal.hidden) closePinDetail();
    }

    // 5. Admin Section Trigger
    if (state.view === 'admin') {
      adminPanel.refresh();
    }

    // 6. User Profile Update
    if (state.user && els.profileName) {
      els.profileName.textContent = state.user.user_metadata?.name || state.user.email?.split('@')[0] || 'Member';
      if (els.profileHandle) els.profileHandle.textContent = `@${state.user.email?.split('@')[0] || 'member'}`;
    }
  });

  // 11. Wire Up Event Listeners
  // Nav
  if (els.navHome) els.navHome.addEventListener('click', () => router.navigate(''));
  if (els.logoHome) els.logoHome.addEventListener('click', (e) => { e.preventDefault(); router.navigate(''); });
  if (els.navExplore) els.navExplore.addEventListener('click', () => router.navigate('explore'));
  if (els.profileBtn) {
    els.profileBtn.addEventListener('click', () => {
      const st = store.getState();
      if (!st.user) {
        openAuthModal(false);
      } else if (st.isAdmin) {
        router.navigate('admin');
      } else {
        router.navigate('profile');
      }
    });
  }

  // Create Button (Requires Authentication)
  if (els.navCreateBtn) {
    els.navCreateBtn.addEventListener('click', () => {
      const st = store.getState();
      if (!st.user) {
        showToast('Please log in to upload a pin');
        openAuthModal(false);
        return;
      }
      adminPanel.openCreate();
    });
  }

  // Notifications Popover
  if (els.notifBtn && els.notifPanel) {
    els.notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.notifPanel.hidden = !els.notifPanel.hidden;
      if (els.inboxPanel) els.inboxPanel.hidden = true;
    });
  }

  // Messages / Inbox Popover
  if (els.inboxBtn && els.inboxPanel) {
    els.inboxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.inboxPanel.hidden = !els.inboxPanel.hidden;
      if (els.notifPanel) els.notifPanel.hidden = true;
    });
  }

  // Favorites / Heart Header Button
  if (els.savedBtn) {
    els.savedBtn.addEventListener('click', () => {
      router.navigate('profile');
    });
  }

  // Explore Cards Navigation
  document.querySelectorAll('.p-explore-card').forEach(card => {
    card.addEventListener('click', () => {
      const creator = card.getAttribute('data-explore-creator');
      if (creator) {
        store.setCreator(creator);
        router.navigate(`creator/${creator}`);
      }
    });
  });

  // Profile Board Cards Navigation
  document.querySelectorAll('.p-board-card').forEach(card => {
    card.addEventListener('click', () => {
      const creator = card.getAttribute('data-board-creator');
      if (creator) {
        store.setCreator(creator);
        router.navigate(`creator/${creator}`);
      }
    });
  });

  // Dismiss Popovers on Outside Click
  document.addEventListener('click', (e) => {
    if (els.notifPanel && !els.notifPanel.contains(e.target) && e.target !== els.notifBtn && !els.notifBtn?.contains(e.target)) {
      els.notifPanel.hidden = true;
    }
    if (els.inboxPanel && !els.inboxPanel.contains(e.target) && e.target !== els.inboxBtn && !els.inboxBtn?.contains(e.target)) {
      els.inboxPanel.hidden = true;
    }
  });

  // Search
  if (els.searchInput) {
    let debounce;
    els.searchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      if (els.searchClear) els.searchClear.hidden = !q;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        store.setQuery(q);
        loadMorePins(true);
      }, 300);
    });
  }

  if (els.searchClear) {
    els.searchClear.addEventListener('click', () => {
      els.searchInput.value = '';
      els.searchClear.hidden = true;
      store.setQuery('');
      loadMorePins(true);
    });
  }

  // Creator & Filter Chips
  els.creatorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      els.creatorChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const creator = chip.getAttribute('data-creator');
      const filter = chip.getAttribute('data-filter');

      if (creator) {
        store.setCreator(creator);
        store.setFilter('all');
      } else if (filter) {
        store.setFilter(filter);
      }
      loadMorePins(true);
    });
  });

  // Sort Dropdown
  if (els.sortBtn && els.sortMenu) {
    els.sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.sortMenu.hidden = !els.sortMenu.hidden;
    });

    els.sortItems.forEach(item => {
      item.addEventListener('click', () => {
        const sortVal = item.getAttribute('data-sort');
        els.sortItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        if (els.sortLabel) els.sortLabel.textContent = item.textContent;
        els.sortMenu.hidden = true;
        store.setSort(sortVal);
        loadMorePins(true);
      });
    });

    document.addEventListener('click', () => {
      if (els.sortMenu) els.sortMenu.hidden = true;
    });
  }

  // Reset Filters
  if (els.resetBtn) {
    els.resetBtn.addEventListener('click', () => {
      if (els.searchInput) els.searchInput.value = '';
      store.setQuery('');
      store.setCreator('all');
      store.setFilter('all');
      els.creatorChips.forEach((c, idx) => c.classList.toggle('active', idx === 0));
      loadMorePins(true);
    });
  }

  // Pin Detail Modal Triggers
  if (els.closeModalBtn) els.closeModalBtn.addEventListener('click', closePinDetail);
  if (els.pinModalScrim) els.pinModalScrim.addEventListener('click', closePinDetail);

  if (els.detailSaveBtn) {
    els.detailSaveBtn.addEventListener('click', () => {
      const pinId = store.getState().activePinId;
      if (pinId) {
        store.toggleSave(pinId);
        const isSaved = store.getState().savedPinIds.includes(pinId);
        els.detailSaveBtn.textContent = isSaved ? 'Saved' : 'Save';
        els.detailSaveBtn.classList.toggle('saved', isSaved);
        showToast(isSaved ? 'Saved to board!' : 'Removed from saved');
      }
    });
  }

  if (els.detailFollowBtn) {
    els.detailFollowBtn.addEventListener('click', () => {
      const pinId = store.getState().activePinId;
      const pin = store.getState().pins.find(p => p.id === pinId);
      if (pin) {
        store.toggleFollow(pin.creator);
        const isFollowing = store.getState().followedCreators.includes(pin.creator);
        els.detailFollowBtn.textContent = isFollowing ? 'Following' : 'Follow';
        els.detailFollowBtn.classList.toggle('following', isFollowing);
        showToast(isFollowing ? `Following ${pin.creatorName}` : `Unfollowed ${pin.creatorName}`);
      }
    });
  }

  // Reaction Buttons
  els.reactionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const pinId = store.getState().activePinId;
      const type = btn.getAttribute('data-reaction');
      if (pinId && type) {
        store.toggleReaction(pinId, type);
        const hasReacted = Boolean(store.getState().reactions[pinId]?.[type]);
        btn.classList.toggle('active', hasReacted);
      }
    });
  });

  // Pin Download Handler (Direct High-Resolution Blob Download)
  if (els.detailDownloadBtn) {
    els.detailDownloadBtn.addEventListener('click', async () => {
      const pinId = store.getState().activePinId;
      const pin = store.getState().pins.find(p => p.id === pinId);
      if (!pin || !pin.img) {
        showToast('No image available to download');
        return;
      }

      showToast('Starting download...');
      try {
        const res = await fetch(pin.img, { mode: 'cors' });
        if (!res.ok) throw new Error('Fetch failed');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        const cleanName = (pin.title || 'selena-pin').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        a.download = `${cleanName}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        showToast('Download complete!');
      } catch (err) {
        // Direct link fallback
        const a = document.createElement('a');
        a.href = pin.img;
        a.target = '_blank';
        a.download = `${(pin.title || 'selena-pin').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Image opened for saving');
      }
    });
  }

  // Pin Share Handler (Web Share API & Clipboard Fallback)
  if (els.detailShareBtn) {
    els.detailShareBtn.addEventListener('click', async () => {
      const pinId = store.getState().activePinId;
      if (!pinId) return;
      const shareUrl = `${window.location.origin}${window.location.pathname}#/pin/${pinId}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Selena Media Archive Pin',
            url: shareUrl
          });
        } catch {}
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showToast('Link copied to clipboard!');
        } catch {
          showToast('Could not copy link');
        }
      }
    });
  }

  // Comments Input & Send (Requires Authentication)
  if (els.commentSendBtn && els.commentInput) {
    els.commentSendBtn.addEventListener('click', async () => {
      const st = store.getState();
      if (!st.user) {
        showToast('Please log in to post a comment');
        openAuthModal(false);
        return;
      }

      const content = els.commentInput.value.trim();
      const pinId = st.activePinId;
      if (!content || !pinId) return;

      const userName = st.user?.user_metadata?.name || st.user?.email?.split('@')[0] || 'Member';
      await PinsAPI.addComment(pinId, st.user.id, content, userName);
      els.commentInput.value = '';
      loadPinComments(pinId);
      showToast('Comment posted!');
    });

    els.commentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') els.commentSendBtn.click();
    });
  }

  // Auth Modal Triggers
  if (els.authCloseBtn) els.authCloseBtn.addEventListener('click', closeAuthModal);
  if (els.authScrim) els.authScrim.addEventListener('click', closeAuthModal);
  if (els.authToggleModeBtn) {
    els.authToggleModeBtn.addEventListener('click', () => {
      isAuthSignUpMode = !isAuthSignUpMode;
      updateAuthModalMode();
    });
  }

  if (els.authForm) {
    els.authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = els.authEmailInput.value.trim();
      const password = els.authPasswordInput.value;
      if (!email || !password) return;

      clearAuthError();
      els.authSubmitBtn.disabled = true;
      els.authSubmitBtn.textContent = 'Processing...';

      try {
        if (isAuthSignUpMode) {
          const { user, error } = await AuthAPI.signUp(email, password);
          if (error) throw error;
          showToast('Account created successfully!');
          store.setUser(user, false);
          closeAuthModal();
        } else {
          const { user, error } = await AuthAPI.signInWithPassword(email, password);
          if (error) throw error;
          const isAdmin = await AuthAPI.isCurrentUserAdmin();
          store.setUser(user, isAdmin);
          showToast(`Welcome back, ${user.user_metadata?.name || email.split('@')[0]}!`);
          closeAuthModal();
        }
      } catch (err) {
        showAuthError(err.message || 'Authentication failed. Please check your credentials.');
      } finally {
        els.authSubmitBtn.disabled = false;
        updateAuthModalMode();
      }
    });
  }

  if (els.authOAuthGoogleBtn) {
    els.authOAuthGoogleBtn.addEventListener('click', async () => {
      clearAuthError();
      try {
        const { error } = await AuthAPI.signInWithOAuth('google');
        if (error) {
          const msg = error.message || '';
          if (msg.includes('provider is not enabled') || msg.includes('validation_failed')) {
            showAuthError('Google Sign-In is not enabled on this Supabase project yet. Please log in with Email & Password above.');
          } else {
            showAuthError('Google login failed: ' + msg);
          }
        }
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('provider is not enabled') || msg.includes('validation_failed')) {
          showAuthError('Google Sign-In is not enabled on this Supabase project yet. Please log in with Email & Password above.');
        } else {
          showAuthError('Google login failed: ' + msg);
        }
      }
    });
  }

  // Listen to Auth State
  AuthAPI.onAuthStateChange(async (event, user) => {
    if (user) {
      const isAdmin = await AuthAPI.isCurrentUserAdmin();
      store.setUser(user, isAdmin);
    } else {
      store.setUser(null, false);
    }
  });

  // 12. Helper Functions
  function extractDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'Link';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 13. Initialize App
  await store.init();
  adminPanel.init();
  router.init();
  loadMorePins(true);
});
