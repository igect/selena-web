/**
 * Selena Archive — Declarative Editorial Gallery Renderer
 * Renders luxury cards across Editorial Spread, Masonry, and Catalog Index modes
 */

export function createEditorialCardHTML(item, isFavorite, index) {
  const isFavClass = isFavorite ? 'is-favorite' : '';
  const isVideo = item.category === 'video' || item.badge.includes('VIDEO');
  const indexPadded = String(index + 1).padStart(2, '0');
  const spanClass = item.featured ? 'card-featured' : '';

  return `
    <article class="editorial-card ${spanClass} ${isFavClass}" data-id="${item.id}" data-creator="${item.creator}" data-category="${item.category}" tabindex="0" role="button" aria-label="View ${item.title}">
      <div class="card-media-wrapper">
        <img 
          src="${item.img}" 
          alt="${item.title}" 
          class="card-img" 
          loading="lazy"
        />
        <div class="card-overlay-gradient"></div>

        <!-- Top Row: Accession Mark & Favorite Action -->
        <div class="card-header-bar">
          <div class="card-accession-tag">
            <span class="accession-code">${item.accession || `№ ${indexPadded}`}</span>
            <span class="accession-badge badge-${item.badgeType}">
              ${isVideo ? '<svg class="badge-play-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>' : ''}
              ${item.badge}
            </span>
          </div>

          <button class="card-fav-btn ${isFavClass}" data-action="favorite" data-id="${item.id}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Favorite">
            <svg viewBox="0 0 24 24" fill="currentColor" class="heart-icon">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>

        <!-- Bottom Details -->
        <div class="card-footer-details">
          <div class="card-meta-line">
            <span class="card-creator">${item.creatorName}</span>
            <span class="card-dot-sep">&bull;</span>
            <span class="card-location">${item.location || 'Archival Series'}</span>
          </div>
          <h3 class="card-headline">${item.title}</h3>
          <p class="card-medium-spec">${item.medium || 'Curated Archive Specimen'}</p>
          
          <div class="card-hover-drawer">
            <p class="card-excerpt">${item.description}</p>
            <div class="card-tags-list">
              ${(item.tags || []).slice(0, 3).map(tag => `<span class="card-tag-chip">#${tag}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

export function createMasonryCardHTML(item, isFavorite, index) {
  const isFavClass = isFavorite ? 'is-favorite' : '';
  const isVideo = item.category === 'video' || item.badge.includes('VIDEO');
  const indexPadded = String(index + 1).padStart(2, '0');

  return `
    <article class="masonry-card ${isFavClass}" data-id="${item.id}" data-creator="${item.creator}" data-category="${item.category}" tabindex="0" role="button" aria-label="View ${item.title}">
      <div class="masonry-media-wrap">
        <img 
          src="${item.img}" 
          alt="${item.title}" 
          class="masonry-img" 
          loading="lazy"
        />
        <div class="masonry-overlay"></div>
        <div class="masonry-top">
          <span class="masonry-accession">${item.accession || `№ ${indexPadded}`}</span>
          <button class="card-fav-btn ${isFavClass}" data-action="favorite" data-id="${item.id}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Favorite">
            <svg viewBox="0 0 24 24" fill="currentColor" class="heart-icon">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>
        <div class="masonry-bottom">
          <span class="masonry-creator">${item.creatorName}</span>
          <h4 class="masonry-title">${item.title}</h4>
          <span class="masonry-date">${item.formattedDate}</span>
        </div>
      </div>
    </article>
  `;
}

export function createIndexRowHTML(item, isFavorite, index) {
  const isFavClass = isFavorite ? 'is-favorite' : '';
  const indexPadded = String(index + 1).padStart(2, '0');

  return `
    <tr class="index-row ${isFavClass}" data-id="${item.id}" tabindex="0" role="button" aria-label="View ${item.title}">
      <td class="index-col-num">${item.accession || `№ ${indexPadded}`}</td>
      <td class="index-col-thumb">
        <div class="index-thumb-wrap">
          <img src="${item.img}" alt="${item.title}" class="index-thumb-img" loading="lazy"/>
        </div>
      </td>
      <td class="index-col-title">
        <div class="index-title-cell">
          <strong class="index-title-text">${item.title}</strong>
          <span class="index-creator-text">${item.creatorName}</span>
        </div>
      </td>
      <td class="index-col-medium">
        <span class="index-badge badge-${item.badgeType}">${item.badge}</span>
        <span class="index-medium-text">${item.medium || 'Archival Print'}</span>
      </td>
      <td class="index-col-location">${item.location || 'Archival Studio'}</td>
      <td class="index-col-date">${item.formattedDate}</td>
      <td class="index-col-action">
        <button class="index-fav-btn ${isFavClass}" data-action="favorite" data-id="${item.id}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Favorite">
          <svg viewBox="0 0 24 24" fill="currentColor" class="heart-icon">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </td>
    </tr>
  `;
}

export function renderGallery(container, items, isFavoriteFn, viewMode = 'editorial') {
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '';
    return;
  }

  if (viewMode === 'index') {
    container.innerHTML = `
      <div class="index-table-container">
        <table class="archival-index-table">
          <thead>
            <tr>
              <th class="th-num">Accession</th>
              <th class="th-thumb">Preview</th>
              <th class="th-title">Title &amp; Series</th>
              <th class="th-medium">Format &amp; Medium</th>
              <th class="th-loc">Location</th>
              <th class="th-date">Date</th>
              <th class="th-action">Fav</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => createIndexRowHTML(item, isFavoriteFn(item.id), idx)).join('')}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  if (viewMode === 'masonry') {
    container.innerHTML = `
      <div class="masonry-columns">
        ${items.map((item, idx) => createMasonryCardHTML(item, isFavoriteFn(item.id), idx)).join('')}
      </div>
    `;
    return;
  }

  // Default: Editorial View
  container.innerHTML = `
    <div class="editorial-grid">
      ${items.map((item, idx) => createEditorialCardHTML(item, isFavoriteFn(item.id), idx)).join('')}
    </div>
  `;
}
