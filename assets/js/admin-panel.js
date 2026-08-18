/**
 * Selena Media Archive — Admin CMS Controller
 * Powers the administrative dashboard, Pin CRUD, batch operations, and image uploads.
 */

import { AdminAPI } from './api/admin-api.js';
import { CONFIG } from './config.js';

export function createAdminPanel(store, router) {
  let adminState = {
    page: 1,
    pageSize: 15,
    search: '',
    creator: 'all',
    status: 'all',
    pins: [],
    totalCount: 0,
    metrics: null,
    selectedPinIds: new Set(),
    editingPin: null,
    isUploading: false
  };

  function getElements() {
    return {
      adminSection: document.getElementById('pAdminSection'),
      metricsContainer: document.getElementById('pAdminMetrics'),
      tableBody: document.getElementById('pAdminTableBody'),
      searchInput: document.getElementById('pAdminSearch'),
      creatorFilter: document.getElementById('pAdminCreatorFilter'),
      statusFilter: document.getElementById('pAdminStatusFilter'),
      paginationInfo: document.getElementById('pAdminPaginationInfo'),
      prevPageBtn: document.getElementById('pAdminPrevPage'),
      nextPageBtn: document.getElementById('pAdminNextPage'),
      selectAllCheckbox: document.getElementById('pAdminSelectAll'),
      batchToolbar: document.getElementById('pAdminBatchToolbar'),
      batchPublishBtn: document.getElementById('pAdminBatchPublish'),
      batchDraftBtn: document.getElementById('pAdminBatchDraft'),
      batchDeleteBtn: document.getElementById('pAdminBatchDelete'),
      newPinBtn: document.getElementById('pAdminNewPinBtn'),
      drawerModal: document.getElementById('pAdminDrawerModal'),
      drawerTitle: document.getElementById('pAdminDrawerTitle'),
      drawerForm: document.getElementById('pAdminDrawerForm'),
      closeDrawerBtn: document.getElementById('pAdminCloseDrawer'),
      dropzone: document.getElementById('pAdminDropzone'),
      fileInput: document.getElementById('pAdminFileInput'),
      previewImg: document.getElementById('pAdminPreviewImg'),
      previewWrapper: document.getElementById('pAdminPreviewWrapper'),
      removePreviewBtn: document.getElementById('pAdminRemovePreview'),
      inputTitle: document.getElementById('pAdminInputTitle'),
      inputDesc: document.getElementById('pAdminInputDesc'),
      inputLink: document.getElementById('pAdminInputLink'),
      selectCreator: document.getElementById('pAdminSelectCreator'),
      selectBoard: document.getElementById('pAdminSelectBoard'),
      inputTags: document.getElementById('pAdminInputTags'),
      checkboxPublished: document.getElementById('pAdminCheckPublished'),
      checkboxFeatured: document.getElementById('pAdminCheckFeatured'),
      submitBtn: document.getElementById('pAdminSubmitBtn')
    };
  }

  let selectedFile = null;

  async function loadMetrics() {
    const els = getElements();
    if (!els.metricsContainer) return;
    try {
      const m = await AdminAPI.fetchDashboardMetrics();
      adminState.metrics = m;
      els.metricsContainer.innerHTML = `
        <div class="p-metric-card">
          <div class="p-metric-value">${m.totalPins.toLocaleString()}</div>
          <div class="p-metric-label">Total Pins</div>
        </div>
        <div class="p-metric-card">
          <div class="p-metric-value">${m.publishedPins.toLocaleString()}</div>
          <div class="p-metric-label">Published</div>
        </div>
        <div class="p-metric-card">
          <div class="p-metric-value">${m.draftPins.toLocaleString()}</div>
          <div class="p-metric-label">Drafts</div>
        </div>
        <div class="p-metric-card">
          <div class="p-metric-value">${m.totalCreators}</div>
          <div class="p-metric-label">Creators</div>
        </div>
        <div class="p-metric-card">
          <div class="p-metric-value">${m.totalBoards}</div>
          <div class="p-metric-label">Boards</div>
        </div>
        <div class="p-metric-card">
          <div class="p-metric-value">${m.totalSaves.toLocaleString()}</div>
          <div class="p-metric-label">Community Saves</div>
        </div>
      `;
    } catch (err) {
      console.warn('[AdminPanel] Error loading metrics:', err);
    }
  }

  async function loadPinsTable() {
    const els = getElements();
    if (!els.tableBody) return;

    els.tableBody.innerHTML = `<tr><td colspan="7" class="p-admin-empty">Loading pins...</td></tr>`;

    try {
      const res = await AdminAPI.fetchAdminPins({
        page: adminState.page,
        pageSize: adminState.pageSize,
        search: adminState.search,
        creator: adminState.creator,
        status: adminState.status
      });

      adminState.pins = res.pins;
      adminState.totalCount = res.totalCount;

      renderTable();
      updatePagination();
    } catch (err) {
      console.error('[AdminPanel] Error loading pins:', err);
      els.tableBody.innerHTML = `<tr><td colspan="7" class="p-admin-empty">Error loading pins. Please try again.</td></tr>`;
    }
  }

  function renderTable() {
    const els = getElements();
    if (!els.tableBody) return;

    if (adminState.pins.length === 0) {
      els.tableBody.innerHTML = `<tr><td colspan="7" class="p-admin-empty">No pins found matching criteria.</td></tr>`;
      return;
    }

    els.tableBody.innerHTML = adminState.pins.map(pin => {
      const isChecked = adminState.selectedPinIds.has(pin.id);
      const thumb = CONFIG.resolveImageUrl(pin.image_url || pin.img);
      const creatorName = pin.creators?.name || pin.creatorName || pin.creator_id || '—';
      const boardName = pin.boards?.name || pin.board || '—';
      const isPub = pin.is_published !== false;
      const statusBadge = isPub
        ? `<span class="p-status-pill published">Published</span>`
        : `<span class="p-status-pill draft">Draft</span>`;

      return `
        <tr data-pin-id="${pin.id}">
          <td class="p-col-check">
            <input type="checkbox" class="p-row-checkbox" data-id="${pin.id}" ${isChecked ? 'checked' : ''}>
          </td>
          <td class="p-col-thumb">
            <img src="${thumb}" alt="" class="p-admin-thumb" loading="lazy">
          </td>
          <td class="p-col-title">
            <strong class="p-pin-title-cell">${escapeHtml(pin.title)}</strong>
            <span class="p-pin-meta-cell">${escapeHtml(pin.description || '').slice(0, 60)}...</span>
          </td>
          <td class="p-col-creator">${escapeHtml(creatorName)}</td>
          <td class="p-col-board">${escapeHtml(boardName)}</td>
          <td class="p-col-status">${statusBadge}</td>
          <td class="p-col-actions">
            <button class="p-admin-icon-btn p-btn-edit-row" data-id="${pin.id}" title="Edit Pin">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="p-admin-icon-btn p-btn-delete-row" data-id="${pin.id}" data-path="${pin.image_path || ''}" title="Delete Pin">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row checkbox handlers
    els.tableBody.querySelectorAll('.p-row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          adminState.selectedPinIds.add(id);
        } else {
          adminState.selectedPinIds.delete(id);
        }
        updateBatchToolbar();
      });
    });

    // Attach edit handlers
    els.tableBody.querySelectorAll('.p-btn-edit-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const pin = adminState.pins.find(p => p.id === id);
        if (pin) openDrawer(pin);
      });
    });

    // Attach delete handlers
    els.tableBody.querySelectorAll('.p-btn-delete-row').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const path = btn.getAttribute('data-path');
        if (confirm('Are you sure you want to delete this pin? This action cannot be undone.')) {
          try {
            await AdminAPI.deletePin(id, path);
            loadMetrics();
            loadPinsTable();
          } catch (err) {
            alert('Error deleting pin: ' + err.message);
          }
        }
      });
    });
  }

  function updatePagination() {
    const els = getElements();
    if (!els.paginationInfo) return;

    const totalPages = Math.max(1, Math.ceil(adminState.totalCount / adminState.pageSize));
    els.paginationInfo.textContent = `Page ${adminState.page} of ${totalPages} (${adminState.totalCount} total)`;
    if (els.prevPageBtn) els.prevPageBtn.disabled = adminState.page <= 1;
    if (els.nextPageBtn) els.nextPageBtn.disabled = adminState.page >= totalPages;
  }

  function updateBatchToolbar() {
    const els = getElements();
    if (!els.batchToolbar) return;

    const count = adminState.selectedPinIds.size;
    if (count > 0) {
      els.batchToolbar.hidden = false;
      const countEl = els.batchToolbar.querySelector('.p-batch-count');
      if (countEl) countEl.textContent = `${count} selected`;
    } else {
      els.batchToolbar.hidden = true;
    }
  }

  function openDrawer(pin = null) {
    const els = getElements();
    if (!els.drawerModal) return;

    adminState.editingPin = pin;
    selectedFile = null;

    if (pin) {
      els.drawerTitle.textContent = 'Edit Pin';
      els.inputTitle.value = pin.title || '';
      els.inputDesc.value = pin.description || '';
      els.inputLink.value = pin.destination_link || pin.destinationLink || '';
      els.selectCreator.value = pin.creator_id || pin.creator || 'rose';
      els.selectBoard.value = pin.board_id || '';
      els.inputTags.value = Array.isArray(pin.tags) ? pin.tags.join(', ') : '';
      els.checkboxPublished.checked = pin.is_published !== false;
      els.checkboxFeatured.checked = Boolean(pin.is_featured);

      const imgUrl = CONFIG.resolveImageUrl(pin.image_url || pin.img);
      els.previewImg.src = imgUrl;
      els.previewWrapper.hidden = false;
      els.dropzone.querySelector('.p-drop-placeholder').hidden = true;
      els.submitBtn.textContent = 'Update Pin';
    } else {
      els.drawerTitle.textContent = 'Create New Pin';
      els.drawerForm.reset();
      els.previewWrapper.hidden = true;
      els.dropzone.querySelector('.p-drop-placeholder').hidden = false;
      els.checkboxPublished.checked = true;
      els.submitBtn.textContent = 'Publish Pin';
    }

    els.drawerModal.hidden = false;
  }

  function closeDrawer() {
    const els = getElements();
    if (els.drawerModal) els.drawerModal.hidden = true;
    adminState.editingPin = null;
    selectedFile = null;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setupEvents() {
    const els = getElements();

    // Search input
    if (els.searchInput) {
      let debounce;
      els.searchInput.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          adminState.search = e.target.value;
          adminState.page = 1;
          loadPinsTable();
        }, 300);
      });
    }

    // Filter by creator
    if (els.creatorFilter) {
      els.creatorFilter.addEventListener('change', (e) => {
        adminState.creator = e.target.value;
        adminState.page = 1;
        loadPinsTable();
      });
    }

    // Filter by status
    if (els.statusFilter) {
      els.statusFilter.addEventListener('change', (e) => {
        adminState.status = e.target.value;
        adminState.page = 1;
        loadPinsTable();
      });
    }

    // Pagination buttons
    if (els.prevPageBtn) {
      els.prevPageBtn.addEventListener('click', () => {
        if (adminState.page > 1) {
          adminState.page--;
          loadPinsTable();
        }
      });
    }

    if (els.nextPageBtn) {
      els.nextPageBtn.addEventListener('click', () => {
        adminState.page++;
        loadPinsTable();
      });
    }

    // Select all
    if (els.selectAllCheckbox) {
      els.selectAllCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          adminState.pins.forEach(p => adminState.selectedPinIds.add(p.id));
        } else {
          adminState.selectedPinIds.clear();
        }
        renderTable();
        updateBatchToolbar();
      });
    }

    // Batch publish
    if (els.batchPublishBtn) {
      els.batchPublishBtn.addEventListener('click', async () => {
        const ids = Array.from(adminState.selectedPinIds);
        await AdminAPI.batchSetPublishStatus(ids, true);
        adminState.selectedPinIds.clear();
        loadMetrics();
        loadPinsTable();
      });
    }

    // Batch draft
    if (els.batchDraftBtn) {
      els.batchDraftBtn.addEventListener('click', async () => {
        const ids = Array.from(adminState.selectedPinIds);
        await AdminAPI.batchSetPublishStatus(ids, false);
        adminState.selectedPinIds.clear();
        loadMetrics();
        loadPinsTable();
      });
    }

    // Batch delete
    if (els.batchDeleteBtn) {
      els.batchDeleteBtn.addEventListener('click', async () => {
        const ids = Array.from(adminState.selectedPinIds);
        if (confirm(`Delete ${ids.length} selected pins? This cannot be undone.`)) {
          await AdminAPI.batchDeletePins(ids);
          adminState.selectedPinIds.clear();
          loadMetrics();
          loadPinsTable();
        }
      });
    }

    // New Pin button
    if (els.newPinBtn) {
      els.newPinBtn.addEventListener('click', () => openDrawer(null));
    }

    if (els.closeDrawerBtn) {
      els.closeDrawerBtn.addEventListener('click', closeDrawer);
    }

    // File Drag & Drop
    if (els.dropzone && els.fileInput) {
      els.dropzone.addEventListener('click', () => els.fileInput.click());
      els.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        els.dropzone.classList.add('drag-over');
      });
      els.dropzone.addEventListener('dragleave', () => {
        els.dropzone.classList.remove('drag-over');
      });
      els.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });

      els.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      });
    }

    function handleFile(file) {
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        els.previewImg.src = reader.result;
        els.previewWrapper.hidden = false;
        els.dropzone.querySelector('.p-drop-placeholder').hidden = true;
      };
      reader.readAsDataURL(file);
    }

    if (els.removePreviewBtn) {
      els.removePreviewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile = null;
        els.previewWrapper.hidden = true;
        els.dropzone.querySelector('.p-drop-placeholder').hidden = false;
        els.fileInput.value = '';
      });
    }

    // Drawer form submit
    if (els.drawerForm) {
      els.drawerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = els.inputTitle.value.trim();
        if (!title) {
          alert('Please provide a title for the pin.');
          return;
        }

        const tags = els.inputTags.value
          .split(',')
          .map(t => t.trim().toLowerCase())
          .filter(Boolean);

        const pinData = {
          title,
          description: els.inputDesc.value.trim(),
          destination_link: els.inputLink.value.trim() || null,
          creator_id: els.selectCreator.value,
          board_id: els.selectBoard.value || null,
          tags,
          is_published: els.checkboxPublished.checked,
          is_featured: els.checkboxFeatured.checked
        };

        els.submitBtn.disabled = true;
        els.submitBtn.textContent = 'Saving...';

        try {
          if (adminState.editingPin) {
            await AdminAPI.updatePin(adminState.editingPin.id, pinData, selectedFile);
          } else {
            await AdminAPI.createPin(pinData, selectedFile);
          }
          closeDrawer();
          loadMetrics();
          loadPinsTable();
          // Reload feed so new pin appears immediately
          router.navigate('');
          setTimeout(() => window.location.reload(), 300);
        } catch (err) {
          alert('Error saving pin: ' + err.message);
        } finally {
          els.submitBtn.disabled = false;
          els.submitBtn.textContent = adminState.editingPin ? 'Update Pin' : 'Publish Pin';
        }
      });
    }
  }

  return {
    init() {
      setupEvents();
    },
    refresh() {
      loadMetrics();
      loadPinsTable();
    },
    openCreate() {
      openDrawer(null);
    }
  };
}
