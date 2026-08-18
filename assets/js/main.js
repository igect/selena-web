/**
 * Selena Media Archive — Application Coordinator & Bootstrap
 * Deep module initializing store, router, UI modules, and real-time subscriptions.
 */

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

document.addEventListener('DOMContentLoaded', async () => {
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
    profileBtn: document.getElementById('pProfileBtn'),
    profileAvatar: document.querySelector('.p-avatar-img'),
    userDropdown: document.getElementById('pUserDropdown'),
    menuProfileBtn: document.getElementById('pMenuProfileBtn'),
    menuAdminBtn: document.getElementById('pMenuAdminBtn'),
    menuSignOutBtn: document.getElementById('pMenuSignOutBtn'),
    dropdownUserName: document.getElementById('pDropdownUserName'),
    dropdownUserEmail: document.getElementById('pDropdownUserEmail'),

    // Chips
    chipsBar: document.getElementById('pChipsBar'),
    creatorChips: document.querySelectorAll('.p-chip'),

    // Sections
    feedSection: document.getElementById('pFeedSection'),
    exploreSection: document.getElementById('pExploreSection'),
    profileSection: document.getElementById('pProfileSection'),
    adminSection: document.getElementById('pAdminSection'),
    pinsGrid: document.getElementById('pPinGrid'),
    emptyState: document.getElementById('pEmptyState'),
    resetBtn: document.getElementById('pResetBtn'),

    // Modals
    pinModal: document.getElementById('pPinModal'),
    createModal: document.getElementById('pCreateModal'),
    authModal: document.getElementById('pAuthModal'),
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

  // 4. UI Components Initialization
  const feedUI = createFeedUI({
    container: els.pinsGrid,
    onPinClick: (pinId) => router.navigate(`pin/${pinId}`),
    onSaveClick: (pinId) => store.toggleSave(pinId)
  });

  const pinModalUI = createPinModal({
    modalEl: els.pinModal,
    onClose: () => {
      if (store.getState().view === 'pin') {
        router.navigate('');
      }
    },
    onSaveClick: (pinId) => store.toggleSave(pinId),
    onReactionClick: (pinId, type) => store.toggleReaction(pinId, type),
    onCreatorClick: (creatorId) => store.toggleFollow(creatorId),
    onRelatedPinClick: (pinId) => router.navigate(`pin/${pinId}`)
  });

  const createPinUI = createPinModalUI({
    modalEl: els.createModal,
    onPinCreated: (pin) => {
      showToast('Pin published successfully!');
      router.navigate(`pin/${pin.id}`);
    }
  });

  const profileUI = createProfileUI({
    container: els.profileSection,
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
    els.creatorChips.forEach(chip => {
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

    // Profile View Update
    if (state.view === 'profile') {
      profileUI.renderUser(state.user);
      profileUI.setCounts(
        state.pins.filter(p => p.userId === state.user?.id).length,
        state.savedPinIds.length,
        state.followedCreators.length
      );
      profileUI.setActiveTab(state.profileTab);
      if (state.profileTab === 'boards') {
        profileUI.renderBoards(state.boards);
      } else {
        profileUI.renderTabPins(state.profileTab, state.savedPinIds, state.user?.id);
      }
    }

    // Feed reload trigger
    if (
      state.view === 'home' &&
      (prevView !== 'home' ||
       prevCreator !== state.activeCreatorId ||
       prevBoard !== state.activeBoardId ||
       prevFilter !== state.filter ||
       prevQuery !== state.query)
    ) {
      loadFeedPins();
    }

    prevView = state.view;
    prevCreator = state.activeCreatorId;
    prevBoard = state.activeBoardId;
    prevFilter = state.filter;
    prevQuery = state.query;
  });

  // 7. Feed Pins Loader
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
      feedUI.renderPins(result.pins);

      if (result.pins.length === 0 && els.emptyState) {
        els.emptyState.hidden = false;
      }
    } catch (err) {
      console.error('[Feed] Failed to load pins:', err);
    }
  }

  // 8. Route Transition Handler
  async function handleRoute(route) {
    const { view, params } = route;

    if (view === 'pin' && params.pinId) {
      const pin = await PinsAPI.fetchPinById(params.pinId);
      if (pin) {
        const state = store.getState();
        const isSaved = state.savedPinIds.includes(pin.id);
        const reactions = store.getReactions(pin.id);
        const isFollowing = state.followedCreators.includes(pin.creator);
        pinModalUI.open(pin, isSaved, reactions, isFollowing);
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

    store.setView(view, params);

    if (view === 'home') {
      if (params.creatorId) store.setCreator(params.creatorId);
      else if (params.boardId) store.setBoard(params.boardId);
      else if (params.filter) store.setFilter(params.filter);
      else if (!params.creatorId && !params.boardId && !params.filter) {
        store.setCreator('all');
      }
    }
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

    if (errorEl) errorEl.hidden = true;
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
          res = await AuthAPI.signUp(email, password);
          showToast('Account created!');
        } else {
          res = await AuthAPI.signInWithPassword(email, password);
          showToast('Welcome back!');
        }

        if (res.user) {
          const isAdmin = await AuthAPI.isCurrentUserAdmin();
          store.setUser(res.user, isAdmin);
          updateUserDisplay(res.user, isAdmin);
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

  function updateUserDisplay(user, isAdmin = false) {
    if (!user) {
      if (els.dropdownUserName) els.dropdownUserName.textContent = 'Selena Member';
      if (els.dropdownUserEmail) els.dropdownUserEmail.textContent = '@member';
      if (els.menuAdminBtn) els.menuAdminBtn.hidden = true;
      return;
    }

    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Selena Member';
    const email = user.email || '@member';
    if (els.dropdownUserName) els.dropdownUserName.textContent = name;
    if (els.dropdownUserEmail) els.dropdownUserEmail.textContent = email;
    if (els.menuAdminBtn) els.menuAdminBtn.hidden = !isAdmin;
    if (els.profileAvatar) {
      els.profileAvatar.src = user.user_metadata?.avatar_url || 'assets/images/logo.png';
    }
  }

  // 10. Navigation Listeners
  if (els.logoHome) els.logoHome.addEventListener('click', (e) => { e.preventDefault(); router.navigate(''); });
  if (els.navHome) els.navHome.addEventListener('click', () => router.navigate(''));
  if (els.navExplore) els.navExplore.addEventListener('click', () => router.navigate('explore'));
  if (els.savedBtn) els.savedBtn.addEventListener('click', () => router.navigate('profile/saved'));
  if (els.resetBtn) els.resetBtn.addEventListener('click', () => router.navigate(''));

  if (els.navCreateBtn) {
    els.navCreateBtn.addEventListener('click', () => {
      const st = store.getState();
      if (!st.user) {
        showToast('Please log in to create a pin');
        openAuth('login');
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

  // Creator & Filter Chips
  els.creatorChips.forEach(chip => {
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

  // Explore Cards Navigation
  document.querySelectorAll('.p-explore-card').forEach(card => {
    card.addEventListener('click', () => {
      const creator = card.getAttribute('data-explore-creator');
      if (creator) router.navigate(`creator/${creator}`);
    });
  });

  // 11. Realtime Subscriptions
  subscribeTable('live_pins_feed', 'pins', () => {
    if (store.getState().view === 'home') {
      loadFeedPins();
    }
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

  // 13. Application Startup Bootstrap
  try {
    const [user, isAdmin, creators, boards] = await Promise.all([
      AuthAPI.getCurrentUser(),
      AuthAPI.isCurrentUserAdmin(),
      PinsAPI.fetchCreators(),
      BoardsAPI.fetchBoards()
    ]);

    store.setUser(user, isAdmin);
    store.setMetadata(creators, boards);
    adminUI.setBoards(boards);
    updateUserDisplay(user, isAdmin);

    AuthAPI.onAuthStateChange(async (event, sessionUser) => {
      const isAdm = await AuthAPI.isCurrentUserAdmin();
      store.setUser(sessionUser, isAdm);
      updateUserDisplay(sessionUser, isAdm);
    });

    router.init();
  } catch (err) {
    console.error('[Bootstrap] Initialization error:', err);
    router.init();
  }
});
