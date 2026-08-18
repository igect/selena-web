const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('assets/js/archive-data.json', 'utf8'));

const bundleJs = `/**
 * Selena — 100% Authentic Pinterest Web Engine
 * Dynamic Board Selector, Inline Board Creator, Tags & Links
 * 100% Offline file:// Standalone Compatibility
 */

(function () {
  'use strict';

  const PINS = ${JSON.stringify(data.items)};

  // 1. Toast Notification Manager
  function showToast(msg) {
    const toast = document.getElementById('pToast');
    const msgEl = document.getElementById('pToastMsg');
    if (!toast || !msgEl) return;
    msgEl.textContent = msg;
    toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }

  // 2. Reactive Pinterest Store
  function createStore() {
    let rawPins = [...PINS];
    let userCreatedPins = [];
    let savedPins = new Set();
    let reactions = {};
    let followedCreators = new Set();
    let userComments = {};
    let customBoards = ['Aesthetics', 'Daily Inspo', 'Visuals'];

    try {
      const saved = localStorage.getItem('pinterest_saved_pins');
      if (saved) JSON.parse(saved).forEach(id => savedPins.add(id));
      const rx = localStorage.getItem('pinterest_reactions');
      if (rx) reactions = JSON.parse(rx);
      const fl = localStorage.getItem('pinterest_followed');
      if (fl) JSON.parse(fl).forEach(c => followedCreators.add(c));
      const cm = localStorage.getItem('pinterest_comments');
      if (cm) userComments = JSON.parse(cm);
      const boards = localStorage.getItem('pinterest_custom_boards');
      if (boards) customBoards = JSON.parse(boards);
      const created = localStorage.getItem('pinterest_created_pins');
      if (created) {
        userCreatedPins = JSON.parse(created);
        rawPins = [...userCreatedPins, ...rawPins];
      }
    } catch (e) {}

    let state = {
      view: 'home', // 'home' | 'explore' | 'profile'
      creator: 'all',
      filter: 'all', // 'all' | 'popular' | 'saved'
      query: '',
      onlySaved: false,
      sort: 'newest',
      profileTab: 'boards' // 'boards' | 'saved' | 'created'
    };

    const listeners = new Set();

    function getFiltered() {
      const q = state.query.trim().toLowerCase();
      return rawPins
        .filter(pin => {
          if (state.creator !== 'all' && pin.creator !== state.creator) return false;
          if (state.filter === 'saved' && !savedPins.has(pin.id)) return false;
          if (state.onlySaved && !savedPins.has(pin.id)) return false;
          if (q) {
            const matchTitle = pin.title.toLowerCase().includes(q);
            const matchCreator = pin.creatorName.toLowerCase().includes(q);
            const matchDesc = pin.description ? pin.description.toLowerCase().includes(q) : false;
            if (!matchTitle && !matchCreator && !matchDesc) return false;
          }
          return true;
        })
        .sort((a, b) => {
          if (state.filter === 'popular' || state.sort === 'popular') {
            const sa = savedPins.has(a.id) ? 1 : 0;
            const sb = savedPins.has(b.id) ? 1 : 0;
            return sb - sa || new Date(b.date) - new Date(a.date);
          }
          if (state.sort === 'newest') return new Date(b.date) - new Date(a.date);
          if (state.sort === 'oldest') return new Date(a.date) - new Date(b.date);
          return 0;
        });
    }

    function notify() {
      const filtered = getFiltered();
      const snap = {
        filtered,
        total: rawPins.length,
        savedCount: savedPins.size,
        userCreatedCount: userCreatedPins.length,
        userCreated: userCreatedPins,
        savedList: rawPins.filter(p => savedPins.has(p.id)),
        boards: [...customBoards],
        state: { ...state }
      };
      listeners.forEach(fn => fn(snap));
    }

    return {
      getState: () => ({
        filtered: getFiltered(),
        total: rawPins.length,
        savedCount: savedPins.size,
        userCreatedCount: userCreatedPins.length,
        userCreated: userCreatedPins,
        savedList: rawPins.filter(p => savedPins.has(p.id)),
        boards: [...customBoards],
        state: { ...state }
      }),
      setView: (v) => { state.view = v; notify(); },
      setCreator: (c) => { state.creator = c; state.filter = 'all'; notify(); },
      setFilter: (f) => { state.filter = f; state.creator = 'all'; notify(); },
      setQuery: (q) => { state.query = q; notify(); },
      setSort: (s) => { state.sort = s; notify(); },
      setProfileTab: (t) => { state.profileTab = t; notify(); },
      toggleSavedFilter: () => { state.onlySaved = !state.onlySaved; notify(); },
      reset: () => { state.creator = 'all'; state.filter = 'all'; state.query = ''; state.onlySaved = false; state.view = 'home'; notify(); },
      toggleSave: (id) => {
        let isNowSaved = false;
        if (savedPins.has(id)) {
          savedPins.delete(id);
          isNowSaved = false;
        } else {
          savedPins.add(id);
          isNowSaved = true;
        }
        try { localStorage.setItem('pinterest_saved_pins', JSON.stringify(Array.from(savedPins))); } catch (e) {}
        notify();
        return isNowSaved;
      },
      isSaved: (id) => savedPins.has(id),
      toggleFollow: (creator) => {
        let isFollow = false;
        if (followedCreators.has(creator)) {
          followedCreators.delete(creator);
          isFollow = false;
        } else {
          followedCreators.add(creator);
          isFollow = true;
        }
        try { localStorage.setItem('pinterest_followed', JSON.stringify(Array.from(followedCreators))); } catch (e) {}
        return isFollow;
      },
      isFollowing: (creator) => followedCreators.has(creator),
      getReactions: (id) => reactions[id] || { love: 0, sparkle: 0, fire: 0 },
      addReaction: (id, type) => {
        if (!reactions[id]) reactions[id] = { love: 0, sparkle: 0, fire: 0 };
        reactions[id][type] = (reactions[id][type] || 0) + 1;
        try { localStorage.setItem('pinterest_reactions', JSON.stringify(reactions)); } catch (e) {}
      },
      getComments: (id) => userComments[id] || [],
      addComment: (id, text) => {
        if (!userComments[id]) userComments[id] = [];
        userComments[id].push({ user: 'you', text, time: 'Just now' });
        try { localStorage.setItem('pinterest_comments', JSON.stringify(userComments)); } catch (e) {}
      },
      getBoards: () => [...customBoards],
      addBoard: (name) => {
        const trimmed = name.trim();
        if (trimmed && !customBoards.includes(trimmed)) {
          customBoards.push(trimmed);
          try { localStorage.setItem('pinterest_custom_boards', JSON.stringify(customBoards)); } catch (e) {}
          notify();
        }
        return trimmed;
      },
      createPin: (pinData) => {
        const boardName = pinData.board || 'Aesthetics';
        if (!customBoards.includes(boardName)) {
          customBoards.push(boardName);
          try { localStorage.setItem('pinterest_custom_boards', JSON.stringify(customBoards)); } catch (e) {}
        }

        const newPin = {
          id: 'user_pin_' + Date.now(),
          title: pinData.title,
          description: pinData.description,
          creator: 'user',
          creatorName: 'Selena Collector',
          board: boardName,
          link: pinData.link || '',
          tags: pinData.tags || [],
          img: pinData.img,
          date: new Date().toISOString().split('T')[0]
        };
        userCreatedPins.unshift(newPin);
        rawPins.unshift(newPin);
        savedPins.add(newPin.id);
        try {
          localStorage.setItem('pinterest_created_pins', JSON.stringify(userCreatedPins));
          localStorage.setItem('pinterest_saved_pins', JSON.stringify(Array.from(savedPins)));
        } catch (e) {}
        notify();
        return newPin;
      },
      subscribe: (fn) => {
        listeners.add(fn);
        fn({
          filtered: getFiltered(),
          total: rawPins.length,
          savedCount: savedPins.size,
          userCreatedCount: userCreatedPins.length,
          userCreated: userCreatedPins,
          savedList: rawPins.filter(p => savedPins.has(p.id)),
          boards: [...customBoards],
          state: { ...state }
        });
      }
    };
  }

  // 3. Pin Card Renderer
  function renderPinCard(pin, isSaved, index) {
    return \`
      <div class="p-pin-card" data-id="\${pin.id}" tabindex="0" role="button" aria-label="\${pin.title}">
        <div class="p-pin-img-wrapper">
          <img src="\${pin.img}" alt="\${pin.title}" class="p-pin-img" loading="lazy" />
          
          <div class="p-pin-overlay">
            <div class="p-overlay-top">
              <span class="p-collection-tag">\${pin.board || pin.creatorName}</span>
              <button class="p-save-btn \${isSaved ? 'is-saved' : ''}" data-action="save" data-id="\${pin.id}">
                \${isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
            <div class="p-overlay-bottom">
              <button class="p-action-btn-sm" data-action="share" title="Copy link" aria-label="Share">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
              </button>
              <button class="p-action-btn-sm" data-action="download" title="Download image" aria-label="Download">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="p-pin-footer">
          <h4 class="p-pin-title">\${pin.title}</h4>
          <div class="p-pin-creator-row">
            <div class="p-creator-thumb">
              <img src="assets/images/logo.png" alt="\${pin.creatorName}" />
            </div>
            <span class="p-creator-name-sm">\${pin.creatorName}</span>
          </div>
        </div>
      </div>
    \`;
  }

  // 4. Split Pin Detail Modal Controller
  function createDetailModal(dom, store) {
    let currentPin = null;

    function renderComments(pinId) {
      const container = dom.overlay.querySelector('.p-comments-section');
      if (!container) return;
      const userList = store.getComments(pinId);
      
      let html = \`
        <span class="p-comments-title">Comments (\${1 + userList.length})</span>
        <div class="p-comment-item">
          <div class="p-comment-avatar">
            <img src="assets/images/logo.png" alt="">
          </div>
          <div class="p-comment-body">
            <span class="p-comment-user">alex_curates</span>
            <p class="p-comment-text">Stunning aesthetic and perfect portrait lighting!</p>
          </div>
        </div>
      \`;

      userList.forEach(c => {
        html += \`
          <div class="p-comment-item">
            <div class="p-comment-avatar">
              <img src="assets/images/logo.png" alt="">
            </div>
            <div class="p-comment-body">
              <span class="p-comment-user">\${c.user}</span>
              <p class="p-comment-text">\${c.text}</p>
            </div>
          </div>
        \`;
      });

      container.innerHTML = html;
    }

    function renderRelatedPins(pin) {
      const relatedContainer = dom.overlay.querySelector('.p-related-pins-grid');
      if (!relatedContainer) return;
      const allPins = store.getState().filtered;
      const related = allPins.filter(p => p.creator === pin.creator && p.id !== pin.id).slice(0, 4);
      
      relatedContainer.innerHTML = related.map((p, idx) => \`
        <div class="p-related-pin-card" data-related-id="\${p.id}">
          <img src="\${p.img}" alt="\${p.title}" loading="lazy" />
          <span class="p-related-title">\${p.title}</span>
        </div>
      \`).join('');
    }

    function open(pin) {
      currentPin = pin;
      dom.img.src = pin.img;
      dom.title.textContent = pin.title;
      dom.date.textContent = 'Saved to ' + (pin.board || pin.creatorName);
      dom.creatorName.textContent = pin.creatorName;
      if (dom.desc) dom.desc.textContent = pin.description || 'Curated visual inspiration from the collection.';
      
      const isSaved = store.isSaved(pin.id);
      dom.saveBtn.textContent = isSaved ? 'Saved' : 'Save';
      dom.saveBtn.classList.toggle('is-saved', isSaved);

      const isFollowing = store.isFollowing(pin.creator);
      if (dom.followBtn) {
        dom.followBtn.textContent = isFollowing ? 'Following' : 'Follow';
        dom.followBtn.classList.toggle('active', isFollowing);
      }

      renderComments(pin.id);
      renderRelatedPins(pin);

      dom.overlay.hidden = false;
      document.body.classList.add('modal-open');
    }

    function close() {
      dom.overlay.hidden = true;
      document.body.classList.remove('modal-open');
    }

    if (dom.closeBtn) dom.closeBtn.addEventListener('click', close);
    if (dom.scrim) dom.scrim.addEventListener('click', close);

    if (dom.saveBtn) {
      dom.saveBtn.addEventListener('click', () => {
        if (currentPin) {
          const isSaved = store.toggleSave(currentPin.id);
          dom.saveBtn.textContent = isSaved ? 'Saved' : 'Save';
          dom.saveBtn.classList.toggle('is-saved', isSaved);
          showToast(isSaved ? 'Saved to ' + (currentPin.board || currentPin.creatorName) : 'Removed from board');
        }
      });
    }

    if (dom.followBtn) {
      dom.followBtn.addEventListener('click', () => {
        if (currentPin) {
          const isFollowing = store.toggleFollow(currentPin.creator);
          dom.followBtn.textContent = isFollowing ? 'Following' : 'Follow';
          dom.followBtn.classList.toggle('active', isFollowing);
          showToast(isFollowing ? 'Following ' + currentPin.creatorName : 'Unfollowed ' + currentPin.creatorName);
        }
      });
    }

    if (dom.shareBtn) {
      dom.shareBtn.addEventListener('click', () => {
        if (navigator.clipboard && currentPin) {
          navigator.clipboard.writeText(window.location.href);
          showToast('Link copied to clipboard!');
        } else {
          showToast('Pin link ready to share');
        }
      });
    }

    if (dom.downloadBtn) {
      dom.downloadBtn.addEventListener('click', () => {
        if (currentPin) {
          const a = document.createElement('a');
          a.href = currentPin.img;
          a.download = currentPin.title.replace(/\\s+/g, '_').toLowerCase() + '.jpg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast('Downloading image...');
        }
      });
    }

    // Reaction Clicks
    const reactionBtns = dom.overlay.querySelectorAll('.p-reaction-btn');
    reactionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-reaction');
        const numSpan = btn.querySelector('.rx-num');
        if (numSpan && currentPin) {
          const cur = parseInt(numSpan.textContent, 10) || 0;
          numSpan.textContent = cur + 1;
          btn.classList.add('active');
          store.addReaction(currentPin.id, type);
          showToast('Reaction added!');
        }
      });
    });

    // Related Pin Clicks
    const relatedContainer = dom.overlay.querySelector('.p-related-pins-grid');
    if (relatedContainer) {
      relatedContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.p-related-pin-card');
        if (card) {
          const relId = card.getAttribute('data-related-id');
          const allPins = store.getState().filtered;
          const targetPin = allPins.find(p => p.id === relId);
          if (targetPin) open(targetPin);
        }
      });
    }

    // Add Comment
    const commentInput = dom.overlay.querySelector('.p-comment-input');
    const commentSend = dom.overlay.querySelector('.p-comment-send-btn');
    
    function submitComment() {
      if (commentInput && commentInput.value.trim() && currentPin) {
        store.addComment(currentPin.id, commentInput.value.trim());
        renderComments(currentPin.id);
        commentInput.value = '';
        showToast('Comment posted!');
      }
    }

    if (commentSend) commentSend.addEventListener('click', submitComment);
    if (commentInput) {
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitComment();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (!dom.overlay.hidden && e.key === 'Escape') close();
    });

    return { open, close, isOpen: () => !dom.overlay.hidden };
  }

  // 5. Authentic Pinterest Create Pin Builder Controller
  function createPinModalController(store) {
    const modal = document.getElementById('pCreateModal');
    const scrim = document.getElementById('pCreateScrim');
    const closeBtn = document.getElementById('pCloseCreateBtn');
    const createNavBtn = document.getElementById('pNavCreateBtn');
    const dropzone = document.getElementById('pDropzone');
    const fileInput = document.getElementById('pFileInput');
    const previewWrapper = document.getElementById('pPreviewWrapper');
    const preview = document.getElementById('pUploadPreview');
    const removePreviewBtn = document.getElementById('pRemovePreviewBtn');
    const placeholder = document.getElementById('pDropPlaceholder');
    const titleInput = document.getElementById('pCreateTitle');
    const descInput = document.getElementById('pCreateDesc');
    const linkInput = document.getElementById('pCreateLink');
    const submitBtn = document.getElementById('pSubmitPinBtn');

    // Board Selector Elements
    const boardSelectBtn = document.getElementById('pBoardSelectBtn');
    const selectedBoardLabel = document.getElementById('pSelectedBoardLabel');
    const boardDropdown = document.getElementById('pBoardDropdown');
    const boardSearchInput = document.getElementById('pBoardSearchInput');
    const boardListEl = document.getElementById('pBoardList');
    const openInlineBoardBtn = document.getElementById('pOpenInlineBoardBtn');
    const inlineBoardForm = document.getElementById('pInlineBoardForm');
    const newBoardNameInput = document.getElementById('pNewBoardNameInput');
    const saveNewBoardBtn = document.getElementById('pSaveNewBoardBtn');
    const cancelNewBoardBtn = document.getElementById('pCancelNewBoardBtn');

    let uploadedDataUrl = null;
    let selectedBoard = 'Aesthetics';
    let selectedTags = new Set();

    function renderBoardOptions(searchQuery = '') {
      if (!boardListEl) return;
      const allBoards = store.getBoards();
      const q = searchQuery.toLowerCase().trim();
      const filtered = allBoards.filter(b => b.toLowerCase().includes(q));

      if (filtered.length === 0) {
        boardListEl.innerHTML = '<div style="padding:8px 12px; font-size:0.8rem; color:var(--text-muted);">No boards found</div>';
        return;
      }

      boardListEl.innerHTML = filtered.map(b => \`
        <button type="button" class="p-board-item \${b === selectedBoard ? 'selected' : ''}" data-board-name="\${b}">
          <span>\${b}</span>
          \${b === selectedBoard ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </button>
      \`).join('');
    }

    function selectBoard(name) {
      selectedBoard = name;
      if (selectedBoardLabel) selectedBoardLabel.textContent = name;
      renderBoardOptions(boardSearchInput ? boardSearchInput.value : '');
      if (boardDropdown) boardDropdown.hidden = true;
    }

    if (boardSelectBtn && boardDropdown) {
      boardSelectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        boardDropdown.hidden = !boardDropdown.hidden;
        if (!boardDropdown.hidden) {
          renderBoardOptions();
          if (boardSearchInput) {
            boardSearchInput.value = '';
            boardSearchInput.focus();
          }
        }
      });
    }

    if (boardSearchInput) {
      boardSearchInput.addEventListener('input', (e) => {
        renderBoardOptions(e.target.value);
      });
    }

    if (boardListEl) {
      boardListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.p-board-item');
        if (item) {
          const name = item.getAttribute('data-board-name');
          if (name) selectBoard(name);
        }
      });
    }

    if (openInlineBoardBtn && inlineBoardForm) {
      openInlineBoardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        inlineBoardForm.hidden = false;
        if (newBoardNameInput) {
          newBoardNameInput.value = '';
          newBoardNameInput.focus();
        }
      });
    }

    if (cancelNewBoardBtn && inlineBoardForm) {
      cancelNewBoardBtn.addEventListener('click', () => {
        inlineBoardForm.hidden = true;
      });
    }

    if (saveNewBoardBtn && newBoardNameInput) {
      saveNewBoardBtn.addEventListener('click', () => {
        const name = newBoardNameInput.value.trim();
        if (name) {
          store.addBoard(name);
          selectBoard(name);
          inlineBoardForm.hidden = true;
          showToast(\`Board "\${name}" created!\`);
        }
      });

      newBoardNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveNewBoardBtn.click();
        }
      });
    }

    // Tag Pills
    document.querySelectorAll('.p-tag-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const tag = pill.getAttribute('data-tag');
        if (selectedTags.has(tag)) {
          selectedTags.delete(tag);
          pill.classList.remove('active');
        } else {
          selectedTags.add(tag);
          pill.classList.add('active');
        }
      });
    });

    function open() {
      modal.hidden = false;
      document.body.classList.add('modal-open');
      selectedBoard = store.getBoards()[0] || 'Aesthetics';
      if (selectedBoardLabel) selectedBoardLabel.textContent = selectedBoard;
    }

    function close() {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
      if (boardDropdown) boardDropdown.hidden = true;
      if (inlineBoardForm) inlineBoardForm.hidden = true;
    }

    if (createNavBtn) createNavBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (scrim) scrim.addEventListener('click', close);

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target !== removePreviewBtn) fileInput.click();
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--pin-red)';
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          const reader = new FileReader();
          reader.onload = (re) => {
            uploadedDataUrl = re.target.result;
            preview.src = uploadedDataUrl;
            previewWrapper.hidden = false;
            placeholder.hidden = true;
          };
          reader.readAsDataURL(file);
        }
      });
      
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            uploadedDataUrl = re.target.result;
            preview.src = uploadedDataUrl;
            previewWrapper.hidden = false;
            placeholder.hidden = true;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (removePreviewBtn) {
      removePreviewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadedDataUrl = null;
        if (previewWrapper) previewWrapper.hidden = true;
        if (placeholder) placeholder.hidden = false;
        if (fileInput) fileInput.value = '';
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const title = titleInput.value.trim();
        if (!title) {
          showToast('Please add a title for your Pin');
          titleInput.focus();
          return;
        }
        const img = uploadedDataUrl || 'assets/images/logo.png';
        store.createPin({
          title,
          description: descInput.value.trim(),
          board: selectedBoard,
          link: linkInput ? linkInput.value.trim() : '',
          tags: Array.from(selectedTags),
          img
        });

        titleInput.value = '';
        descInput.value = '';
        if (linkInput) linkInput.value = '';
        uploadedDataUrl = null;
        selectedTags.clear();
        document.querySelectorAll('.p-tag-pill').forEach(p => p.classList.remove('active'));
        if (previewWrapper) previewWrapper.hidden = true;
        if (placeholder) placeholder.hidden = false;

        close();
        showToast(\`Your Pin was published to "\${selectedBoard}"!\`);
      });
    }
  }

  // 6. Main App Initialization
  function init() {
    const store = createStore();
    const gallery = document.getElementById('pPinGrid');
    const emptyState = document.getElementById('pEmptyState');
    const searchInput = document.getElementById('pSearchInput');
    const clearSearchBtn = document.getElementById('pSearchClear');
    const chips = document.querySelectorAll('.p-chip');
    const chipsBar = document.getElementById('pChipsBar');
    const savedNavBtn = document.getElementById('pSavedBtn');
    const savedBadge = document.getElementById('pSavedBadge');
    const themeBtn = document.getElementById('pThemeBtn');
    const sortBtn = document.getElementById('pSortBtn');
    const sortMenu = document.getElementById('pSortMenu');
    const sortLabel = document.getElementById('pSortLabel');
    const sortItems = document.querySelectorAll('.p-sort-item');
    const resetBtn = document.getElementById('pResetBtn');
    
    // Nav sections
    const homeNavBtn = document.getElementById('pNavHome');
    const exploreNavBtn = document.getElementById('pNavExplore');
    const profileBtn = document.getElementById('pProfileBtn');
    const logoHome = document.getElementById('pLogoHome');

    const feedSection = document.getElementById('pFeedSection');
    const exploreSection = document.getElementById('pExploreSection');
    const profileSection = document.getElementById('pProfileSection');
    const profileGrid = document.getElementById('pProfileGrid');
    const profileBoardsGrid = document.getElementById('pProfileBoardsGrid');
    const tabBoards = document.getElementById('pTabBoards');
    const tabSaved = document.getElementById('pTabSaved');
    const tabCreated = document.getElementById('pTabCreated');

    // Popovers
    const notifBtn = document.getElementById('pNotifBtn');
    const notifPanel = document.getElementById('pNotifPanel');
    const inboxBtn = document.getElementById('pInboxBtn');
    const inboxPanel = document.getElementById('pInboxPanel');

    // Init Detail Modal
    const detailModal = createDetailModal({
      overlay: document.getElementById('pPinModal'),
      scrim: document.getElementById('pModalScrim'),
      closeBtn: document.getElementById('pCloseModalBtn'),
      img: document.getElementById('pDetailImg'),
      title: document.getElementById('pDetailTitle'),
      desc: document.getElementById('pDetailDesc'),
      date: document.getElementById('pDetailDate'),
      creatorName: document.getElementById('pDetailCreatorName'),
      saveBtn: document.getElementById('pDetailSaveBtn'),
      followBtn: document.getElementById('pFollowBtn'),
      shareBtn: document.getElementById('pDetailShareBtn'),
      downloadBtn: document.getElementById('pDetailDownloadBtn')
    }, store);

    // Init Create Modal
    createPinModalController(store);

    // Theme Management
    const savedTheme = localStorage.getItem('pinterest_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('pinterest_theme', next);
      });
    }

    // Popover Toggles
    if (notifBtn && notifPanel) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPanel.hidden = !notifPanel.hidden;
        if (inboxPanel) inboxPanel.hidden = true;
      });
    }

    if (inboxBtn && inboxPanel) {
      inboxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        inboxPanel.hidden = !inboxPanel.hidden;
        if (notifPanel) notifPanel.hidden = true;
      });
    }

    document.addEventListener('click', () => {
      if (notifPanel) notifPanel.hidden = true;
      if (inboxPanel) inboxPanel.hidden = true;
      if (sortMenu) sortMenu.hidden = true;
      const boardDropdown = document.getElementById('pBoardDropdown');
      if (boardDropdown) boardDropdown.hidden = true;
    });

    // 60fps Infinite Scroll Virtual Rendering
    let currentRenderedCount = 0;
    const PAGE_SIZE = 40;
    let activeList = [];

    function renderMore() {
      if (currentRenderedCount >= activeList.length) return;
      const nextSlice = activeList.slice(currentRenderedCount, currentRenderedCount + PAGE_SIZE);
      const html = nextSlice.map((pin, idx) => renderPinCard(pin, store.isSaved(pin.id), currentRenderedCount + idx)).join('');
      gallery.insertAdjacentHTML('beforeend', html);
      currentRenderedCount += nextSlice.length;
    }

    window.addEventListener('scroll', () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
        renderMore();
      }
    }, { passive: true });

    // Store Subscription
    store.subscribe((snap) => {
      activeList = snap.filtered;
      currentRenderedCount = 0;
      gallery.innerHTML = '';

      if (savedBadge) {
        savedBadge.textContent = snap.savedCount;
        savedBadge.hidden = snap.savedCount === 0;
      }
      if (savedNavBtn) savedNavBtn.classList.toggle('active', snap.state.onlySaved);

      // Section Switching
      if (snap.state.view === 'home') {
        feedSection.hidden = false;
        exploreSection.hidden = true;
        profileSection.hidden = true;
        chipsBar.hidden = false;
        homeNavBtn && homeNavBtn.classList.add('active');
        exploreNavBtn && exploreNavBtn.classList.remove('active');
      } else if (snap.state.view === 'explore') {
        feedSection.hidden = true;
        exploreSection.hidden = false;
        profileSection.hidden = true;
        chipsBar.hidden = true;
        exploreNavBtn && exploreNavBtn.classList.add('active');
        homeNavBtn && homeNavBtn.classList.remove('active');
      } else if (snap.state.view === 'profile') {
        feedSection.hidden = true;
        exploreSection.hidden = true;
        profileSection.hidden = false;
        chipsBar.hidden = true;
        homeNavBtn && homeNavBtn.classList.remove('active');
        exploreNavBtn && exploreNavBtn.classList.remove('active');

        // Render Profile Content based on active tab
        if (snap.state.profileTab === 'boards') {
          if (profileBoardsGrid) profileBoardsGrid.hidden = false;
          if (profileGrid) profileGrid.hidden = true;
        } else {
          if (profileBoardsGrid) profileBoardsGrid.hidden = true;
          if (profileGrid) profileGrid.hidden = false;

          const profList = snap.state.profileTab === 'saved' ? snap.savedList : snap.userCreated;
          if (profList.length === 0) {
            profileGrid.style.columnCount = '1';
            profileGrid.innerHTML = '<div style="text-align:center; padding: 60px 0; color: var(--text-muted); font-size: 1rem; width: 100%;">No pins in this section yet. Explore the feed to save pins!</div>';
          } else {
            profileGrid.style.columnCount = '';
            profileGrid.innerHTML = profList.map((pin, idx) => renderPinCard(pin, store.isSaved(pin.id), idx)).join('');
          }
        }
      }

      if (snap.filtered.length === 0 && snap.state.view === 'home') {
        if (emptyState) emptyState.hidden = false;
      } else {
        if (emptyState) emptyState.hidden = true;
        if (snap.state.view === 'home') renderMore();
      }

      chips.forEach(chip => {
        const c = chip.getAttribute('data-creator');
        const f = chip.getAttribute('data-filter');
        const isActive = (c && c === snap.state.creator && snap.state.filter === 'all') || (f && f === snap.state.filter);
        chip.classList.toggle('active', !!isActive);
      });
    });

    // Pin Card Clicks & Hover Actions
    function handlePinGridClick(e) {
      const saveBtn = e.target.closest('[data-action="save"]');
      if (saveBtn) {
        e.stopPropagation();
        const id = saveBtn.getAttribute('data-id');
        const isSaved = store.toggleSave(id);
        saveBtn.textContent = isSaved ? 'Saved' : 'Save';
        saveBtn.classList.toggle('is-saved', isSaved);
        showToast(isSaved ? 'Saved to Board!' : 'Removed from board');
        return;
      }

      const shareBtn = e.target.closest('[data-action="share"]');
      if (shareBtn) {
        e.stopPropagation();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(window.location.href);
          showToast('Link copied to clipboard!');
        }
        return;
      }

      const downloadBtn = e.target.closest('[data-action="download"]');
      if (downloadBtn) {
        e.stopPropagation();
        const card = downloadBtn.closest('.p-pin-card');
        if (card) {
          const id = card.getAttribute('data-id');
          const list = store.getState().filtered;
          const pin = list.find(p => p.id === id);
          if (pin) {
            const a = document.createElement('a');
            a.href = pin.img;
            a.download = pin.title.replace(/\\s+/g, '_').toLowerCase() + '.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Downloading image...');
          }
        }
        return;
      }

      const card = e.target.closest('.p-pin-card');
      if (card) {
        const id = card.getAttribute('data-id');
        const list = store.getState().filtered;
        const pin = list.find(p => p.id === id);
        if (pin) detailModal.open(pin);
      }
    }

    gallery.addEventListener('click', handlePinGridClick);
    if (profileGrid) profileGrid.addEventListener('click', handlePinGridClick);

    // Filter Chips
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const creator = chip.getAttribute('data-creator');
        const filter = chip.getAttribute('data-filter');
        if (creator) store.setCreator(creator);
        else if (filter) store.setFilter(filter);
      });
    });

    // Explore Cards
    document.querySelectorAll('.p-explore-card').forEach(card => {
      card.addEventListener('click', () => {
        const creator = card.getAttribute('data-explore-creator');
        store.setCreator(creator);
        store.setView('home');
      });
    });

    // Profile Boards Card Click
    document.querySelectorAll('.p-board-card').forEach(card => {
      card.addEventListener('click', () => {
        const creator = card.getAttribute('data-board-creator');
        store.setCreator(creator);
        store.setView('home');
      });
    });

    // Profile Tabs
    if (tabBoards) {
      tabBoards.addEventListener('click', () => {
        tabBoards.classList.add('active');
        if (tabSaved) tabSaved.classList.remove('active');
        if (tabCreated) tabCreated.classList.remove('active');
        store.setProfileTab('boards');
      });
    }

    if (tabSaved) {
      tabSaved.addEventListener('click', () => {
        tabSaved.classList.add('active');
        if (tabBoards) tabBoards.classList.remove('active');
        if (tabCreated) tabCreated.classList.remove('active');
        store.setProfileTab('saved');
      });
    }

    if (tabCreated) {
      tabCreated.addEventListener('click', () => {
        tabCreated.classList.add('active');
        if (tabBoards) tabBoards.classList.remove('active');
        if (tabSaved) tabSaved.classList.remove('active');
        store.setProfileTab('created');
      });
    }

    // Search Input
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (clearSearchBtn) clearSearchBtn.hidden = !val;
        store.setQuery(val);
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.hidden = true;
        store.setQuery('');
        searchInput.focus();
      });
    }

    // Navigation Switchers
    if (homeNavBtn) homeNavBtn.addEventListener('click', () => store.reset());
    if (logoHome) logoHome.addEventListener('click', (e) => { e.preventDefault(); store.reset(); });
    if (exploreNavBtn) exploreNavBtn.addEventListener('click', () => store.setView('explore'));
    if (profileBtn) profileBtn.addEventListener('click', () => store.setView('profile'));
    if (savedNavBtn) savedNavBtn.addEventListener('click', () => store.toggleSavedFilter());

    // Sort Dropdown
    if (sortBtn && sortMenu) {
      sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sortMenu.hidden = !sortMenu.hidden;
      });

      sortItems.forEach(item => {
        item.addEventListener('click', () => {
          sortItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          const s = item.getAttribute('data-sort');
          if (sortLabel) sortLabel.textContent = item.textContent;
          store.setSort(s);
        });
      });
    }

    // Reset Button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.hidden = true;
        store.reset();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

fs.writeFileSync('assets/js/bundle.js', bundleJs);
console.log('Saved authentic Pinterest Create Pin bundle.js successfully!');
