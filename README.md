# Selena — Visual Media & Aesthetic Archive (v3.0.0)

A curated visual media archive, fashion portfolio, and aesthetic discovery platform built on modern web standards with real-time PostgreSQL backend integration via Supabase.

---

## 📁 Architecture Overview

```
selena-web/
├── index.html                   # Semantic HTML5 Pinterest-style layout
├── assets/
│   ├── css/
│   │   └── style.css            # Responsive Design System (Vanilla CSS)
│   ├── js/
│   │   ├── config.js            # Configuration & CDN URL resolvers
│   │   ├── main.js              # Coordinator & bootstrap module
│   │   ├── api/
│   │   │   ├── auth.js          # Authentication (Email, Password, OAuth)
│   │   │   ├── boards.js        # Boards management API
│   │   │   ├── pins.js          # Pins, saves, reactions, & comments API
│   │   │   ├── admin.js         # Administration & batch operations API
│   │   │   └── supabase.js      # Supabase client & realtime subscriptions
│   │   ├── core/
│   │   │   ├── router.js        # Client-side hash routing with context preservation
│   │   │   └── store.js         # Reactive state store with optimistic updates & rollback
│   │   └── ui/
│   │       ├── feed.js          # Masonry feed renderer & infinite scroll
│   │       ├── modal.js         # High-res pin detail modal & lightbox
│   │       ├── create-pin.js    # Pin upload, board creation, & dropzone modal
│   │       ├── profile.js       # User profile, boards, created, & saved tabs
│   │       └── admin.js         # CMS dashboard, table, & batch tools
│   └── images/                  # Core branding & fallback assets
├── test/                        # Node.js native test suite
│   ├── config.test.js
│   ├── pins.test.js
│   ├── router.test.js
│   └── store.test.js
├── supabase/                    # Database migrations & schemas
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Local Development
```bash
# Run local dev server
npx serve .

# Run test suite
npm test
```

### Key Capabilities
- **Curated Feeds & Infinite Scroll**: Reactive masonry pin grid with real-time PostgreSQL queries.
- **Dynamic Creator Channels**: Filter by creators (Yamu, Rosé, Sharly Modak) or trending/saved collections.
- **Lightbox & Social Interactions**: Dynamic likes, reactions, follower counters, and real-time threaded comments.
- **User Profiles & Board Collections**: Save pins, create custom boards, and manage personal collections.
- **Admin CMS**: Dedicated catalog management, batch publishing/unpublishing, and analytics dashboard.
