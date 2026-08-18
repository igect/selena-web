-- =============================================================================
-- Selena Media Archive — Seed Data (Creators & System Boards)
-- =============================================================================

-- 1. Insert Initial Creators
INSERT INTO public.creators (id, name, handle, bio, avatar_url, follower_count)
VALUES
    ('rose', 'Rosé', '@roses_are_rosie', 'Vocalist, songwriter, and global fashion ambassador. Archival portraiture, studio sessions, and runway spreads.', 'assets/images/logo.png', 1420000),
    ('sharly', 'Sharly Modak', '@sharly_modak', 'Tollywood actress, traditional couture model, and cinematic editorial muse. Heritage textiles & crimson aesthetics.', 'assets/images/logo.png', 890000),
    ('yamu', 'Yamu', '@yamu_visuals', 'Tokyo urban landscapes, alpine snowscapes, and contemporary minimalist visual art.', 'assets/images/logo.png', 430000)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    handle = EXCLUDED.handle,
    bio = EXCLUDED.bio,
    avatar_url = EXCLUDED.avatar_url,
    follower_count = EXCLUDED.follower_count;

-- 2. Insert Standard System Boards
INSERT INTO public.boards (id, creator_id, name, slug, description, is_system)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'rose', 'Rosé Collection', 'rose-collection', 'Curated visual photography of Rosé with luxury tones and high-fashion aesthetics.', true),
    ('22222222-2222-2222-2222-222222222222', 'sharly', 'Sharly Modak Board', 'sharly-modak-board', 'Traditional saree editorials, festive celebrations, and red carpet glamour.', true),
    ('33333333-3333-3333-3333-333333333333', 'yamu', 'Yamu Aesthetics', 'yamu-aesthetics', 'Tokyo neon nights, misty mountain waterfalls, and architectural photography.', true),
    ('44444444-4444-4444-4444-444444444444', NULL, 'Aesthetic Favorites', 'aesthetic-favorites', 'General community highlighted and trending aesthetic pins.', true)
ON CONFLICT (id) DO NOTHING;
