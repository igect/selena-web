import { CONFIG } from './config.js';
import { AuthAPI } from './api/auth.js';
import { BoardsAPI } from './api/boards.js';
import { PinsAPI } from './api/pins.js';
import { subscribeTable } from './api/supabase.js';
import { AppRouter } from './core/router.js';
import { createAppStore } from './core/store.js';
import { createAdminUI } from './ui/admin.js';
import { createPinModalUI } from './ui/create-pin.js';
import { createFeedUI } from './ui/feed.js';
import { createPinModal } from './ui/modal.js';
import { createProfileUI } from './ui/profile.js';
import { createSettingsModalUI } from './ui/settings.js';
import { createShareModalUI } from './ui/share.js';

async function initApp() {
  // 1. Core State Store
  const store = createAppStore();

  // 2. DOM Elements
  const els = {
    // Navigation
    logoHome: document.getElementById('pLogoHome'),
    navHome: document.getElementById('pNavHome'),
    navExplore: document.getElementById('pNavExplore'),
    navCreateBtn: document.getElementById('pNavCreateBtn'),
    searchInput: document.getElementById('pSearchInput'),
    searchClear: document.getElementById('pSearchClear'),
    notifBtn: document.getElementById('pNotifBtn'),
    notifPanel: document.getElementById('pNotifPanel'),
    inboxBtn: document.getElementById('pInboxBtn'),
    inboxPanel: document.getElementById('pInboxPanel'),
    savedBtn: document.getElementById('pSavedBtn'),
    savedBadge: document.getElementById('pSavedBadge'),
    themeBtn: document.getElementById('pThemeBtn'),
    guestActions: document.getElementById('pGuestAuthActions'),
    navLoginBtn: document.getElementById('pNavLoginBtn'),
    navSignUpBtn: document.getElementById('pNavSignUpBtn'),
    profileAnchor: document.getElementById('pProfileAnchor'),
    profileBtn: document.getElementById('pProfileBtn'),
    profileAvatar: document.getElementById('pHeaderAvatarImg') || document.querySelector('.p-avatar-img'),
    userDropdown: document.getElementById('pUserDropdown'),
    menuProfileBtn: document.getElementById('pMenuProfileBtn'),
    menuSettingsBtn: document.getElementById('pMenuSettingsBtn'),
    menuAdminBtn: document.getElementById('pMenuAdminBtn'),
    menuSignOutBtn: document.getElementById('pMenuSignOutBtn'),
    dropdownUserName: document.getElementById('pDropdownUserName'),
    dropdownUserEmail: document.getElementById('pDropdownUserEmail'),

    // Chips
    chipsBar: document.getElementById('pChipsBar'),
    chipsScroll: document.getElementById('pChipsScroll'),

    // Sections
    feedSection: document.getElementById('pFeedSection'),
    exploreSection: document.getElementById('pExploreSection'),
    profileSection: document.getElementById('pProfileSection'),
    adminSection: document.getElementById('pAdminSection'),
    pinsGrid: document.getElementById('pPinGrid'),
    emptyState: document.getElementById('pEmptyState'),
    resetBtn: document.getElementById('pResetBtn'),
    feedSentinel: document.getElementById('pFeedSentinel'),

    // Modals
    pinModal: document.getElementById('pPinModal'),
    createModal: document.getElementById('pCreateModal'),
    authModal: document.getElementById('pAuthModal'),
    settingsModal: document.getElementById('pSettingsModal'),
    shareModal: document.getElementById('pShareModal'),
    toast: document.getElementById('pToast'),
    toastMsg: document.getElementById('pToastMsg'),

    // Sort Dropdown
    sortBtn: document.getElementById('pSortBtn'),
    sortLabel: document.getElementById('pSortLabel'),
    sortMenu: document.getElementById('pSortMenu')
  };

  // 3. Theme Initializer
  const currentTheme = localStorage.getItem('selena_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (els.themeBtn) {
    els.themeBtn.addEventListener('click', () => {
      const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('selena_theme', nextTheme);
    });
  }

  // 4. UI Modals Initialization
  const shareUI = createShareModalUI({
    modalEl: els.shareModal,
    onToast: showToast
  });

  const settingsUI = createSettingsModalUI({
    modalEl: els.settingsModal,
    getUser: () => store.getState().user,
    onProfileUpdated: (updatedUser) => {
      store.setUser(updatedUser, store.getState().isAdmin);
      updateUserDisplay(updatedUser, store.getState().isAdmin);
    },
    onToast: showToast
  });

  const feedUI = createFeedUI({
    container: els.pinsGrid,
    onPinClick: (pinId) => router.navigate(`pin/${pinId}`),
    onSaveClick: async (pinId) => {
      const isSaved = await store.toggleSave(pinId);
      feedUI.updateSaveButtonState(pinId, isSaved);
      if (pinModalUI.getCurrentPinId() === pinId) {
        pinModalUI.updateSaveState(isSaved);
      }
    },
    onRetry: () => loadFeedPins(),
    onReset: () => router.navigate('')
  });

  const pinModalUI = createPinModal({
    modalEl: els.pinModal,
    getUser: () => store.getState().user,
    onAuthRequired: () => {
      showToast('Please log in to participate');
      openAuth('login');
    },
    onClose: () => {
      router.closePin();
    },
    onSaveClick: async (pinId) => {
      const isSaved = await store.toggleSave(pinId);
      pinModalUI.updateSaveState(isSaved);
      feedUI.updateSaveButtonState(pinId, isSaved);
    },
    onReactionClick: (pinId, type) => store.toggleReaction(pinId, type),
    onCreatorClick: (creatorId) => store.toggleFollow(creatorId),
    onRelatedPinClick: (pinId) => router.navigate(`pin/${pinId}`),
    onShareClick: (shareData) => shareUI.open(shareData),
    onCommentSubmit: async (pinId, text) => {
      const user = store.getState().user;
      if (!user) {
        showToast('Please log in to comment');
        openAuth('login');
        return false;
      }
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Member';
      const userAvatar = user.user_metadata?.avatar_url || CONFIG.DEFAULT_IMAGE_URL;
      await PinsAPI.addComment(pinId, user.id, text, userName, userAvatar);
      return true;
    }
  });

  const createPinUI = createPinModalUI({
    modalEl: els.createModal,
    getUser: () => store.getState().user,
    onPinCreated: (pin) => {
      showToast('Pin published successfully!');
      router.navigate(`pin/${pin.id}`);
    },
    onBoardCreated: () => store.refreshBoards()
  });

  const profileUI = createProfileUI({
    container: els.profileSection,
    getUser: () => store.getState().user,
    onAuthRequired: () => {
      showToast('Please log in to participate');
      openAuth('login');
    },
    onUserUpdated: (updatedUser) => {
      store.setUser(updatedUser, store.getState().isAdmin);
      updateUserDisplay(updatedUser, store.getState().isAdmin);
      showToast('Profile updated!');
    },
    onEditClick: () => {
      settingsUI.open('profile');
    },
    onShareClick: (shareData) => shareUI.open(shareData),
    onBoardClick: (boardId) => router.navigate(`board/${boardId}`),
    onPinClick: (pinId) => router.navigate(`pin/${pinId}`),
    onTabChange: (tab) => router.navigate(`profile/${tab}`)
  });

  const adminUI = createAdminUI({
    container: els.adminSection,
    onPinSaved: () => {
      store.resetFeed();
      loadFeedPins();
    }
  });

  // 5. Router Initialization
  const router = new AppRouter((route) => {
    handleRoute(route);
  });

  // 6. Reactive Store Subscription
  let prevView = null;
  let prevCreator = 'all';
  let prevBoard = null;
  let prevFilter = 'all';
  let prevQuery = '';
  let prevSort = 'newest';

  store.subscribe((state) => {
    // Sync Saved Pins Counter Badge
    if (els.savedBadge) {
      const count = state.savedPinIds.length;
      els.savedBadge.textContent = count;
      els.savedBadge.hidden = count === 0;
    }

    // Toggle Section Visibilities
    if (els.feedSection) els.feedSection.hidden = state.view !== 'home';
    if (els.exploreSection) els.exploreSection.hidden = state.view !== 'explore';
    if (els.profileSection) els.profileSection.hidden = state.view !== 'profile';
    if (els.adminSection) els.adminSection.hidden = state.view !== 'admin';
    if (els.chipsBar) els.chipsBar.hidden = state.view !== 'home';

    // Nav active states
    if (els.navHome) els.navHome.classList.toggle('active', state.view === 'home');
    if (els.navExplore) els.navExplore.classList.toggle('active', state.view === 'explore');

    // Sync Filter Chips
    syncChipActiveStates(state);

    // Profile View Update
    if (state.view === 'profile') {
      profileUI.renderUser(state.user);
      profileUI.setActiveTab(state.profileTab);
      if (state.profileTab === 'boards') {
        profileUI.renderBoards(state.boards);
      } else {
        profileUI.renderTabPins(state.profileTab, state.savedPinIds, state.user?.id);
      }

      if (state.user) {
        PinsAPI.fetchPins({ userId: state.user.id, pageSize: 1 }).then(res => {
          profileUI.setCounts(
            res.totalCount || 0,
            state.savedPinIds.length,
            state.followedCreators.length
          );
        }).catch(() => {
          profileUI.setCounts(0, state.savedPinIds.length, state.followedCreators.length);
        });
      } else {
        profileUI.setCounts(0, state.savedPinIds.length, state.followedCreators.length);
      }
    }

    // Feed reload trigger (now includes prevSort)
    if (
      state.view === 'home' &&
      (prevView !== 'home' ||
       prevCreator !== state.activeCreatorId ||
       prevBoard !== state.activeBoardId ||
       prevFilter !== state.filter ||
       prevQuery !== state.query ||
       prevSort !== state.sort)
    ) {
      loadFeedPins();
    }

    prevView = state.view;
    prevCreator = state.activeCreatorId;
    prevBoard = state.activeBoardId;
    prevFilter = state.filter;
    prevQuery = state.query;
    prevSort = state.sort;
  });

  // 7. Feed Pins Loader & Infinite Scroll
  async function loadFeedPins() {
    const state = store.getState();
    feedUI.renderSkeletons(8);
    if (els.emptyState) els.emptyState.hidden = true;

    try {
      const result = await PinsAPI.fetchPins({
        page: 1,
        creator: state.activeCreatorId,
        boardId: state.activeBoardId,
        filter: state.filter,
        query: state.query,
        sort: state.sort,
        savedPinIds: state.savedPinIds
      });

      store.setPins(result.pins, result.totalCount, result.hasMore);
      feedUI.renderPins(result.pins, false, state.savedPinIds);
    } catch (err) {
      console.error('[Feed] Failed to load pins:', err);
      feedUI.renderError('Could not load pins. Please check your connection.', () => loadFeedPins());
    }
  }

  async function loadMoreFeedPins() {
    const state = store.getState();
    if (state.isLoading || !state.hasMore || state.view !== 'home') return;

    store.setLoading(true);
    store.nextPage();
    const nextState = store.getState();

    try {
      const result = await PinsAPI.fetchPins({
        page: nextState.page,
        creator: nextState.activeCreatorId,
        boardId: nextState.activeBoardId,
        filter: nextState.filter,
        query: nextState.query,
        sort: nextState.sort,
        savedPinIds: nextState.savedPinIds
      });

      store.setPins(result.pins, result.totalCount, result.hasMore, true);
      feedUI.renderPins(result.pins, true, nextState.savedPinIds);
    } catch (err) {
      console.error('[Feed] Load more error:', err);
      store.setLoading(false);
    }
  }

  // Infinite scroll intersection observer
  if (els.feedSentinel && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreFeedPins();
      }
    }, { rootMargin: '400px' });
    observer.observe(els.feedSentinel);
  }

  // 8. Route Transition Handler
  let pinRequestToken = 0;
  async function handleRoute(route) {
    const { view, params } = route;

    if (view === 'pin' && params.pinId) {
      const requestId = ++pinRequestToken;
      const pin = await PinsAPI.fetchPinById(params.pinId);
      if (requestId !== pinRequestToken) return; // a newer pin navigation superseded this one
      if (pin) {
        const state = store.getState();
        const isSaved = state.savedPinIds.includes(pin.id);
        const reactions = store.getReactions(pin.id);
        const isFollowing = state.followedCreators.includes(pin.creator);
        pinModalUI.open(pin, isSaved, reactions, isFollowing);
      } else {
        showToast('This pin could not be found.');
        router.closePin();
      }
      return;
    }

    if (view === 'admin') {
      const user = store.getState().user;
      const isAdmin = store.getState().isAdmin;
      if (!user || !isAdmin) {
        showToast('Admin access required.');
        router.navigate('', true);
        return;
      }
      adminUI.setBoards(store.getState().boards);
      adminUI.loadMetrics();
      adminUI.loadTable();
    }

    store.applyRoute(route);
  }

  // 9. Auth Modal Controller
  let authMode = 'login';

  function openAuth(mode = 'login') {
    authMode = mode;
    if (!els.authModal) return;

    const title = document.getElementById('pAuthTitle');
    const submitBtn = document.getElementById('pAuthSubmitBtn');
    const toggleBtn = document.getElementById('pAuthToggleMode');
    const errorEl = document.getElementById('pAuthError');
    const nameGroup = document.getElementById('pAuthNameGroup');

    if (errorEl) errorEl.hidden = true;
    if (nameGroup) nameGroup.hidden = mode !== 'signup';
    if (title) title.textContent = mode === 'signup' ? 'Create your account' : 'Log In to Selena Archive';
    if (submitBtn) submitBtn.textContent = mode === 'signup' ? 'Sign Up' : 'Log In';
    if (toggleBtn) {
      toggleBtn.textContent = mode === 'signup'
        ? 'Already have an account? Log In'
        : "Don't have an account? Sign Up";
    }

    els.authModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeAuth() {
    if (els.authModal) {
      els.authModal.hidden = true;
      document.body.style.overflow = '';
    }
  }

  if (els.authModal) {
    document.getElementById('pAuthCloseBtn')?.addEventListener('click', closeAuth);
    document.getElementById('pAuthScrim')?.addEventListener('click', closeAuth);

    document.getElementById('pAuthToggleMode')?.addEventListener('click', () => {
      openAuth(authMode === 'login' ? 'signup' : 'login');
    });

    document.getElementById('pAuthGoogleBtn')?.addEventListener('click', async () => {
      try {
        await AuthAPI.signInWithOAuth('google');
      } catch (err) {
        alert('Google OAuth error: ' + err.message);
      }
    });

    document.getElementById('pAuthForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('pAuthEmail')?.value?.trim();
      const password = document.getElementById('pAuthPassword')?.value;
      const name = document.getElementById('pAuthName')?.value?.trim() || '';
      const errorEl = document.getElementById('pAuthError');
      const submitBtn = document.getElementById('pAuthSubmitBtn');

      if (!email || !password) return;

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Authenticating...';
        }
        if (errorEl) errorEl.hidden = true;

        let res;
        if (authMode === 'signup') {
          res = await AuthAPI.signUp(email, password, name);
          showToast('Account created!');
        } else {
          res = await AuthAPI.signInWithPassword(email, password);
          showToast('Welcome back!');
        }

        if (res.user) {
          const isAdmin = await AuthAPI.isCurrentUserAdmin();
          store.setUser(res.user, isAdmin);
          updateUserDisplay(res.user, isAdmin);
          await syncUserSaves(res.user.id);
          closeAuth();
        }
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message || 'Authentication error';
          errorEl.hidden = false;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = authMode === 'signup' ? 'Sign Up' : 'Log In';
        }
      }
    });
  }

  async function syncUserSaves(userId) {
    if (!userId) return;
    try {
      const serverSavedIds = await PinsAPI.fetchUserSavedPinIds(userId);
      const localSavedIds = store.getState().savedPinIds;
      // Push any pre-login guest saves to database
      const unsyncedGuestIds = localSavedIds.filter(id => !serverSavedIds.includes(id));
      if (unsyncedGuestIds.length) {
        await Promise.allSettled(unsyncedGuestIds.map(id => PinsAPI.toggleSave(id, userId, false)));
      }
      const merged = Array.from(new Set([...localSavedIds, ...serverSavedIds]));
      store.setSavedPinIds(merged);
    } catch (err) {
      console.warn('[Auth] syncUserSaves failed:', err);
    }
  }

  function updateUserDisplay(user, isAdmin = false) {
    if (!user) {
      if (els.guestActions) els.guestActions.hidden = false;
      if (els.profileAnchor) els.profileAnchor.hidden = true;
      if (els.menuAdminBtn) els.menuAdminBtn.hidden = true;
      if (els.userDropdown) els.userDropdown.hidden = true;
      if (els.dropdownUserName) els.dropdownUserName.textContent = 'Selena Member';
      if (els.dropdownUserEmail) els.dropdownUserEmail.textContent = '@member';
      if (els.profileAvatar) els.profileAvatar.src = 'assets/images/logo.png';
      return;
    }

    if (els.guestActions) els.guestActions.hidden = true;
    if (els.profileAnchor) els.profileAnchor.hidden = false;

    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Selena Member';
    const handle = user.user_metadata?.handle || user.email?.split('@')[0] || 'member';
    if (els.dropdownUserName) els.dropdownUserName.textContent = name;
    if (els.dropdownUserEmail) els.dropdownUserEmail.textContent = `@${handle}`;
    if (els.menuAdminBtn) els.menuAdminBtn.hidden = !isAdmin;
    if (els.navCreateBtn) els.navCreateBtn.hidden = !isAdmin;
    if (els.profileAvatar) {
      els.profileAvatar.src = user.user_metadata?.avatar_url || 'assets/images/logo.png';
    }
  }

  // 10. Navigation & Chip Listeners
  if (els.logoHome) els.logoHome.addEventListener('click', (e) => { e.preventDefault(); router.navigate(''); });
  if (els.navHome) els.navHome.addEventListener('click', () => router.navigate(''));
  if (els.navExplore) els.navExplore.addEventListener('click', () => router.navigate('explore'));
  if (els.savedBtn) els.savedBtn.addEventListener('click', () => router.navigate('profile/saved'));
  if (els.resetBtn) els.resetBtn.addEventListener('click', () => router.navigate(''));

  if (els.navLoginBtn) {
    els.navLoginBtn.addEventListener('click', () => openAuth('login'));
  }
  if (els.navSignUpBtn) {
    els.navSignUpBtn.addEventListener('click', () => openAuth('signup'));
  }

  if (els.navCreateBtn) {
    els.navCreateBtn.addEventListener('click', () => {
      const st = store.getState();
      if (!st.user) {
        showToast('Please log in to create a pin');
        openAuth('login');
        return;
      }
      // Pin uploads are curated/admin-only (see CONTEXT.md + the "Admins can
      // insert pins" RLS policy) — regular members can browse, save, react,
      // and comment, but cannot publish new pins.
      if (!st.isAdmin) {
        showToast('Pin uploads are managed by our curators.');
        return;
      }
      createPinUI.open(st.creators, st.boards);
    });
  }

  if (els.profileBtn) {
    els.profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const st = store.getState();
      if (!st.user) {
        openAuth('login');
      } else if (els.userDropdown) {
        els.userDropdown.hidden = !els.userDropdown.hidden;
      }
    });
  }

  if (els.menuProfileBtn) {
    els.menuProfileBtn.addEventListener('click', () => {
      if (els.userDropdown) els.userDropdown.hidden = true;
      router.navigate('profile');
    });
  }

  if (els.menuSettingsBtn) {
    els.menuSettingsBtn.addEventListener('click', () => {
      if (els.userDropdown) els.userDropdown.hidden = true;
      settingsUI.open();
    });
  }

  if (els.menuAdminBtn) {
    els.menuAdminBtn.addEventListener('click', () => {
      if (els.userDropdown) els.userDropdown.hidden = true;
      router.navigate('admin');
    });
  }

  if (els.menuSignOutBtn) {
    els.menuSignOutBtn.addEventListener('click', async () => {
      if (els.userDropdown) els.userDropdown.hidden = true;
      await store.signOut();
      updateUserDisplay(null, false);
      showToast('Logged out successfully');
      router.navigate('');
    });
  }

  // Popover menus
  if (els.notifBtn && els.notifPanel) {
    els.notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.notifPanel.hidden = !els.notifPanel.hidden;
      if (els.inboxPanel) els.inboxPanel.hidden = true;
    });
  }

  if (els.inboxBtn && els.inboxPanel) {
    els.inboxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.inboxPanel.hidden = !els.inboxPanel.hidden;
      if (els.notifPanel) els.notifPanel.hidden = true;
    });
  }

  document.addEventListener('click', () => {
    if (els.userDropdown) els.userDropdown.hidden = true;
    if (els.notifPanel) els.notifPanel.hidden = true;
    if (els.inboxPanel) els.inboxPanel.hidden = true;
    if (els.sortMenu) els.sortMenu.hidden = true;
  });

  // Search Input
  if (els.searchInput) {
    let debounce;
    els.searchInput.addEventListener('input', () => {
      const q = els.searchInput.value.trim();
      if (els.searchClear) els.searchClear.hidden = q.length === 0;

      clearTimeout(debounce);
      debounce = setTimeout(() => {
        store.setQuery(q);
        if (store.getState().view !== 'home') {
          router.navigate('');
        }
      }, 300);
    });

    if (els.searchClear) {
      els.searchClear.addEventListener('click', () => {
        els.searchInput.value = '';
        els.searchClear.hidden = true;
        store.setQuery('');
      });
    }
  }

  // Sort Dropdown
  if (els.sortBtn && els.sortMenu) {
    els.sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.sortMenu.hidden = !els.sortMenu.hidden;
    });

    els.sortMenu.querySelectorAll('.p-sort-item').forEach(item => {
      item.addEventListener('click', () => {
        const sort = item.getAttribute('data-sort');
        els.sortMenu.querySelectorAll('.p-sort-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        if (els.sortLabel) els.sortLabel.textContent = item.textContent;
        store.setSort(sort);
      });
    });
  }

  function renderDynamicChips(creators = []) {
    if (!els.chipsScroll) return;
    const items = [
      { type: 'creator', value: 'all', label: 'All' },
      ...creators.map(c => ({ type: 'creator', value: c.id, label: c.name })),
      { type: 'filter', value: 'popular', label: 'Trending Ideas' },
      { type: 'filter', value: 'saved', label: 'Saved Ideas' }
    ];

    els.chipsScroll.innerHTML = items.map(it => `
      <button class="p-chip" data-${it.type}="${it.value}">${escapeHtml(it.label)}</button>
    `).join('');

    bindChipListeners();
    syncChipActiveStates(store.getState());
  }

  function bindChipListeners() {
    if (!els.chipsScroll) return;
    els.chipsScroll.querySelectorAll('.p-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const creator = chip.getAttribute('data-creator');
        const filter = chip.getAttribute('data-filter');

        if (filter) {
          router.navigate(`filter/${filter}`);
        } else if (creator) {
          router.navigate(creator === 'all' ? '' : `creator/${creator}`);
        }
      });
    });
  }

  function syncChipActiveStates(state) {
    if (!els.chipsScroll) return;
    const chips = els.chipsScroll.querySelectorAll('.p-chip');
    chips.forEach(chip => {
      const c = chip.getAttribute('data-creator');
      const f = chip.getAttribute('data-filter');
      if (state.activeBoardId) {
        chip.classList.remove('active');
      } else if (f) {
        chip.classList.toggle('active', state.filter === f);
      } else if (c) {
        chip.classList.toggle('active', state.activeCreatorId === c && state.filter === 'all');
      }
    });
  }

  function renderExploreCards(creators = [], boards = []) {
    const grid = document.getElementById('pExploreGrid');
    if (!grid) return;

    if (!creators.length && !boards.length) {
      grid.innerHTML = '<p class="p-empty-tab">No curated collections found.</p>';
      return;
    }

    const cards = [];

    // Render creators dynamically as explore spotlight cards
    creators.forEach(c => {
      const isFeatured = c.is_featured || (c.follower_count && c.follower_count > 100000);
      const tag = isFeatured ? 'Featured Collection' : 'Trending Showcase';
      const subtitle = c.bio || `${c.name} Aesthetic & Media`;
      const imgUrl = c.avatar_url || CONFIG.DEFAULT_IMAGE_URL;

      cards.push(`
        <div class="p-explore-card" data-explore-creator="${c.id}" tabindex="0" role="button" aria-label="Explore ${escapeHtml(c.name)} Collection">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(c.name)}" class="p-explore-img" loading="lazy" />
          <div class="p-explore-card-overlay">
            <span class="p-explore-tag">${tag}</span>
            <h3>${escapeHtml(c.name)}</h3>
            <p>${escapeHtml(subtitle)} &rarr;</p>
          </div>
        </div>
      `);
    });

    // Render curated system boards as explore spotlight cards too — the
    // click handler below already supports data-explore-board, this loop
    // was previously missing so boards never actually appeared here.
    boards.filter(b => b.is_system).forEach(b => {
      const imgUrl = b.cover_image_url || CONFIG.DEFAULT_IMAGE_URL;
      const subtitle = b.description || 'Curated Collection';

      cards.push(`
        <div class="p-explore-card" data-explore-board="${b.id}" tabindex="0" role="button" aria-label="Explore ${escapeHtml(b.name)} Board">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(b.name)}" class="p-explore-img" loading="lazy" />
          <div class="p-explore-card-overlay">
            <span class="p-explore-tag">Curated Board</span>
            <h3>${escapeHtml(b.name)}</h3>
            <p>${escapeHtml(subtitle)} &rarr;</p>
          </div>
        </div>
      `);
    });

    grid.innerHTML = cards.join('');
  }

  // Explore Cards Event Delegation
  const exploreGrid = document.getElementById('pExploreGrid');
  if (exploreGrid) {
    const handleExploreNav = (target) => {
      const card = target.closest('.p-explore-card');
      if (!card) return;
      const creator = card.getAttribute('data-explore-creator');
      const board = card.getAttribute('data-explore-board');
      if (creator) router.navigate(`creator/${creator}`);
      else if (board) router.navigate(`board/${board}`);
    };

    exploreGrid.addEventListener('click', (e) => handleExploreNav(e.target));
    exploreGrid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleExploreNav(e.target);
      }
    });
  }

  // 11. Debounced Realtime Subscriptions
  let realtimeDebounce = null;
  subscribeTable('live_pins_feed', 'pins', () => {
    clearTimeout(realtimeDebounce);
    realtimeDebounce = setTimeout(() => {
      if (store.getState().view === 'home') {
        loadFeedPins();
      }
    }, 400);
  });

  // 12. Toast Helper
  function showToast(msg) {
    if (!els.toast || !els.toastMsg) return;
    els.toastMsg.textContent = msg;
    els.toast.hidden = false;
    setTimeout(() => {
      els.toast.hidden = true;
    }, 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 13. Application Startup Bootstrap
  updateUserDisplay(null, false);

  try {
    const [user, isAdmin, creators] = await Promise.all([
      AuthAPI.getCurrentUser(),
      AuthAPI.isCurrentUserAdmin(),
      PinsAPI.fetchCreators()
    ]);
    // Boards depend on which user is logged in (system boards + their own
    // custom boards), so fetch them once we know who "user" is.
    const boards = await BoardsAPI.fetchBoards(user?.id || null);

    store.setUser(user, isAdmin);
    store.setMetadata(creators, boards);
    renderDynamicChips(creators);
    renderExploreCards(creators, boards);
    adminUI.setBoards(boards);
    adminUI.setCreators(creators);
    updateUserDisplay(user, isAdmin);

    if (user) {
      await syncUserSaves(user.id);
    }

    AuthAPI.onAuthStateChange(async (event, sessionUser) => {
      const isAdm = await AuthAPI.isCurrentUserAdmin();
      store.setUser(sessionUser, isAdm);
      updateUserDisplay(sessionUser, isAdm);
      // Re-fetch boards scoped to the newly signed-in (or signed-out) user
      // so their own custom boards show up in Profile > Boards and the
      // Create Pin board picker without needing a full page reload.
      await store.refreshBoards();
      if (sessionUser) {
        await syncUserSaves(sessionUser.id);
      }
    });

    router.init();
  } catch (err) {
    console.error('[Bootstrap] Initialization error:', err);
    bindChipListeners();
    router.init();
  }
}

// Ensure startup runs regardless of whether DOMContentLoaded has already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
