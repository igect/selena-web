/**
 * Selena Media Archive — UI Share Dialog Modal
 * Deep module managing multi-action sharing (clean link, direct media asset, web share, download).
 */

export function createShareModalUI({
  modalEl,
  onToast
}) {
  const scrim = modalEl.querySelector('#pShareScrim');
  const closeBtn = modalEl.querySelector('#pCloseShareBtn');

  const titleEl = modalEl.querySelector('#pShareTitle');
  const previewImg = modalEl.querySelector('#pSharePreviewImg');

  const pageUrlInput = modalEl.querySelector('#pSharePageUrlInput');
  const copyPageBtn = modalEl.querySelector('#pCopyPageUrlBtn');

  const mediaUrlInput = modalEl.querySelector('#pShareMediaUrlInput');
  const copyMediaBtn = modalEl.querySelector('#pCopyMediaUrlBtn');
  const mediaUrlRow = modalEl.querySelector('#pShareMediaUrlRow');

  const nativeShareBtn = modalEl.querySelector('#pNativeShareBtn');
  const downloadBtn = modalEl.querySelector('#pShareDownloadBtn');

  let currentData = null;

  function init() {
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (scrim) scrim.addEventListener('click', close);

    if (copyPageBtn && pageUrlInput) {
      copyPageBtn.addEventListener('click', async () => {
        const text = pageUrlInput.value;
        if (navigator.clipboard && text) {
          await navigator.clipboard.writeText(text);
          if (onToast) onToast('Page link copied to clipboard!');
        }
      });
    }

    if (copyMediaBtn && mediaUrlInput) {
      copyMediaBtn.addEventListener('click', async () => {
        const text = mediaUrlInput.value;
        if (navigator.clipboard && text) {
          await navigator.clipboard.writeText(text);
          if (onToast) onToast('Direct image link copied to clipboard!');
        }
      });
    }

    if (nativeShareBtn) {
      nativeShareBtn.addEventListener('click', async () => {
        if (navigator.share && currentData) {
          try {
            await navigator.share({
              title: currentData.title || 'Selena Media Archive',
              text: currentData.description || 'Check out this aesthetic on Selena',
              url: currentData.pageUrl
            });
          } catch {}
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (!currentData?.mediaUrl) return;
        const a = document.createElement('a');
        a.href = currentData.mediaUrl;
        a.download = (currentData.title || 'selena-media').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    }
  }

  function open({ title, description, pageUrl, mediaUrl, imageUrl }) {
    currentData = { title, description, pageUrl, mediaUrl, imageUrl };

    if (titleEl) titleEl.textContent = title || 'Share Aesthetic';
    if (previewImg) {
      previewImg.src = imageUrl || mediaUrl || 'assets/images/logo.png';
      previewImg.hidden = !(imageUrl || mediaUrl);
    }

    if (pageUrlInput) pageUrlInput.value = pageUrl || '';
    if (mediaUrlInput && mediaUrlRow) {
      if (mediaUrl) {
        mediaUrlRow.hidden = false;
        mediaUrlInput.value = mediaUrl;
      } else {
        mediaUrlRow.hidden = true;
      }
    }

    if (nativeShareBtn) {
      nativeShareBtn.hidden = !Boolean(navigator.share);
    }

    if (downloadBtn) {
      downloadBtn.hidden = !Boolean(mediaUrl);
    }

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
