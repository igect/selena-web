-- =============================================================================
-- Selena Media Archive — PostgreSQL Initial Schema
-- =============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Creators Table
CREATE TABLE IF NOT EXISTS public.creators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    follower_count INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Boards Table
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id TEXT REFERENCES public.creators(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_system BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Pins Table (Core Archival Entity)
CREATE TABLE IF NOT EXISTS public.pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    creator_id TEXT NOT NULL REFERENCES public.creators(id) ON DELETE RESTRICT,
    board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'photo' NOT NULL,
    image_url TEXT NOT NULL,
    image_path TEXT,
    aspect_ratio FLOAT DEFAULT 1.0,
    width INT,
    height INT,
    destination_link TEXT,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    saves_count INT DEFAULT 0 NOT NULL,
    likes_count INT DEFAULT 0 NOT NULL,
    is_published BOOLEAN DEFAULT true NOT NULL,
    is_featured BOOLEAN DEFAULT false NOT NULL,
    published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'admin' NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Pin Saves (User Bookmarks)
CREATE TABLE IF NOT EXISTS public.pin_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(pin_id, user_id)
);

-- 6. Pin Reactions (❤️ Love, ✨ Sparkle, 🔥 Fire)
CREATE TABLE IF NOT EXISTS public.pin_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('love', 'sparkle', 'fire')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(pin_id, user_id, reaction_type)
);

-- 7. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- Performance Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_pins_creator_pub ON public.pins(creator_id, is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pins_board ON public.pins(board_id);
CREATE INDEX IF NOT EXISTS idx_pins_published_at ON public.pins(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pins_tags ON public.pins USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_pins_search ON public.pins USING GIN(to_tsvector('english', title || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_pin_saves_user ON public.pin_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_pin_reactions_pin ON public.pin_reactions(pin_id);
CREATE INDEX IF NOT EXISTS idx_comments_pin ON public.comments(pin_id, created_at ASC);

-- =============================================================================
-- Automatic Timestamp Updates Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pins_updated_at ON public.pins;
CREATE TRIGGER set_pins_updated_at
BEFORE UPDATE ON public.pins
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
