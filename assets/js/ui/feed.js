/**
 * Selena Media Archive — UI Feed Component
 * Renders high-performance masonry pin cards with bookmarking, error states, and interaction triggers.
 */

export function createFeedUI({ container, onPinClick, onSaveClick, onRetry, onReset }) {
  function renderPins(pins, append = false, savedPinIds = []) {
    if (!container) return;

    if (!append) {
      container.innerHTML = '';
    }

    if (!pins || pins.length === 0) {
      if (!append) {
        container.innerHTML = `
          <div class="p-empty-state">
            <div class="p-empty-icon">🔍</div>
            <h2 class="p-empty-title">No Pins Found</h2>
            <p class="p-empty-desc">We couldn't find any pins matching your active search or filters.</p>
            <button class="p-btn-red" id="pFeedResetBtn">Explore all Pins</button>
          </div>
        `;
        const resetBtn = container.querySelector('#pFeedResetBtn');
        if (resetBtn && typeof onReset === 'function') {
          resetBtn.addEventListener('click', onReset);
        }
      }
      return;
    }

    const fragment = document.createDocumentFragment();

    pins.forEach(pin => {
      const isSaved = savedPinIds.includes(pin.id);
      const card = document.createElement('article');
      card.className = 'p-pin-card';
      card.setAttribute('data-id', pin.id);
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${pin.title || 'Pin'} by ${pin.creatorName}`);

      const aspectStyle = pin.aspectRatio ? `style="aspect-ratio: ${pin.aspectRatio};"` : '';

      card.innerHTML = `
        <div class="p-pin-media" ${aspectStyle}>
          <img
            src="${pin.img}"
            alt="${escapeHtml(pin.title)}"
            class="p-pin-img"
            loading="lazy"
            decoding="async"
          />
          <div class="p-pin-overlay">
            <button class="p-pin-save-btn ${isSaved ? 'saved' : ''}" data-pin-id="${pin.id}" aria-label="${isSaved ? 'Unsave pin' : 'Save pin'}">
              ${isSaved ? 'Saved' : 'Save'}
            </button>
            ${pin.destinationLink ? `
              <a href="${escapeHtml(pin.destinationLink)}" target="_blank" rel="noopener noreferrer" class="p-pin-link-pill" onclick="event.stopPropagation()">
                ↗ ${extractDomain(pin.destinationLink)}
              </a>
            ` : ''}
          </div>
        </div>
        <div class="p-pin-info">
          <h3 class="p-pin-title">${escapeHtml(pin.title)}</h3>
          <div class="p-pin-creator">
            <img src="${pin.creatorAvatar}" alt="${escapeHtml(pin.creatorName)}" class="p-creator-avatar" />
            <span class="p-creator-name">${escapeHtml(pin.creatorName)}</span>
          </div>
        </div>
      `;

      // Save button click
      const saveBtn = card.querySelector('.p-pin-save-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSaveClick) onSaveClick(pin.id);
        });
      }

      // Card body click
      card.addEventListener('click', () => {
        if (onPinClick) onPinClick(pin.id);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onPinClick) onPinClick(pin.id);
        }
      });

      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }

  function renderSkeletons(count = 8) {
    if (!container) return;
    container.innerHTML = Array.from({ length: count }).map(() => `
      <div class="p-pin-skeleton">
        <div class="p-skeleton-media"></div>
        <div class="p-skeleton-text"></div>
        <div class="p-skeleton-text short"></div>
      </div>
    `).join('');
  }

  function renderError(message = 'Failed to load media catalog.', retryHandler = null) {
    if (!container) return;
    container.innerHTML = `
      <div class="p-empty-state p-error-state">
        <div class="p-empty-icon">⚠️</div>
        <h2 class="p-empty-title">Connection Error</h2>
        <p class="p-empty-desc">${escapeHtml(message)}</p>
        <button class="p-btn-red p-retry-btn" id="pFeedRetryBtn">Try Again</button>
      </div>
    `;

    const btn = container.querySelector('#pFeedRetryBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (typeof retryHandler === 'function') retryHandler();
        else if (typeof onRetry === 'function') onRetry();
      });
    }
  }

  function updateSaveButtonState(pinId, isSaved) {
    if (!container) return;
    const btns = container.querySelectorAll(`.p-pin-save-btn[data-pin-id="${pinId}"]`);
    btns.forEach(btn => {
      btn.textContent = isSaved ? 'Saved' : 'Save';
      btn.classList.toggle('saved', isSaved);
      btn.setAttribute('aria-label', isSaved ? 'Unsave pin' : 'Save pin');
    });
  }

  return {
    renderPins,
    renderSkeletons,
    renderError,
    updateSaveButtonState
  };
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}
