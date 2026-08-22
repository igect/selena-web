/**
 * Selena Media Archive — UI Pin Detail Modal
 * Deep module managing lightbox, high-res photo stage, reactions, comments, downloads, and related pins.
 */

import { CONFIG } from '../config.js';
import { PinsAPI } from '../api/pins.js';

export function createPinModal({
  modalEl,
  onClose,
  onSaveClick,
  onReactionClick,
  onCreatorClick,
  onRelatedPinClick,
  onCommentSubmit,
  onShareClick,
  getUser = () => null,
  onAuthRequired = () => {}
}) {
  const scrim = modalEl.querySelector('#pModalScrim') || modalEl.querySelector('.p-modal-backdrop');
  const closeBtn = modalEl.querySelector('#pCloseModalBtn');
  const imgEl = modalEl.querySelector('#pDetailImg');
  const titleEl = modalEl.querySelector('#pDetailTitle');
  const descEl = modalEl.querySelector('#pDetailDesc');
  const dateEl = modalEl.querySelector('#pDetailDate');
  const creatorAvatar = modalEl.querySelector('#pDetailCreatorAvatar');
  const creatorName = modalEl.querySelector('#pDetailCreatorName');
  const creatorFollowers = modalEl.querySelector('#pDetailCreatorFollowers');
  const followBtn = modalEl.querySelector('#pFollowBtn');
  const saveBtn = modalEl.querySelector('#pDetailSaveBtn');
  const downloadBtn = modalEl.querySelector('#pDetailDownloadBtn');
  const shareBtn = modalEl.querySelector('#pDetailShareBtn');
  const destLinkBtn = modalEl.querySelector('#pDetailLinkBtn');

  const rxButtons = modalEl.querySelectorAll('.p-reaction-btn');
  const rxCountLove = modalEl.querySelector('#pRxCountLove');
  const rxCountSparkle = modalEl.querySelector('#pRxCountSparkle');
  const rxCountFire = modalEl.querySelector('#pRxCountFire');

  const commentsSection = modalEl.querySelector('.p-comments-section');
  const commentInput = modalEl.querySelector('.p-comment-input');
  const commentSendBtn = modalEl.querySelector('.p-comment-send-btn');
  const relatedGrid = modalEl.querySelector('.p-related-pins-grid');

  let currentPin = null;
  let isReacting = false;

  function init() {
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (scrim) scrim.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modalEl.hidden) {
        close();
      }
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (currentPin && onSaveClick) onSaveClick(currentPin.id);
      });
    }

    if (followBtn) {
      followBtn.addEventListener('click', async () => {
        if (currentPin && onCreatorClick) {
          const nowFollowing = await onCreatorClick(currentPin.creator);
          if (typeof nowFollowing === 'boolean') {
            updateFollowState(nowFollowing);
          }
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (currentPin?.img) downloadMedia(currentPin.img, `${currentPin.title || 'pin'}.jpg`);
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (!currentPin) return;
        if (onShareClick) {
          onShareClick({
            title: currentPin.title || 'Selena Pin',
            description: currentPin.description || '',
            pageUrl: `${window.location.origin}/pin/${currentPin.id}`,
            mediaUrl: currentPin.img || currentPin.media_url,
            imageUrl: currentPin.img || currentPin.media_url
          });
        } else {
          shareMedia(currentPin);
        }
      });
    }

    rxButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        if (isReacting || !currentPin) return;
        const type = btn.getAttribute('data-reaction');
        if (!type || !onReactionClick) return;

        isReacting = true;
        btn.style.opacity = '0.6';
        try {
          const nowActive = await onReactionClick(currentPin.id, type);
          if (typeof nowActive === 'boolean') {
            btn.classList.toggle('active', nowActive);
          }
          await loadReactionCounts(currentPin.id);
        } finally {
          btn.style.opacity = '1';
          isReacting = false;
        }
      });
    });

    if (commentSendBtn && commentInput) {
      const send = async () => {
        const user = getUser();
        if (!user) {
          if (onAuthRequired) onAuthRequired();
          return;
        }

        const text = commentInput.value.trim();
        if (!text || !currentPin) return;

        try {
          commentSendBtn.disabled = true;
          if (onCommentSubmit) {
            const success = await onCommentSubmit(currentPin.id, text);
            if (success) {
              commentInput.value = '';
              loadComments(currentPin.id);
            }
          }
        } catch (err) {
          console.error('[Modal] Comment error:', err);
        } finally {
          commentSendBtn.disabled = false;
        }
      };

      commentSendBtn.addEventListener('click', send);
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') send();
      });

      commentInput.addEventListener('focus', () => {
        const user = getUser();
        if (!user && onAuthRequired) {
          commentInput.blur();
          onAuthRequired();
        }
      });
    }
  }

  function open(pin, isSaved = false, activeReactions = {}, isFollowing = false) {
    currentPin = pin;
    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';

    const scrollable = modalEl.querySelector('.p-detail-scrollable');
    if (scrollable) scrollable.scrollTop = 0;

    if (imgEl) {
      imgEl.src = pin.img;
      imgEl.alt = pin.title || 'Pin';
    }
    if (titleEl) titleEl.textContent = pin.title || 'Untitled Pin';
    if (descEl) descEl.textContent = pin.description || '';
    if (dateEl) dateEl.textContent = pin.date ? `Saved · ${pin.date}` : 'Curated Pin';
    if (creatorAvatar) creatorAvatar.src = pin.creatorAvatar || CONFIG.DEFAULT_IMAGE_URL;
    if (creatorName) creatorName.textContent = pin.creatorName || 'Creator';

    if (creatorFollowers) {
      if (pin.creatorFollowers && pin.creatorFollowers > 0) {
        creatorFollowers.textContent = `${formatNumber(pin.creatorFollowers)} followers`;
        creatorFollowers.hidden = false;
      } else {
        creatorFollowers.textContent = '';
        creatorFollowers.hidden = true;
      }
    }

    updateSaveState(isSaved);
    updateFollowState(isFollowing);
    updateReactionsState(activeReactions);
    loadReactionCounts(pin.id);

    if (destLinkBtn) {
      if (pin.destinationLink) {
        destLinkBtn.hidden = false;
        destLinkBtn.href = pin.destinationLink;
      } else {
        destLinkBtn.hidden = true;
      }
    }

    loadComments(pin.id);
    loadRelated(pin.id, pin.creator);

    // Focus trap setup
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    modalEl.hidden = true;
    document.body.style.overflow = '';
    currentPin = null;
    if (onClose) onClose();
  }

  function updateSaveState(isSaved) {
    if (saveBtn) {
      saveBtn.textContent = isSaved ? 'Saved' : 'Save';
      saveBtn.classList.toggle('saved', isSaved);
      saveBtn.setAttribute('aria-label', isSaved ? 'Unsave pin' : 'Save pin');
    }
  }

  function updateFollowState(isFollowing) {
    if (followBtn) {
      followBtn.textContent = isFollowing ? 'Following' : 'Follow';
      followBtn.classList.toggle('following', isFollowing);
    }
  }

  function updateReactionsState(activeReactions = {}) {
    rxButtons.forEach(btn => {
      const type = btn.getAttribute('data-reaction');
      btn.classList.toggle('active', Boolean(activeReactions[type]));
    });
  }

  function getCurrentPinId() {
    return currentPin?.id || null;
  }

  async function loadReactionCounts(pinId) {
    try {
      const counts = await PinsAPI.fetchReactionCounts(pinId);
      if (rxCountLove) rxCountLove.textContent = counts.love || 0;
      if (rxCountSparkle) rxCountSparkle.textContent = counts.sparkle || 0;
      if (rxCountFire) rxCountFire.textContent = counts.fire || 0;
    } catch {
      if (rxCountLove) rxCountLove.textContent = 0;
      if (rxCountSparkle) rxCountSparkle.textContent = 0;
      if (rxCountFire) rxCountFire.textContent = 0;
    }
  }

  async function loadComments(pinId) {
    if (!commentsSection) return;
    try {
      const comments = await PinsAPI.fetchComments(pinId);
      const header = `<span class="p-comments-title">Comments (${comments.length})</span>`;
      if (comments.length === 0) {
        commentsSection.innerHTML = header + '<p class="p-no-comments">No comments yet. Share your thoughts!</p>';
        return;
      }
      commentsSection.innerHTML = header + '<div class="p-comments-list">' + comments.map(c => `
        <div class="p-comment-item">
          <img src="${CONFIG.resolveImageUrl(c.user_avatar)}" alt="${escapeHtml(c.user_name)}" class="p-comment-avatar" />
          <div class="p-comment-body">
            <strong>${escapeHtml(c.user_name)}</strong>
            <p>${escapeHtml(c.content)}</p>
          </div>
        </div>
      `).join('') + '</div>';
    } catch {
      commentsSection.innerHTML = '<span class="p-comments-title">Comments (0)</span>';
    }
  }

  async function loadRelated(pinId, creatorId) {
    if (!relatedGrid) return;
    try {
      const related = await PinsAPI.fetchRelatedPins(pinId, creatorId, 6);
      if (related.length === 0) {
        relatedGrid.innerHTML = '';
        return;
      }
      relatedGrid.innerHTML = related.map(p => `
        <div class="p-related-card" data-id="${p.id}" tabindex="0" role="button" aria-label="${escapeHtml(p.title)}">
          <img src="${p.img}" alt="${escapeHtml(p.title)}" loading="lazy" />
        </div>
      `).join('');

      relatedGrid.querySelectorAll('.p-related-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.getAttribute('data-id');
          if (onRelatedPinClick) onRelatedPinClick(id);
        });
      });
    } catch {
      relatedGrid.innerHTML = '';
    }
  }

  init();

  return {
    open,
    close,
    updateSaveState,
    updateFollowState,
    updateReactionsState,
    getCurrentPinId
  };
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatNumber(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

async function downloadMedia(url, filename) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(url, '_blank');
  }
}

async function shareMedia(pin) {
  const url = `${window.location.origin}/pin/${pin.id}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: pin.title, url });
    } catch {}
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  }
}
