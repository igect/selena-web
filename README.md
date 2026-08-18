# Selena — Haute Couture & Media Archive

An ultra-premium, offline-ready luxury editorial media archive and portfolio designed for curated collections, photography spreads, studio recordings, and live concert footage.

---

## 📁 Clean Directory Architecture

```
selena-web/
├── index.html                   # Semantic HTML5 luxury editorial web application
├── assets/
│   ├── css/
│   │   └── style.css            # Figma-grade Luxury Editorial Design System (Vanilla CSS)
│   ├── js/
│   │   ├── main.js              # Application coordinator & event delegation
│   │   ├── data.js              # Enriched archival dataset with accession codes & EXIF specs
│   │   ├── archive-store.js     # Deep reactive state management (search, filters, view modes)
│   │   ├── gallery-renderer.js  # Declarative multi-mode renderer (Editorial, Masonry, Index)
│   │   └── lightbox-viewer.js   # Fullscreen cinema viewer with filmstrip & color spectrum
│   └── images/                  # High-resolution media assets & favicons
├── test/
│   └── archive-store.test.js    # Node.js test suite for state management & filtering
├── package.json                 # Project configuration & test scripts
└── README.md
```

---

## 🚀 How to Run & View

### Option 1: Open Directly in Browser
Double-click [`index.html`](file:///E:/Artificial%20Intelligence/selena-web/index.html) or open with any modern web browser.

### Option 2: Run with Static Server
```powershell
# Using npx serve
npx serve .

# Or Python
python -m http.server 3000
```

### Run Unit Tests
```powershell
npm test
```

---

## ✨ Features & Architecture

1. **Haute Couture Editorial Masthead**:
   - Monogram & Issue tag (`VOL. I / FOLIO 01`)
   - Quick Archive Search with instant shortcut (`/`) and clear button
   - Fullscreen Cinema Slideshow trigger
   - Persistent Saved/Favorites counter with `localStorage` persistence
   - Theme Switcher: **Obsidian Dark** & **Alabaster Linen Light**

2. **Master Visual Cover Feature**:
   - Curated lead visual presentation with live accession numbering (`№ 2024-001`)
   - Archival specifications matrix (Curation, Chronology, Formats)
   - Direct Cinema and Series navigation triggers

3. **Collections & Channels Strip**:
   - Direct filtering across: `01 All Works`, `02 Selena`, `03 Studio Tapes`, `04 Live Tour`, `05 Editorial Spreads`
   - Active count indicators and responsive sliding underline indicator

4. **3 Dynamic Gallery Layout Modes**:
   - **Editorial Spread**: Asymmetrical fashion magazine layout with featured portrait and landscape cards.
   - **Compact Masonry**: Multi-column dynamic card flow.
   - **Archival Index Table**: High-density catalog table with accession codes, formats, locations, and dates.

5. **Cinema-Grade Lightbox & Archival Drawer**:
   - Fullscreen distraction-free cinema mode
   - Bottom filmstrip thumbnail navigation ribbon for instant slide jumping
   - Archival EXIF technical specs: Medium, Format, Location, Session Date
   - Curator Notes & Chroma Spectrum palette swatches
   - Keyboard navigation (`←`, `→`, `Space`, `Esc`)
