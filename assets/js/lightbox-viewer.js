/**
 * Selena Archive — Cinema Lightbox & Modal Viewer
 * Fullscreen luxury viewer with filmstrip navigation, archival EXIF specs, and color palette swatches
 */

export function createLightboxViewer(domElements, callbacks = {}) {
  const {
    modal,
    modalImg,
    modalTitle,
    modalDesc,
    modalDate,
    modalTag,
    modalCounter,
    playBtn,
    prevBtn,
    nextBtn,
    closeBtn,
    modalFavBtn,
    modalTagsContainer,
    modalAccession,
    modalMedium,
    modalLocation,
    modalCuratorNotes,
    modalPaletteContainer,
    filmstripContainer
  } = domElements;

  const { onFavoriteToggle = () => {}, isFavorite = () => false } = callbacks;

  let playlist = [];
  let currentIndex = 0;
  let isPlaying = false;
  let timerId = null;
  let activeKeyHandler = null;

  function renderFilmstrip() {
    if (!filmstripContainer || playlist.length === 0) return;

    filmstripContainer.innerHTML = playlist.map((item, idx) => `
      <button class="filmstrip-thumb-btn ${idx === currentIndex ? 'active' : ''}" data-index="${idx}" aria-label="Jump to slide ${idx + 1}: ${item.title}">
        <img src="${item.img}" alt="${item.title}" class="filmstrip-thumb-img" loading="lazy" />
        <span class="filmstrip-thumb-num">${String(idx + 1).padStart(2, '0')}</span>
      </button>
    `).join('');

    // Ensure active thumbnail is scrolled into view smoothly
    const activeThumb = filmstripContainer.querySelector('.filmstrip-thumb-btn.active');
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  function updateSlideUI() {
    if (playlist.length === 0) return;
    const item = playlist[currentIndex];

    // Image & Preloading
    if (modalImg) {
      modalImg.style.opacity = '0';
      modalImg.src = item.img;
      modalImg.alt = item.title;
      modalImg.onload = () => {
        modalImg.style.opacity = '1';
      };
    }

    if (modalTitle) modalTitle.textContent = item.title;
    if (modalDesc) modalDesc.textContent = item.description || '';
    if (modalDate) modalDate.textContent = item.formattedDate || item.date || '';
    if (modalAccession) modalAccession.textContent = item.accession || `ACC-${item.id}`;
    if (modalMedium) modalMedium.textContent = item.medium || 'Curated Archival Specimen';
    if (modalLocation) modalLocation.textContent = item.location || 'Archival Studio';
    if (modalCuratorNotes) modalCuratorNotes.textContent = item.curatorNotes || item.description || '';

    if (modalTag) {
      modalTag.textContent = item.badge || 'ARCHIVE';
      modalTag.className = `modal-badge modal-badge-${item.badgeType || 'highlight'}`;
    }

    if (modalCounter) {
      modalCounter.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(playlist.length).padStart(2, '0')}`;
    }

    // Modal Favorite Heart State
    if (modalFavBtn) {
      const fav = isFavorite(item.id);
      modalFavBtn.classList.toggle('is-favorite', fav);
      modalFavBtn.setAttribute('aria-label', fav ? 'Remove from favorites' : 'Add to favorites');
    }

    // Tags list in modal
    if (modalTagsContainer && item.tags) {
      modalTagsContainer.innerHTML = item.tags
        .map(t => `<span class="modal-tag-pill">#${t}</span>`)
        .join('');
    }

    // Palette swatches
    if (modalPaletteContainer && item.palette) {
      modalPaletteContainer.innerHTML = `
        <span class="palette-label">CHROMA SPECTRUM</span>
        <div class="palette-swatches">
          ${item.palette.map(hex => `<span class="palette-swatch" style="background-color: ${hex};" title="${hex}"></span>`).join('')}
        </div>
      `;
    }

    renderFilmstrip();
  }

  function startAutoplay() {
    stopAutoplay();
    isPlaying = true;
    if (playBtn) {
      playBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" class="control-icon"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        <span>Pause</span>
      `;
    }
    timerId = setInterval(() => {
      next();
    }, 4200);
  }

  function stopAutoplay() {
    isPlaying = false;
    clearInterval(timerId);
    timerId = null;
    if (playBtn) {
      playBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" class="control-icon"><polygon points="5,3 19,12 5,21"/></svg>
        <span>Play</span>
      `;
    }
  }

  function next() {
    if (playlist.length === 0) return;
    currentIndex = (currentIndex + 1) % playlist.length;
    updateSlideUI();
    if (isPlaying) startAutoplay();
  }

  function prev() {
    if (playlist.length === 0) return;
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    updateSlideUI();
    if (isPlaying) startAutoplay();
  }

  function togglePlay() {
    if (isPlaying) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  }

  function bindKeyboard() {
    unbindKeyboard();
    activeKeyHandler = (e) => {
      if (modal.classList.contains('is-open') || modal.style.display === 'flex') {
        if (e.key === 'Escape') {
          close();
        } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
          next();
        } else if (e.key === 'ArrowLeft' || e.key === 'h' || e.key === 'H') {
          prev();
        } else if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          togglePlay();
        }
      }
    };
    document.addEventListener('keydown', activeKeyHandler);
  }

  function unbindKeyboard() {
    if (activeKeyHandler) {
      document.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
  }

  function open(items, initialIndex = 0) {
    if (!items || items.length === 0) return;
    playlist = [...items];
    currentIndex = Math.max(0, Math.min(initialIndex, playlist.length - 1));

    updateSlideUI();
    modal.classList.add('is-open');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    bindKeyboard();
    startAutoplay();
  }

  function close() {
    stopAutoplay();
    unbindKeyboard();
    modal.classList.remove('is-open');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  // Setup DOM listeners
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);
  if (playBtn) playBtn.addEventListener('click', togglePlay);

  if (filmstripContainer) {
    filmstripContainer.addEventListener('click', (e) => {
      const thumbBtn = e.target.closest('.filmstrip-thumb-btn');
      if (thumbBtn) {
        const idx = parseInt(thumbBtn.getAttribute('data-index'), 10);
        if (!isNaN(idx) && idx >= 0 && idx < playlist.length) {
          currentIndex = idx;
          updateSlideUI();
          if (isPlaying) startAutoplay();
        }
      }
    });
  }

  if (modalFavBtn) {
    modalFavBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (playlist.length > 0) {
        const item = playlist[currentIndex];
        onFavoriteToggle(item.id);
        const fav = isFavorite(item.id);
        modalFavBtn.classList.toggle('is-favorite', fav);
      }
    });
  }

  // Close when clicking modal backdrop outside dialog
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('lightbox-backdrop')) {
        close();
      }
    });
  }

  return {
    open,
    close,
    next,
    prev,
    togglePlay,
    goTo(index) {
      if (index >= 0 && index < playlist.length) {
        currentIndex = index;
        updateSlideUI();
        if (isPlaying) startAutoplay();
      }
    },
    isOpen() {
      return modal.classList.contains('is-open') || modal.style.display === 'flex';
    },
    getCurrentItem() {
      return playlist[currentIndex] || null;
    }
  };
}
