const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('assets/js/archive-data.json', 'utf8'));

// 1. Generate assets/js/data.js
const dataJs = `/**
 * Selena Archive — Full Media Dataset (1,620 items)
 */

export const MEDIA_ITEMS = ${JSON.stringify(data.items, null, 2)};

export const CREATORS = [
  { id: "all", label: "All", count: ${data.counts.all} },
  { id: "rose", label: "Rosé", count: ${data.counts.rose} },
  { id: "sharly", label: "Sharly Modak", count: ${data.counts.sharly} },
  { id: "yamu", label: "Yamu", count: ${data.counts.yamu} }
];
`;

fs.writeFileSync('assets/js/data.js', dataJs);
console.log('Saved assets/js/data.js');

// 2. Generate assets/js/bundle.js
const bundleJs = `/**
 * Selena Archive — Universal Standalone Bundle (1,620 Photos)
 * Matches user-specified DOM template with 100% offline file:// compatibility
 */

(function () {
  'use strict';

  // 1. Curated Media Dataset (1,620 Photos)
  const MEDIA_ITEMS = ${JSON.stringify(data.items)};
  const COUNTS = ${JSON.stringify(data.counts)};

  // 2. Reactive Store
  function createStore() {
    let rawItems = [...MEDIA_ITEMS];
    let favorites = new Set();
    try {
      const saved = localStorage.getItem('selena_favs');
      if (saved) JSON.parse(saved).forEach(id => favorites.add(id));
    } catch (e) {}

    let state = {
      creator: 'all',
      query: '',
      onlyFavs: false,
      sort: 'newest',
      layout: 'masonry'
    };

    const listeners = new Set();

    function getFiltered() {
      const q = state.query.trim().toLowerCase();
      return rawItems
        .filter(item => {
          if (state.creator !== 'all' && item.creator !== state.creator) return false;
          if (state.onlyFavs && !favorites.has(item.id)) return false;
          if (q) {
            const matchTitle = item.title.toLowerCase().includes(q);
            const matchCreator = item.creatorName.toLowerCase().includes(q);
            if (!matchTitle && !matchCreator) return false;
          }
          return true;
        })
        .sort((a, b) => {
          if (state.sort === 'newest') return new Date(b.date) - new Date(a.date);
          if (state.sort === 'oldest') return new Date(a.date) - new Date(b.date);
          if (state.sort === 'popular') {
            const fa = favorites.has(a.id) ? 1 : 0;
            const fb = favorites.has(b.id) ? 1 : 0;
            return fb - fa || new Date(b.date) - new Date(a.date);
          }
          return 0;
        });
    }

    function notify() {
      const filtered = getFiltered();
      const snap = {
        filtered,
        total: rawItems.length,
        favCount: favorites.size,
        state: { ...state }
      };
      listeners.forEach(fn => fn(snap));
    }

    return {
      getState: () => ({ filtered: getFiltered(), total: rawItems.length, favCount: favorites.size, state: { ...state } }),
      setCreator: (creator) => { state.creator = creator; notify(); },
      setQuery: (q) => { state.query = q; notify(); },
      setSort: (s) => { state.sort = s; notify(); },
      setLayout: (l) => { state.layout = l; notify(); },
      toggleFavFilter: () => { state.onlyFavs = !state.onlyFavs; notify(); },
      reset: () => { state.creator = 'all'; state.query = ''; state.onlyFavs = false; notify(); },
      toggleFav: (id) => {
        if (favorites.has(id)) favorites.delete(id);
        else favorites.add(id);
        try { localStorage.setItem('selena_favs', JSON.stringify(Array.from(favorites))); } catch (e) {}
        notify();
      },
      isFav: (id) => favorites.has(id),
      subscribe: (fn) => {
        listeners.add(fn);
        fn({ filtered: getFiltered(), total: rawItems.length, favCount: favorites.size, state: { ...state } });
      }
    };
  }

  // 3. Card Renderer
  function renderCard(item, isFav, index) {
    const num = String(index + 1).padStart(3, '0');
    return \`
      <article class="card" data-id="\${item.id}" tabindex="0" role="button" aria-label="\${item.title}">
        <div class="card-img-box">
          <img src="\${item.img}" alt="\${item.title}" class="card-img" loading="lazy" />
          
          <button class="card-fav \${isFav ? 'is-fav' : ''}" data-action="fav" data-id="\${item.id}" title="Save" aria-label="Favorite">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <div class="card-caption">
            <span class="card-creator-tag">\${item.creatorName}</span>
            <span class="card-num">\${num}</span>
          </div>
        </div>
      </article>
    \`;
  }

  // 4. Cinema Pro Lightbox
  function createCinema(dom, store) {
    let playlist = [];
    let curIdx = 0;
    let playing = false;
    let duration = 3600;
    let startTime = null;
    let animId = null;

    function renderFilmstrip() {
      if (!dom.strip) return;
      const start = Math.max(0, curIdx - 20);
      const end = Math.min(playlist.length, curIdx + 21);
      const slice = playlist.slice(start, end);

      dom.strip.innerHTML = slice.map((item, idx) => {
        const realIdx = start + idx;
        return \`
          <button class="filmstrip-thumb \${realIdx === curIdx ? 'active' : ''}" data-index="\${realIdx}" aria-label="Slide \${realIdx + 1}">
            <img src="\${item.img}" alt="" draggable="false" loading="lazy" />
          </button>
        \`;
      }).join('');

      const active = dom.strip.querySelector('.filmstrip-thumb.active');
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
      if (dom.index) dom.index.textContent = \`\${String(curIdx + 1).padStart(2, '0')} of \${String(playlist.length).padStart(2, '0')}\`;
      if (dom.fav) dom.fav.classList.toggle('is-fav', store.isFav(item.id));

      renderFilmstrip();
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
        const playIcon = dom.play.querySelector('.play-icon');
        const pauseIcon = dom.play.querySelector('.pause-icon');
        const label = dom.play.querySelector('.play-label');
        if (playIcon) playIcon.hidden = true;
        if (pauseIcon) pauseIcon.hidden = false;
        if (label) label.textContent = 'Pause';
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
        const playIcon = dom.play.querySelector('.play-icon');
        const pauseIcon = dom.play.querySelector('.pause-icon');
        const label = dom.play.querySelector('.play-label');
        if (playIcon) playIcon.hidden = false;
        if (pauseIcon) pauseIcon.hidden = true;
        if (label) label.textContent = 'Play';
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

    if (dom.fav) {
      dom.fav.addEventListener('click', () => {
        if (playlist.length > 0) {
          const item = playlist[curIdx];
          store.toggleFav(item.id);
          dom.fav.classList.toggle('is-fav', store.isFav(item.id));
        }
      });
    }

    if (dom.strip) {
      dom.strip.addEventListener('click', (e) => {
        const btn = e.target.closest('.filmstrip-thumb');
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
        else if (e.key === 'ArrowRight' || e.key === 'l') next();
        else if (e.key === 'ArrowLeft' || e.key === 'h') prev();
        else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
        else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      }
    });

    return { open, close, isOpen: () => !dom.overlay.hidden };
  }

  // 5. Main App Setup
  function init() {
    const store = createStore();
    const gallery = document.getElementById('gallery');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const creatorTabs = document.querySelectorAll('.creator-tab');
    const favBtn = document.getElementById('favoritesBtn');
    const favCount = document.getElementById('favCount');
    const visibleCount = document.getElementById('visibleCount');
    const themeBtn = document.getElementById('themeBtn');
    const sortBtn = document.getElementById('sortBtn');
    const sortMenu = document.getElementById('sortMenu');
    const sortLabel = document.getElementById('sortLabel');
    const sortItems = document.querySelectorAll('.dropdown-item');
    const resetBtn = document.getElementById('resetBtn');
    const cinemaBtn = document.getElementById('cinemaBtn');
    const viewMasonry = document.getElementById('viewMasonry');
    const viewGrid = document.getElementById('viewGrid');

    const cinema = createCinema({
      overlay: document.getElementById('cinema'),
      progress: document.getElementById('cinemaProgress'),
      creator: document.getElementById('cinemaCreator'),
      index: document.getElementById('cinemaIndex'),
      fav: document.getElementById('cinemaFav'),
      play: document.getElementById('cinemaPlay'),
      fullscreen: document.getElementById('cinemaFullscreen'),
      close: document.getElementById('cinemaClose'),
      prev: document.getElementById('cinemaPrev'),
      img: document.getElementById('cinemaImg'),
      next: document.getElementById('cinemaNext'),
      strip: document.getElementById('filmstrip')
    }, store);

    // Theme Management
    const savedTheme = localStorage.getItem('selena_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('selena_theme', next);
      });
    }

    // Dynamic Creator Tab Counts
    creatorTabs.forEach(tab => {
      const c = tab.getAttribute('data-creator');
      const countEl = tab.querySelector('.count');
      if (countEl && COUNTS[c] !== undefined) {
        countEl.textContent = COUNTS[c].toLocaleString();
      }
    });

    // Virtual / Incremental Rendering for 1,620 items
    let currentRenderedCount = 0;
    const PAGE_SIZE = 48;
    let activeList = [];

    function renderMore() {
      if (currentRenderedCount >= activeList.length) return;
      const nextSlice = activeList.slice(currentRenderedCount, currentRenderedCount + PAGE_SIZE);
      const html = nextSlice.map((item, idx) => renderCard(item, store.isFav(item.id), currentRenderedCount + idx)).join('');
      gallery.insertAdjacentHTML('beforeend', html);
      currentRenderedCount += nextSlice.length;
    }

    // Scroll listener for infinite scroll
    window.addEventListener('scroll', () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
        renderMore();
      }
    }, { passive: true });

    // Subscribe Store State
    store.subscribe((snap) => {
      activeList = snap.filtered;
      currentRenderedCount = 0;
      gallery.innerHTML = '';

      if (favCount) {
        favCount.textContent = snap.favCount;
        favCount.hidden = snap.favCount === 0;
      }
      if (visibleCount) visibleCount.textContent = snap.filtered.length.toLocaleString();
      if (favBtn) favBtn.classList.toggle('active', snap.state.onlyFavs);

      if (snap.filtered.length === 0) {
        if (emptyState) emptyState.hidden = false;
      } else {
        if (emptyState) emptyState.hidden = true;
        renderMore();
      }

      creatorTabs.forEach(tab => {
        const c = tab.getAttribute('data-creator');
        const isActive = c === snap.state.creator;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    });

    // Gallery Card Clicks
    gallery.addEventListener('click', (e) => {
      const favAction = e.target.closest('[data-action="fav"]');
      if (favAction) {
        e.stopPropagation();
        store.toggleFav(favAction.getAttribute('data-id'));
        return;
      }

      const card = e.target.closest('.card');
      if (card) {
        const id = card.getAttribute('data-id');
        const list = store.getState().filtered;
        const idx = list.findIndex(i => i.id === id);
        if (idx !== -1) cinema.open(list, idx);
      }
    });

    // Creator Tabs
    creatorTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        store.setCreator(tab.getAttribute('data-creator'));
      });
    });

    // Search Input
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        store.setQuery(e.target.value);
      });
    }

    // Global '/' search hotkey
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !cinema.isOpen() && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput && searchInput.focus();
      }
    });

    // Favorites Filter
    if (favBtn) favBtn.addEventListener('click', () => store.toggleFavFilter());

    // Sort Menu
    if (sortBtn && sortMenu) {
      sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = sortMenu.hidden;
        sortMenu.hidden = !isHidden;
        sortBtn.setAttribute('aria-expanded', isHidden);
      });

      document.addEventListener('click', () => {
        sortMenu.hidden = true;
        sortBtn.setAttribute('aria-expanded', 'false');
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

    // Layout Toggle
    if (viewMasonry && viewGrid) {
      viewMasonry.addEventListener('click', () => {
        viewMasonry.classList.add('active');
        viewGrid.classList.remove('active');
        gallery.className = 'gallery masonry';
      });
      viewGrid.addEventListener('click', () => {
        viewGrid.classList.add('active');
        viewMasonry.classList.remove('active');
        gallery.className = 'gallery uniform';
      });
    }

    // Cinema Launch Button
    if (cinemaBtn) {
      cinemaBtn.addEventListener('click', () => {
        const list = store.getState().filtered;
        if (list.length > 0) cinema.open(list, 0);
      });
    }

    // Reset Button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
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
console.log('Saved assets/js/bundle.js successfully with all 1,620 photos!');
