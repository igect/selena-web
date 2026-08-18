const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('assets/js/archive-data.json', 'utf8'));

const bundleJs = `/**
 * Selena — Pinterest Clone Engine (1,620 Pins)
 * 100% Offline file:// Standalone Compatibility
 */

(function () {
  'use strict';

  const PINS = ${JSON.stringify(data.items)};
  const COUNTS = ${JSON.stringify(data.counts)};

  // 1. Reactive Pinterest Store
  function createStore() {
    let rawPins = [...PINS];
    let savedPins = new Set();
    let reactions = {};

    try {
      const saved = localStorage.getItem('pinterest_saved_pins');
      if (saved) JSON.parse(saved).forEach(id => savedPins.add(id));
      const rx = localStorage.getItem('pinterest_reactions');
      if (rx) reactions = JSON.parse(rx);
    } catch (e) {}

    let state = {
      creator: 'all',
      query: '',
      onlySaved: false,
      sort: 'newest'
    };

    const listeners = new Set();

    function getFiltered() {
      const q = state.query.trim().toLowerCase();
      return rawPins
        .filter(pin => {
          if (state.creator !== 'all' && pin.creator !== state.creator) return false;
          if (state.onlySaved && !savedPins.has(pin.id)) return false;
          if (q) {
            const matchTitle = pin.title.toLowerCase().includes(q);
            const matchCreator = pin.creatorName.toLowerCase().includes(q);
            if (!matchTitle && !matchCreator) return false;
          }
          return true;
        })
        .sort((a, b) => {
          if (state.sort === 'newest') return new Date(b.date) - new Date(a.date);
          if (state.sort === 'oldest') return new Date(a.date) - new Date(b.date);
          if (state.sort === 'popular') {
            const sa = savedPins.has(a.id) ? 1 : 0;
            const sb = savedPins.has(b.id) ? 1 : 0;
            return sb - sa || new Date(b.date) - new Date(a.date);
          }
          return 0;
        });
    }

    function notify() {
      const filtered = getFiltered();
      const snap = {
        filtered,
        total: rawPins.length,
        savedCount: savedPins.size,
        state: { ...state }
      };
      listeners.forEach(fn => fn(snap));
    }

    return {
      getState: () => ({ filtered: getFiltered(), total: rawPins.length, savedCount: savedPins.size, state: { ...state } }),
      setCreator: (creator) => { state.creator = creator; notify(); },
      setQuery: (q) => { state.query = q; notify(); },
      setSort: (s) => { state.sort = s; notify(); },
      toggleSavedFilter: () => { state.onlySaved = !state.onlySaved; notify(); },
      reset: () => { state.creator = 'all'; state.query = ''; state.onlySaved = false; notify(); },
      toggleSave: (id) => {
        if (savedPins.has(id)) savedPins.delete(id);
        else savedPins.add(id);
        try { localStorage.setItem('pinterest_saved_pins', JSON.stringify(Array.from(savedPins))); } catch (e) {}
        notify();
      },
      isSaved: (id) => savedPins.has(id),
      getReactions: (id) => reactions[id] || { love: 0, sparkle: 0, fire: 0 },
      addReaction: (id, type) => {
        if (!reactions[id]) reactions[id] = { love: 0, sparkle: 0, fire: 0 };
        reactions[id][type] = (reactions[id][type] || 0) + 1;
        try { localStorage.setItem('pinterest_reactions', JSON.stringify(reactions)); } catch (e) {}
      },
      subscribe: (fn) => {
        listeners.add(fn);
        fn({ filtered: getFiltered(), total: rawPins.length, savedCount: savedPins.size, state: { ...state } });
      }
    };
  }

  // 2. Pinterest Pin Card Renderer
  function renderPinCard(pin, isSaved, index) {
    return \`
      <div class="pin-card" data-id="\${pin.id}" tabindex="0" role="button" aria-label="\${pin.title}">
        <div class="pin-image-wrapper">
          <img src="\${pin.img}" alt="\${pin.title}" class="pin-img" loading="lazy" />
          
          <div class="pin-overlay">
            <div class="overlay-top">
              <span class="collection-tag">\${pin.creatorName}</span>
              <button class="btn-pin-save \${isSaved ? 'is-saved' : ''}" data-action="save" data-id="\${pin.id}">
                \${isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
            <div class="overlay-bottom">
              <button class="btn-pin-action" data-action="share" title="Share" aria-label="Share">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
              </button>
              <button class="btn-pin-action" data-action="more" title="More" aria-label="More">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="pin-meta-footer">
          <h4 class="pin-title-text">\${pin.title}</h4>
          <div class="pin-creator-row">
            <div class="creator-mini-avatar">
              <img src="assets/images/logo.png" alt="\${pin.creatorName}" />
            </div>
            <span class="creator-mini-name">\${pin.creatorName}</span>
          </div>
        </div>
      </div>
    \`;
  }

  // 3. Cinema Player Engine
  function createCinemaPlayer(dom, store) {
    let playlist = [];
    let curIdx = 0;
    let playing = false;
    let duration = 3600;
    let startTime = null;
    let animId = null;

    function renderRibbon() {
      if (!dom.strip) return;
      const start = Math.max(0, curIdx - 20);
      const end = Math.min(playlist.length, curIdx + 21);
      const slice = playlist.slice(start, end);

      dom.strip.innerHTML = slice.map((item, idx) => {
        const realIdx = start + idx;
        return \`
          <button class="ribbon-thumb \${realIdx === curIdx ? 'active' : ''}" data-index="\${realIdx}" aria-label="Slide \${realIdx + 1}">
            <img src="\${item.img}" alt="" draggable="false" loading="lazy" />
          </button>
        \`;
      }).join('');

      const active = dom.strip.querySelector('.ribbon-thumb.active');
      if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    function update() {
      if (playlist.length === 0) return;
      const item = playlist[curIdx];

      if (dom.img) {
        dom.img.style.opacity = '0';
        dom.img.src = item.img;
        dom.img.alt = item.title;
        dom.img.onload = () => { dom.img.style.opacity = '1'; };
      }

      if (dom.creator) dom.creator.textContent = item.creatorName;
      if (dom.index) dom.index.textContent = \`\${String(curIdx + 1).padStart(2, '0')} of \${playlist.length.toLocaleString()}\`;

      renderRibbon();
      if (playing) resetTimer();
    }

    function tick(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);

      if (dom.progress) dom.progress.style.width = \`\${pct}%\`;

      if (elapsed >= duration) {
        next();
      } else if (playing) {
        animId = requestAnimationFrame(tick);
      }
    }

    function resetTimer() {
      if (animId) cancelAnimationFrame(animId);
      if (dom.progress) dom.progress.style.width = '0%';
      startTime = null;
      if (playing) {
        animId = requestAnimationFrame(tick);
      }
    }

    function startPlay() {
      playing = true;
      if (dom.play) {
        const playIcon = dom.play.querySelector('.icon-play');
        const pauseIcon = dom.play.querySelector('.icon-pause');
        const text = dom.play.querySelector('.cinema-play-text');
        if (playIcon) playIcon.hidden = true;
        if (pauseIcon) pauseIcon.hidden = false;
        if (text) text.textContent = 'Pause';
      }
      resetTimer();
    }

    function stopPlay() {
      playing = false;
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      startTime = null;
      if (dom.progress) dom.progress.style.width = '0%';
      if (dom.play) {
        const playIcon = dom.play.querySelector('.icon-play');
        const pauseIcon = dom.play.querySelector('.icon-pause');
        const text = dom.play.querySelector('.cinema-play-text');
        if (playIcon) playIcon.hidden = false;
        if (pauseIcon) pauseIcon.hidden = true;
        if (text) text.textContent = 'Play';
      }
    }

    function togglePlay() {
      if (playing) stopPlay();
      else startPlay();
    }

    function next() {
      if (playlist.length === 0) return;
      curIdx = (curIdx + 1) % playlist.length;
      update();
    }

    function prev() {
      if (playlist.length === 0) return;
      curIdx = (curIdx - 1 + playlist.length) % playlist.length;
      update();
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
    }

    function open(items, idx = 0) {
      if (!items || items.length === 0) return;
      playlist = [...items];
      curIdx = Math.max(0, Math.min(idx, playlist.length - 1));
      update();
      dom.overlay.hidden = false;
      document.body.classList.add('modal-open');
      startPlay();
    }

    function close() {
      stopPlay();
      dom.overlay.hidden = true;
      document.body.classList.remove('modal-open');
    }

    if (dom.close) dom.close.addEventListener('click', close);
    if (dom.next) dom.next.addEventListener('click', next);
    if (dom.prev) dom.prev.addEventListener('click', prev);
    if (dom.play) dom.play.addEventListener('click', togglePlay);
    if (dom.fullscreen) dom.fullscreen.addEventListener('click', toggleFullscreen);

    if (dom.strip) {
      dom.strip.addEventListener('click', (e) => {
        const btn = e.target.closest('.ribbon-thumb');
        if (btn) {
          const i = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(i)) {
            curIdx = i;
            update();
          }
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (!dom.overlay.hidden) {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight') next();
        else if (e.key === 'ArrowLeft') prev();
        else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
        else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      }
    });

    return { open, close, isOpen: () => !dom.overlay.hidden };
  }

  // 4. Pinterest Split Detail Modal Controller
  function createDetailModal(dom, store, cinema) {
    let currentPin = null;

    function open(pin) {
      currentPin = pin;
      dom.img.src = pin.img;
      dom.title.textContent = pin.title;
      dom.date.textContent = 'Added to Selena Archive · ' + pin.date;
      dom.creatorName.textContent = pin.creatorName;
      
      const isSaved = store.isSaved(pin.id);
      dom.saveBtn.textContent = isSaved ? 'Saved' : 'Save';
      dom.saveBtn.classList.toggle('is-saved', isSaved);

      dom.overlay.hidden = false;
      document.body.classList.add('modal-open');
    }

    function close() {
      dom.overlay.hidden = true;
      document.body.classList.remove('modal-open');
    }

    if (dom.closeBtn) dom.closeBtn.addEventListener('click', close);
    if (dom.backdrop) dom.backdrop.addEventListener('click', close);

    if (dom.saveBtn) {
      dom.saveBtn.addEventListener('click', () => {
        if (currentPin) {
          store.toggleSave(currentPin.id);
          const isSaved = store.isSaved(currentPin.id);
          dom.saveBtn.textContent = isSaved ? 'Saved' : 'Save';
          dom.saveBtn.classList.toggle('is-saved', isSaved);
        }
      });
    }

    if (dom.cinemaLaunch) {
      dom.cinemaLaunch.addEventListener('click', () => {
        if (currentPin) {
          close();
          const list = store.getState().filtered;
          const idx = list.findIndex(p => p.id === currentPin.id);
          cinema.open(list, idx !== -1 ? idx : 0);
        }
      });
    }

    if (dom.fullscreenBtn) {
      dom.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      });
    }

    // Reaction clicks
    const reactionBtns = dom.overlay.querySelectorAll('.btn-reaction');
    reactionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-reaction');
        const numSpan = btn.querySelector('.reaction-num');
        if (numSpan && currentPin) {
          const cur = parseInt(numSpan.textContent, 10) || 0;
          numSpan.textContent = cur + 1;
          btn.classList.add('active');
          store.addReaction(currentPin.id, type);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (!dom.overlay.hidden && e.key === 'Escape') close();
    });

    return { open, close, isOpen: () => !dom.overlay.hidden };
  }

  // 5. Main App Setup
  function init() {
    const store = createStore();
    const gallery = document.getElementById('pinGallery');
    const emptyState = document.getElementById('pinEmptyState');
    const searchInput = document.getElementById('pinSearchInput');
    const clearSearchBtn = document.getElementById('pinSearchClear');
    const chips = document.querySelectorAll('.chip');
    const savedNavBtn = document.getElementById('pinSavedBtn');
    const favBadge = document.getElementById('pinFavBadge');
    const visibleCount = document.getElementById('pinVisibleCount');
    const themeBtn = document.getElementById('themeToggleBtn');
    const sortBtn = document.getElementById('sortDropdownBtn');
    const sortMenu = document.getElementById('sortDropdownMenu');
    const sortLabel = document.getElementById('sortDropdownLabel');
    const sortItems = document.querySelectorAll('.menu-item');
    const resetBtn = document.getElementById('pinResetBtn');
    const cinemaNavBtn = document.getElementById('navCinemaBtn');
    const homeNavBtn = document.getElementById('navHomeBtn');
    const exploreNavBtn = document.getElementById('navExploreBtn');

    const cinema = createCinemaPlayer({
      overlay: document.getElementById('cinemaModal'),
      progress: document.getElementById('cinemaTimerFill'),
      creator: document.getElementById('cinemaPlayerCreator'),
      index: document.getElementById('cinemaPlayerIndex'),
      play: document.getElementById('cinemaPlayBtn'),
      fullscreen: document.getElementById('cinemaFullscreenBtn'),
      close: document.getElementById('cinemaCloseBtn'),
      prev: document.getElementById('cinemaPrevBtn'),
      img: document.getElementById('cinemaPlayerImg'),
      next: document.getElementById('cinemaNextBtn'),
      strip: document.getElementById('cinemaFilmstrip')
    }, store);

    const detailModal = createDetailModal({
      overlay: document.getElementById('pinDetailModal'),
      backdrop: document.getElementById('modalBackdrop'),
      closeBtn: document.getElementById('closeDetailBtn'),
      img: document.getElementById('detailImg'),
      title: document.getElementById('detailTitle'),
      date: document.getElementById('detailDate'),
      creatorName: document.getElementById('detailCreatorName'),
      saveBtn: document.getElementById('detailSaveBtn'),
      fullscreenBtn: document.getElementById('detailFullscreenBtn'),
      cinemaLaunch: document.getElementById('openInCinemaBtn')
    }, store, cinema);

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

    // Dynamic Counts in Filter Chips
    chips.forEach(chip => {
      const c = chip.getAttribute('data-creator');
      const countEl = chip.querySelector('.chip-count');
      if (countEl && COUNTS[c] !== undefined) {
        countEl.textContent = COUNTS[c].toLocaleString();
      }
    });

    // 60fps Infinite Scroll Virtual Paging
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

      if (favBadge) {
        favBadge.textContent = snap.savedCount;
        favBadge.hidden = snap.savedCount === 0;
      }
      if (visibleCount) {
        visibleCount.innerHTML = '<strong>' + snap.filtered.length.toLocaleString() + '</strong> Pins';
      }
      if (savedNavBtn) savedNavBtn.classList.toggle('active', snap.state.onlySaved);

      if (snap.filtered.length === 0) {
        if (emptyState) emptyState.hidden = false;
      } else {
        if (emptyState) emptyState.hidden = true;
        renderMore();
      }

      chips.forEach(chip => {
        const c = chip.getAttribute('data-creator');
        const isActive = c === snap.state.creator;
        chip.classList.toggle('active', isActive);
      });
    });

    // Pin Card Clicks
    gallery.addEventListener('click', (e) => {
      const saveBtn = e.target.closest('[data-action="save"]');
      if (saveBtn) {
        e.stopPropagation();
        const id = saveBtn.getAttribute('data-id');
        store.toggleSave(id);
        const isSaved = store.isSaved(id);
        saveBtn.textContent = isSaved ? 'Saved' : 'Save';
        saveBtn.classList.toggle('is-saved', isSaved);
        return;
      }

      const card = e.target.closest('.pin-card');
      if (card) {
        const id = card.getAttribute('data-id');
        const list = store.getState().filtered;
        const pin = list.find(p => p.id === id);
        if (pin) detailModal.open(pin);
      }
    });

    // Chips Filter
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        store.setCreator(chip.getAttribute('data-creator'));
      });
    });

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

    // Global '/' search hotkey
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !cinema.isOpen() && !detailModal.isOpen() && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput && searchInput.focus();
      }
    });

    // Saved Pins Filter
    if (savedNavBtn) savedNavBtn.addEventListener('click', () => store.toggleSavedFilter());

    // Sort Menu
    if (sortBtn && sortMenu) {
      sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = sortMenu.hidden;
        sortMenu.hidden = !isHidden;
      });

      document.addEventListener('click', () => {
        sortMenu.hidden = true;
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

    // Nav Cinema Button
    if (cinemaNavBtn) {
      cinemaNavBtn.addEventListener('click', () => {
        const list = store.getState().filtered;
        if (list.length > 0) cinema.open(list, 0);
      });
    }

    // Nav Home / Explore buttons
    if (homeNavBtn) {
      homeNavBtn.addEventListener('click', () => {
        homeNavBtn.classList.add('active');
        if (exploreNavBtn) exploreNavBtn.classList.remove('active');
        store.reset();
      });
    }

    if (exploreNavBtn) {
      exploreNavBtn.addEventListener('click', () => {
        exploreNavBtn.classList.add('active');
        if (homeNavBtn) homeNavBtn.classList.remove('active');
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
console.log('Saved Pinterest bundle.js with 1,620 pins successfully!');
