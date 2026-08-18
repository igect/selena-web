/**
 * Selena Media Archive — UI Create Pin Modal
 * Deep module managing pin upload dropzone, live preview, board selector, and submission.
 */

import { BoardsAPI } from '../api/boards.js';
import { PinsAPI } from '../api/pins.js';

export function createPinModalUI({
  modalEl,
  onPinCreated,
  getUser
}) {
  const scrim = modalEl.querySelector('#pCreateScrim');
  const closeBtn = modalEl.querySelector('#pCloseCreateBtn');
  const dropzone = modalEl.querySelector('#pDropzone');
  const fileInput = modalEl.querySelector('#pFileInput');
  const dropPlaceholder = modalEl.querySelector('#pDropPlaceholder');
  const previewWrapper = modalEl.querySelector('#pPreviewWrapper');
  const previewImg = modalEl.querySelector('#pUploadPreview');
  const removePreviewBtn = modalEl.querySelector('#pRemovePreviewBtn');

  const titleInput = modalEl.querySelector('#pCreateTitle');
  const descInput = modalEl.querySelector('#pCreateDesc');
  const linkInput = modalEl.querySelector('#pCreateLink');
  const submitBtn = modalEl.querySelector('#pSubmitPinBtn');

  const boardSelectBtn = modalEl.querySelector('#pBoardSelectBtn');
  const boardLabel = modalEl.querySelector('#pSelectedBoardLabel');
  const boardDropdown = modalEl.querySelector('#pBoardDropdown');
  const boardList = modalEl.querySelector('#pBoardList');
  const boardSearch = modalEl.querySelector('#pBoardSearchInput');
  const openInlineBoardBtn = modalEl.querySelector('#pOpenInlineBoardBtn');
  const inlineBoardForm = modalEl.querySelector('#pInlineBoardForm');
  const newBoardNameInput = modalEl.querySelector('#pNewBoardNameInput');
  const saveNewBoardBtn = modalEl.querySelector('#pSaveNewBoardBtn');
  const cancelNewBoardBtn = modalEl.querySelector('#pCancelNewBoardBtn');

  let selectedFile = null;
  let selectedBoardId = null;
  let currentBoards = [];

  function init() {
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (scrim) scrim.addEventListener('click', close);

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (!e.target.closest('#pRemovePreviewBtn')) fileInput.click();
      });
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files?.length) handleFile(e.dataTransfer.files[0]);
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files?.length) handleFile(e.target.files[0]);
      });
    }

    if (removePreviewBtn) {
      removePreviewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFile();
      });
    }

    // Board Dropdown Toggle
    if (boardSelectBtn && boardDropdown) {
      boardSelectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        boardDropdown.hidden = !boardDropdown.hidden;
      });
    }

    document.addEventListener('click', (e) => {
      if (boardDropdown && !e.target.closest('.p-board-picker-anchor')) {
        boardDropdown.hidden = true;
      }
    });

    if (boardSearch) {
      boardSearch.addEventListener('input', () => {
        const query = boardSearch.value.toLowerCase().trim();
        renderBoardItems(currentBoards.filter(b => b.name.toLowerCase().includes(query)));
      });
    }

    if (openInlineBoardBtn && inlineBoardForm) {
      openInlineBoardBtn.addEventListener('click', () => {
        inlineBoardForm.hidden = false;
        if (newBoardNameInput) newBoardNameInput.focus();
      });
    }

    if (cancelNewBoardBtn && inlineBoardForm) {
      cancelNewBoardBtn.addEventListener('click', () => {
        inlineBoardForm.hidden = true;
        if (newBoardNameInput) newBoardNameInput.value = '';
      });
    }

    if (saveNewBoardBtn && newBoardNameInput) {
      saveNewBoardBtn.addEventListener('click', async () => {
        const name = newBoardNameInput.value.trim();
        if (!name) return;
        try {
          const user = typeof getUser === 'function' ? getUser() : null;
          if (!user) {
            alert('Please log in to create a board.');
            return;
          }
          const board = await BoardsAPI.createBoard(name, user.id);
          currentBoards.push(board);
          selectBoard(board.id, board.name);
          inlineBoardForm.hidden = true;
          newBoardNameInput.value = '';
          if (boardDropdown) boardDropdown.hidden = true;
        } catch (err) {
          alert('Failed to create board: ' + err.message);
        }
      });
    }

    // Tag pills
    modalEl.querySelectorAll('.p-tag-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const tag = pill.getAttribute('data-tag');
        if (descInput && tag) {
          descInput.value = descInput.value ? `${descInput.value} #${tag}` : `#${tag}`;
        }
      });
    });

    // Publish Pin
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        if (!selectedFile) {
          alert('Please choose an image for your pin.');
          return;
        }

        const title = titleInput?.value?.trim() || 'Untitled Pin';
        const description = descInput?.value?.trim() || '';
        const destinationLink = linkInput?.value?.trim() || null;
        const user = typeof getUser === 'function' ? getUser() : null;

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Publishing...';

          const pinData = {
            title,
            description,
            creator: 'rose',
            creatorId: 'rose',
            boardId: selectedBoardId,
            userId: user?.id || null,
            destinationLink
          };

          const created = await PinsAPI.createPin(pinData, selectedFile);
          close();
          if (onPinCreated) onPinCreated(created);
        } catch (err) {
          alert('Upload failed: ' + err.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Publish';
        }
      });
    }
  }

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WebP).');
      return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewImg) previewImg.src = e.target.result;
      if (previewWrapper) previewWrapper.hidden = false;
      if (dropPlaceholder) dropPlaceholder.hidden = true;
    };
    reader.readAsDataURL(file);
  }

  function clearFile() {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    if (previewImg) previewImg.src = '';
    if (previewWrapper) previewWrapper.hidden = true;
    if (dropPlaceholder) dropPlaceholder.hidden = false;
  }

  function renderBoardItems(boards) {
    if (!boardList) return;
    boardList.innerHTML = boards.map(b => `
      <div class="p-board-item" data-board-id="${b.id}" data-board-name="${escapeHtml(b.name)}">
        <span>${escapeHtml(b.name)}</span>
        ${b.id === selectedBoardId ? '<span class="p-check-icon">✓</span>' : ''}
      </div>
    `).join('');

    boardList.querySelectorAll('.p-board-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-board-id');
        const name = item.getAttribute('data-board-name');
        selectBoard(id, name);
        if (boardDropdown) boardDropdown.hidden = true;
      });
    });
  }

  function selectBoard(id, name) {
    selectedBoardId = id;
    if (boardLabel) boardLabel.textContent = name;
    renderBoardItems(currentBoards);
  }

  function open(creators = [], boards = []) {
    clearFile();
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (linkInput) linkInput.value = '';

    currentBoards = boards || [];
    selectedBoardId = null;
    if (boardLabel) boardLabel.textContent = 'Choose a board';
    renderBoardItems(currentBoards);

    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modalEl.hidden = true;
    document.body.style.overflow = '';
  }

  init();

  return {
    open,
    close
  };
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
