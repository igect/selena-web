/**
 * Selena Media Archive — UI Admin CMS Component
 * Deep module managing administration dashboard, catalog table, editor drawer, media uploads, and batch actions.
 */

import { AdminAPI } from '../api/admin.js';

export function createAdminUI({
  container,
  onPinSaved
}) {
  const metricsGrid = container.querySelector('#pAdminMetrics');
  const searchInput = container.querySelector('#pAdminSearch');
  const creatorFilter = container.querySelector('#pAdminCreatorFilter');
  const statusFilter = container.querySelector('#pAdminStatusFilter');
  const newPinBtn = container.querySelector('#pAdminNewPinBtn');
  const tableBody = container.querySelector('#pAdminTableBody');
  const selectAllCheck = container.querySelector('#pAdminSelectAll');

  const batchToolbar = container.querySelector('#pAdminBatchToolbar');
  const batchCountEl = container.querySelector('.p-batch-count');
  const batchPublishBtn = container.querySelector('#pAdminBatchPublish');
  const batchDraftBtn = container.querySelector('#pAdminBatchDraft');
  const batchDeleteBtn = container.querySelector('#pAdminBatchDelete');

  const prevPageBtn = container.querySelector('#pAdminPrevPage');
  const nextPageBtn = container.querySelector('#pAdminNextPage');
  const paginationInfo = container.querySelector('#pAdminPaginationInfo');

  const drawerModal = document.getElementById('pAdminDrawerModal');
  const drawerCloseBtn = document.getElementById('pAdminCloseDrawer');
  const drawerScrim = document.getElementById('pAdminDrawerScrim');
  const drawerForm = document.getElementById('pAdminDrawerForm');
  const drawerTitle = document.getElementById('pAdminDrawerTitle');
  const submitBtn = document.getElementById('pAdminSubmitBtn');

  const fileInput = document.getElementById('pAdminFileInput');
  const dropzone = document.getElementById('pAdminDropzone');
  const previewWrapper = document.getElementById('pAdminPreviewWrapper');
  const previewImg = document.getElementById('pAdminPreviewImg');
  const removePreviewBtn = document.getElementById('pAdminRemovePreview');

  let editingPinId = null;
  let selectedFile = null;
  let availableBoards = [];
  let currentPage = 1;
  const pageSize = 20;
  let totalCount = 0;
  let selectedPinIds = new Set();

  function init() {
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
    if (drawerScrim) drawerScrim.addEventListener('click', closeDrawer);

    if (newPinBtn) {
      newPinBtn.addEventListener('click', () => openEditor(null));
    }

    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          currentPage = 1;
          loadTable();
        }, 300);
      });
    }

    if (creatorFilter) creatorFilter.addEventListener('change', () => { currentPage = 1; loadTable(); });
    if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; loadTable(); });

    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          loadTable();
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        if (currentPage * pageSize < totalCount) {
          currentPage++;
          loadTable();
        }
      });
    }

    if (selectAllCheck) {
      selectAllCheck.addEventListener('change', () => {
        const checks = tableBody?.querySelectorAll('.p-pin-check') || [];
        checks.forEach(c => {
          c.checked = selectAllCheck.checked;
          const id = c.getAttribute('data-id');
          if (id) {
            if (selectAllCheck.checked) selectedPinIds.add(id);
            else selectedPinIds.delete(id);
          }
        });
        updateBatchToolbar();
      });
    }

    if (batchPublishBtn) {
      batchPublishBtn.addEventListener('click', async () => {
        if (!selectedPinIds.size) return;
        try {
          await AdminAPI.batchPublish(Array.from(selectedPinIds), true);
          selectedPinIds.clear();
          loadMetrics();
          loadTable();
          if (onPinSaved) onPinSaved();
        } catch (err) {
          alert('Batch publish failed: ' + err.message);
        }
      });
    }

    if (batchDraftBtn) {
      batchDraftBtn.addEventListener('click', async () => {
        if (!selectedPinIds.size) return;
        try {
          await AdminAPI.batchPublish(Array.from(selectedPinIds), false);
          selectedPinIds.clear();
          loadMetrics();
          loadTable();
          if (onPinSaved) onPinSaved();
        } catch (err) {
          alert('Batch unpublish failed: ' + err.message);
        }
      });
    }

    if (batchDeleteBtn) {
      batchDeleteBtn.addEventListener('click', async () => {
        if (!selectedPinIds.size) return;
        if (confirm(`Delete ${selectedPinIds.size} pins permanently?`)) {
          try {
            await AdminAPI.batchDelete(Array.from(selectedPinIds));
            selectedPinIds.clear();
            loadMetrics();
            loadTable();
            if (onPinSaved) onPinSaved();
          } catch (err) {
            alert('Batch delete failed: ' + err.message);
          }
        }
      });
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (!e.target.closest('#pAdminRemovePreview')) fileInput.click();
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files?.length) handleFile(e.target.files[0]);
      });
    }

    if (removePreviewBtn) {
      removePreviewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile = null;
        if (fileInput) fileInput.value = '';
        if (previewImg) previewImg.src = '';
        if (previewWrapper) previewWrapper.hidden = true;
      });
    }

    if (drawerForm) {
      drawerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('pAdminInputTitle')?.value?.trim();
        const description = document.getElementById('pAdminInputDesc')?.value?.trim() || '';
        const creator_id = document.getElementById('pAdminSelectCreator')?.value || 'yamu';
        const board_id = document.getElementById('pAdminSelectBoard')?.value || null;
        const destination_link = document.getElementById('pAdminInputLink')?.value?.trim() || null;
        const tags = (document.getElementById('pAdminInputTags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
        const is_published = document.getElementById('pAdminCheckPublished')?.checked ?? true;
        const is_featured = document.getElementById('pAdminCheckFeatured')?.checked ?? false;

        if (!title) {
          alert('Pin title is required.');
          return;
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
          }

          const pinData = {
            title,
            description,
            creator_id,
            board_id,
            destination_link,
            tags,
            is_published,
            is_featured
          };

          if (editingPinId) {
            await AdminAPI.updateAdminPin(editingPinId, pinData, selectedFile);
          } else {
            if (!selectedFile) {
              alert('Please select an image for new pin.');
              return;
            }
            await AdminAPI.createAdminPin(pinData, selectedFile);
          }

          closeDrawer();
          loadMetrics();
          loadTable();
          if (onPinSaved) onPinSaved();
        } catch (err) {
          alert('Failed to save pin: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Publish Pin';
          }
        }
      });
    }
  }

  function updateBatchToolbar() {
    const count = selectedPinIds.size;
    if (batchToolbar) batchToolbar.hidden = count === 0;
    if (batchCountEl) batchCountEl.textContent = `${count} selected`;
  }

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewImg) previewImg.src = e.target.result;
      if (previewWrapper) previewWrapper.hidden = false;
    };
    reader.readAsDataURL(file);
  }

  async function loadMetrics() {
    if (!metricsGrid) return;
    try {
      const m = await AdminAPI.fetchDashboardMetrics();
      metricsGrid.innerHTML = `
        <div class="p-metric-card">
          <span class="p-metric-num">${m.totalPins}</span>
          <span class="p-metric-label">Total Pins</span>
        </div>
        <div class="p-metric-card">
          <span class="p-metric-num">${m.publishedPins}</span>
          <span class="p-metric-label">Published</span>
        </div>
        <div class="p-metric-card">
          <span class="p-metric-num">${m.draftPins}</span>
          <span class="p-metric-label">Drafts</span>
        </div>
        <div class="p-metric-card">
          <span class="p-metric-num">${m.totalSaves}</span>
          <span class="p-metric-label">Total Saves</span>
        </div>
      `;
    } catch (err) {
      console.error('[Admin] Metrics error:', err);
    }
  }

  async function loadTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="7" class="p-table-loading">Loading catalog...</td></tr>';

    try {
      const search = searchInput?.value?.trim() || '';
      const creator = creatorFilter?.value || 'all';
      const status = statusFilter?.value || 'all';

      const res = await AdminAPI.fetchAdminPins({ page: currentPage, pageSize, search, creator, status });
      const pins = res.pins || [];
      totalCount = res.totalCount || 0;

      // Update Pagination Info
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      if (paginationInfo) paginationInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalCount} pins)`;
      if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
      if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;

      if (selectAllCheck) selectAllCheck.checked = false;
      selectedPinIds.clear();
      updateBatchToolbar();

      if (pins.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="p-table-empty">No pins matching search criteria.</td></tr>';
        return;
      }

      tableBody.innerHTML = pins.map(p => `
        <tr data-id="${p.id}">
          <td class="p-col-check"><input type="checkbox" class="p-pin-check" data-id="${p.id}" aria-label="Select pin"></td>
          <td class="p-col-thumb"><img src="${p.image_url}" alt="${escapeHtml(p.title)}" class="p-table-thumb" /></td>
          <td class="p-col-title">
            <strong>${escapeHtml(p.title)}</strong>
            ${p.destination_link ? `<br><small><a href="${escapeHtml(p.destination_link)}" target="_blank" rel="noopener noreferrer">↗ Link</a></small>` : ''}
          </td>
          <td class="p-col-creator">${escapeHtml(p.creators?.name || p.creator_id)}</td>
          <td class="p-col-board">${escapeHtml(p.boards?.name || 'General')}</td>
          <td class="p-col-status">
            <span class="p-status-pill ${p.is_published ? 'pub' : 'draft'}">
              ${p.is_published ? 'Published' : 'Draft'}
            </span>
          </td>
          <td class="p-col-actions">
            <button class="p-btn-action edit" data-action="edit" data-id="${p.id}">Edit</button>
            <button class="p-btn-action delete" data-action="delete" data-id="${p.id}" data-path="${p.image_path || ''}">Delete</button>
          </td>
        </tr>
      `).join('');

      tableBody.querySelectorAll('.p-pin-check').forEach(c => {
        c.addEventListener('change', () => {
          const id = c.getAttribute('data-id');
          if (id) {
            if (c.checked) selectedPinIds.add(id);
            else selectedPinIds.delete(id);
          }
          updateBatchToolbar();
        });
      });

      tableBody.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const match = pins.find(p => p.id === id);
          if (match) openEditor(match);
        });
      });

      tableBody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const path = btn.getAttribute('data-path');
          if (confirm('Delete this pin permanently?')) {
            try {
              await AdminAPI.deleteAdminPin(id, path);
              loadMetrics();
              loadTable();
              if (onPinSaved) onPinSaved();
            } catch (err) {
              alert('Delete failed: ' + err.message);
            }
          }
        });
      });
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7" class="p-table-error">Failed to load: ${err.message}</td></tr>`;
    }
  }

  function openEditor(pin = null) {
    editingPinId = pin ? pin.id : null;
    selectedFile = null;
    if (drawerTitle) drawerTitle.textContent = pin ? 'Edit Pin' : 'Create New Pin';
    if (drawerForm) drawerForm.reset();

    const boardSelect = document.getElementById('pAdminSelectBoard');
    if (boardSelect) {
      boardSelect.innerHTML = '<option value="">General Collection</option>' + availableBoards.map(b => `
        <option value="${b.id}">${escapeHtml(b.name)}</option>
      `).join('');
    }

    if (pin) {
      const titleIn = document.getElementById('pAdminInputTitle');
      const descIn = document.getElementById('pAdminInputDesc');
      const creatorIn = document.getElementById('pAdminSelectCreator');
      const linkIn = document.getElementById('pAdminInputLink');
      const tagsIn = document.getElementById('pAdminInputTags');
      const pubIn = document.getElementById('pAdminCheckPublished');
      const featIn = document.getElementById('pAdminCheckFeatured');

      if (titleIn) titleIn.value = pin.title || '';
      if (descIn) descIn.value = pin.description || '';
      if (creatorIn) creatorIn.value = pin.creator_id || 'yamu';
      if (linkIn) linkIn.value = pin.destination_link || '';
      if (tagsIn) tagsIn.value = (pin.tags || []).join(', ');
      if (pubIn) pubIn.checked = pin.is_published !== false;
      if (featIn) featIn.checked = Boolean(pin.is_featured);
      if (boardSelect && pin.board_id) boardSelect.value = pin.board_id;

      if (previewImg && pin.image_url) {
        previewImg.src = pin.image_url;
        if (previewWrapper) previewWrapper.hidden = false;
      }
    } else {
      if (previewWrapper) previewWrapper.hidden = true;
    }

    if (drawerModal) drawerModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (drawerModal) drawerModal.hidden = true;
    document.body.style.overflow = '';
    editingPinId = null;
    selectedFile = null;
  }

  function setBoards(boards) {
    availableBoards = boards || [];
    const boardSelect = document.getElementById('pAdminSelectBoard');
    if (boardSelect) {
      boardSelect.innerHTML = '<option value="">General Collection</option>' +
        availableBoards.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('');
    }
  }

  init();

  return {
    loadMetrics,
    loadTable,
    setBoards
  };
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
