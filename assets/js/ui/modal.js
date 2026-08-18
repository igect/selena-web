/**
 * Selena Media Archive — UI Pin Detail Modal
 * Deep module managing lightbox, high-res photo stage, reactions, comments, downloads, and related pins.
 */

import { PinsAPI } from '../api/pins.js';

export function createPinModal({
  modalEl,
  onClose,
  onSaveClick,
  onReactionClick,
  onCreatorClick,
  onRelatedPinClick,
  onCommentSubmit
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
      followBtn.addEventListener('click', () => {
        if (currentPin && onCreatorClick) onCreatorClick(currentPin.creator);
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (currentPin?.img) downloadMedia(currentPin.img, `${currentPin.title || 'pin'}.jpg`);
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (currentPin) shareMedia(currentPin);
      });
    }

    rxButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.getAttribute('data-reaction');
        if (currentPin && onReactionClick && type) {
          await onReactionClick(currentPin.id, type);
          loadReactionCounts(currentPin.id);
        }
      });
    });

    if (commentSendBtn && commentInput) {
      const send = async () => {
        const text = commentInput.value.trim();
        if (!text || !currentPin) return;
        try {
          if (onCommentSubmit) {
            const success = await onCommentSubmit(currentPin.id, text);
            if (success) {
              commentInput.value = '';
              loadComments(currentPin.id);
            }
          }
        } catch (err) {
          console.error('[Modal] Comment error:', err);
        }
      };

      commentSendBtn.addEventListener('click', send);
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') send();
      });
    }
  }

  function open(pin, isSaved = false, activeReactions = {}, isFollowing = false) {
    currentPin = pin;
    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';

    if (imgEl) {
      imgEl.src = pin.img;
      imgEl.alt = pin.title || 'Pin';
    }
    if (titleEl) titleEl.textContent = pin.title || 'Untitled Pin';
    if (descEl) descEl.textContent = pin.description || '';
    if (dateEl) dateEl.textContent = pin.date ? `Saved · ${pin.date}` : 'Curated Pin';
    if (creatorAvatar) creatorAvatar.src = pin.creatorAvatar || 'assets/images/logo.png';
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
          <img src="${c.user_avatar || 'assets/images/logo.png'}" alt="${escapeHtml(c.user_name)}" class="p-comment-avatar" />
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
        <div class="p-related-card" data-id="${p.id}" tabindex="0">
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
    updateReactionsState
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

function downloadMedia(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function shareMedia(pin) {
  const url = `${window.location.origin}${window.location.pathname}#/pin/${pin.id}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: pin.title, url });
    } catch {}
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  }
}
