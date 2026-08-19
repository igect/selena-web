/**
 * Selena Media Archive — UI Profile & Boards Component
 * Deep module managing user profile header, board collections, and saved/created tabs.
 */

import { CONFIG } from '../config.js';
import { BoardsAPI } from '../api/boards.js';
import { PinsAPI } from '../api/pins.js';
import { getSupabase } from '../api/supabase.js';

export function createProfileUI({
  container,
  getUser,
  onAuthRequired,
  onUserUpdated,
  onEditClick,
  onShareClick,
  onBoardClick,
  onPinClick,
  onTabChange
}) {
  const avatarImg = container.querySelector('.p-profile-avatar-large img');
  const nameEl = container.querySelector('.p-profile-name');
  const handleEl = container.querySelector('.p-profile-handle');
  const pinsCountEl = container.querySelector('#pProfilePinsCount');
  const savedCountEl = container.querySelector('#pProfileSavedCount');
  const followingCountEl = container.querySelector('#pProfileFollowingCount');

  const shareBtn = container.querySelector('#pShareProfileBtn');
  const editBtn = container.querySelector('#pEditProfileBtn');

  const tabBoards = container.querySelector('#pTabBoards');
  const tabSaved = container.querySelector('#pTabSaved');
  const tabCreated = container.querySelector('#pTabCreated');

  const boardsGrid = container.querySelector('#pProfileBoardsGrid');
  const pinsGrid = container.querySelector('#pProfileGrid');

  let activeTab = 'boards';

  function init() {
    if (tabBoards) {
      tabBoards.addEventListener('click', () => {
        setActiveTab('boards');
        if (onTabChange) onTabChange('boards');
      });
    }
    if (tabSaved) {
      tabSaved.addEventListener('click', () => {
        setActiveTab('saved');
        if (onTabChange) onTabChange('saved');
      });
    }
    if (tabCreated) {
      tabCreated.addEventListener('click', () => {
        setActiveTab('created');
        if (onTabChange) onTabChange('created');
      });
    }

    if (editBtn) {
      editBtn.addEventListener('click', async () => {
        const user = getUser ? getUser() : null;
        if (!user) {
          if (onAuthRequired) onAuthRequired();
          return;
        }

        if (onEditClick) {
          onEditClick();
        }
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const user = getUser ? getUser() : null;
        const name = nameEl?.textContent || user?.user_metadata?.name || 'Selena Member';
        const handle = user?.user_metadata?.handle || user?.email?.split('@')[0] || 'member';
        if (onShareClick) {
          onShareClick({
            title: `${name} (@${handle}) on Selena`,
            description: `View ${name}'s aesthetic moodboards and saved collections on Selena Archive.`,
            pageUrl: `${window.location.origin}/profile`,
            mediaUrl: user?.user_metadata?.avatar_url || null,
            imageUrl: user?.user_metadata?.avatar_url || null
          });
        } else {
          const url = `${window.location.origin}/profile`;
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            alert('Profile link copied to clipboard!');
          }
        }
      });
    }
  }

  function renderUser(user) {
    if (!user) {
      if (nameEl) nameEl.textContent = 'Guest Visitor';
      if (handleEl) handleEl.textContent = 'Log in to save aesthetics & create custom moodboards';
      if (avatarImg) avatarImg.src = CONFIG.DEFAULT_IMAGE_URL;
      if (editBtn) {
        editBtn.textContent = 'Log In';
        editBtn.hidden = false;
      }
      return;
    }

    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Selena Member';
    const handle = `@${user.user_metadata?.handle || user.email?.split('@')[0] || 'member'}`;
    const avatar = user.user_metadata?.avatar_url || CONFIG.DEFAULT_IMAGE_URL;

    if (nameEl) nameEl.textContent = name;
    if (handleEl) handleEl.textContent = handle;
    if (avatarImg) avatarImg.src = avatar;
    if (editBtn) {
      editBtn.textContent = 'Edit profile';
      editBtn.hidden = false;
    }
  }

  function setCounts(pins = 0, saved = 0, following = 0) {
    if (pinsCountEl) pinsCountEl.textContent = pins;
    if (savedCountEl) savedCountEl.textContent = saved;
    if (followingCountEl) followingCountEl.textContent = following;
  }

  function setActiveTab(tab) {
    activeTab = tab;
    if (tabBoards) tabBoards.classList.toggle('active', tab === 'boards');
    if (tabSaved) tabSaved.classList.toggle('active', tab === 'saved');
    if (tabCreated) tabCreated.classList.toggle('active', tab === 'created');

    if (boardsGrid) boardsGrid.hidden = tab !== 'boards';
    if (pinsGrid) pinsGrid.hidden = tab === 'boards';
  }

  function renderBoards(boards = []) {
    if (!boardsGrid) return;
    if (boards.length === 0) {
      boardsGrid.innerHTML = '<p class="p-empty-tab">No curated boards found.</p>';
      return;
    }

    boardsGrid.innerHTML = boards.map(b => {
      const thumb = b.cover_image_url || CONFIG.DEFAULT_IMAGE_URL;

      return `
        <div class="p-board-card" data-board-id="${b.id}" tabindex="0" role="button">
          <div class="p-board-preview">
            <img src="${thumb}" alt="${escapeHtml(b.name)}" class="p-board-thumb-img" loading="lazy" />
          </div>
          <div class="p-board-details">
            <h3 class="p-board-name">${escapeHtml(b.name)}</h3>
            <p class="p-board-meta">Curated Collection &rarr;</p>
          </div>
        </div>
      `;
    }).join('');

    boardsGrid.querySelectorAll('.p-board-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-board-id');
        if (onBoardClick) onBoardClick(id);
      });
    });
  }

  async function renderTabPins(mode, savedPinIds = [], userId = null) {
    if (!pinsGrid) return;
    pinsGrid.innerHTML = '<p class="p-loading-tab">Loading pins...</p>';

    try {
      let pins = [];
      if (mode === 'saved') {
        if (savedPinIds.length === 0) {
          pinsGrid.innerHTML = '<p class="p-empty-tab">No saved pins yet.</p>';
          return;
        }
        const res = await PinsAPI.fetchPins({ onlySaved: true, savedPinIds, pageSize: 50 });
        pins = res.pins || [];
      } else if (mode === 'created') {
        if (!userId) {
          pinsGrid.innerHTML = '<p class="p-empty-tab">Log in to view created pins.</p>';
          return;
        }
        const res = await PinsAPI.fetchPins({ userId, pageSize: 50 });
        pins = res.pins || [];
      }

      if (pins.length === 0) {
        pinsGrid.innerHTML = `<p class="p-empty-tab">No ${mode} pins found.</p>`;
        return;
      }

      pinsGrid.innerHTML = pins.map(pin => `
        <article class="p-pin-card" data-id="${pin.id}" tabindex="0">
          <div class="p-pin-media">
            <img src="${pin.img}" alt="${escapeHtml(pin.title)}" class="p-pin-img" loading="lazy" />
          </div>
          <div class="p-pin-info">
            <h3 class="p-pin-title">${escapeHtml(pin.title)}</h3>
          </div>
        </article>
      `).join('');

      pinsGrid.querySelectorAll('.p-pin-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.getAttribute('data-id');
          if (onPinClick) onPinClick(id);
        });
      });
    } catch (err) {
      console.error('[Profile] Pin load error:', err);
      pinsGrid.innerHTML = '<p class="p-empty-tab">Failed to load pins.</p>';
    }
  }

  init();

  return {
    renderUser,
    setCounts,
    setActiveTab,
    renderBoards,
    renderTabPins
  };
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
