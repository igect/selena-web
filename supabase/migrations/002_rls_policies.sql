-- =============================================================================
-- Selena Media Archive — Row Level Security (RLS) & Authorization
-- =============================================================================

-- 1. Enable RLS on all public tables
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 2. Helper Security Functions (SECURITY DEFINER to prevent recursive RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Creators Policies
-- =============================================================================
CREATE POLICY "Public creators viewable by everyone" ON public.creators
FOR SELECT USING (true);

CREATE POLICY "Admins can insert creators" ON public.creators
FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update creators" ON public.creators
FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete creators" ON public.creators
FOR DELETE USING (public.is_admin());

-- =============================================================================
-- Boards Policies
-- =============================================================================
-- Public system boards are viewable by all; custom user boards viewable by owner or admin
CREATE POLICY "System boards and user boards viewable" ON public.boards
FOR SELECT USING (is_system = true OR auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users and admins can create boards" ON public.boards
FOR INSERT WITH CHECK (
  (auth.uid() = user_id AND is_system = false) OR public.is_admin()
);

CREATE POLICY "Users can update own boards, admins can update any" ON public.boards
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete own boards, admins can delete any" ON public.boards
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- =============================================================================
-- Pins Policies
-- =============================================================================
-- Public can view published pins; Admins can view all (including unpublished drafts)
CREATE POLICY "Published pins viewable by everyone" ON public.pins
FOR SELECT USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins can insert pins" ON public.pins
FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update pins" ON public.pins
FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete pins" ON public.pins
FOR DELETE USING (public.is_admin());

-- =============================================================================
-- Admin Users Policies
-- =============================================================================
CREATE POLICY "Admin users viewable only by admins" ON public.admin_users
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin users manageable only by superadmins/service-role" ON public.admin_users
FOR ALL USING (public.is_admin());

-- =============================================================================
-- Pin Saves (Bookmarks) Policies
-- =============================================================================
CREATE POLICY "Users can view own saves; Admins can view all" ON public.pin_saves
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Authenticated users can save pins" ON public.pin_saves
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own saves" ON public.pin_saves
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- =============================================================================
-- Pin Reactions Policies
-- =============================================================================
CREATE POLICY "Reactions viewable by everyone" ON public.pin_reactions
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add reactions" ON public.pin_reactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions" ON public.pin_reactions
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- =============================================================================
-- Comments Policies
-- =============================================================================
CREATE POLICY "Comments viewable by everyone" ON public.comments
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post comments" ON public.comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments; Admins can delete any" ON public.comments
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- =============================================================================
-- Counter Sync Triggers (Saves & Reactions)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_pin_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pins SET saves_count = saves_count + 1 WHERE id = NEW.pin_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pins SET saves_count = GREATEST(0, saves_count - 1) WHERE id = OLD.pin_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_pin_saves_count ON public.pin_saves;
CREATE TRIGGER trigger_sync_pin_saves_count
AFTER INSERT OR DELETE ON public.pin_saves
FOR EACH ROW EXECUTE FUNCTION public.sync_pin_saves_count();

CREATE OR REPLACE FUNCTION public.sync_pin_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pins SET likes_count = likes_count + 1 WHERE id = NEW.pin_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pins SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.pin_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_pin_reactions_count ON public.pin_reactions;
CREATE TRIGGER trigger_sync_pin_reactions_count
AFTER INSERT OR DELETE ON public.pin_reactions
FOR EACH ROW EXECUTE FUNCTION public.sync_pin_reactions_count();
