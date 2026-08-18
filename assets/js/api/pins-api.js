/**
 * Selena Media Archive — Pins & User Interaction API
 * Manages database queries, pagination, search, filters, saves, reactions, and comments.
 */

import { CONFIG } from '../config.js';
import { getSupabase } from '../supabase-client.js';

let localDataCache = null;

async function getLocalData() {
  if (localDataCache) return localDataCache;
  try {
    const res = await fetch('assets/js/archive-data.json');
    if (res.ok) {
      localDataCache = await res.json();
      return localDataCache;
    }
  } catch (err) {
    console.warn('[PinsAPI] Could not load local archive-data.json:', err);
  }
  return { items: [], counts: { all: 0, rose: 0, sharly: 0, yamu: 0 } };
}

export const PinsAPI = {
  /**
   * Fetch paginated list of pins with search, filters, and sorting
   */
  async fetchPins({
    page = 1,
    pageSize = CONFIG.PAGE_SIZE,
    creator = 'all',
    boardId = null,
    query = '',
    filter = 'all',
    sort = 'newest',
    onlySaved = false,
    savedPinIds = [],
    userId = null
  } = {}) {
    const supabase = await getSupabase();

    // 1. Live Supabase Backend Query
    if (supabase) {
      let q = supabase
        .from('pins')
        .select(`
          id, legacy_id, creator_id, board_id, title, description, category,
          image_url, image_path, aspect_ratio, destination_link, tags,
          saves_count, likes_count, is_published, is_featured, published_at,
          creators (id, name, handle, avatar_url),
          boards (id, name, slug)
        `, { count: 'exact' });

      // Only published pins for public queries
      q = q.eq('is_published', true);

      // Filter by creator
      if (creator && creator !== 'all') {
        q = q.eq('creator_id', creator);
      }

      // Filter by board
      if (boardId) {
        q = q.eq('board_id', boardId);
      }

      // Filter by saved pins
      if (onlySaved || filter === 'saved') {
        if (savedPinIds && savedPinIds.length > 0) {
          q = q.in('id', savedPinIds);
        } else {
          return { pins: [], totalCount: 0, hasMore: false };
        }
      }

      // Text search query
      if (query && query.trim()) {
        const cleanQuery = query.trim();
        q = q.or(`title.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`);
      }

      // Sorting
      if (filter === 'popular' || sort === 'popular') {
        q = q.order('saves_count', { ascending: false }).order('published_at', { ascending: false });
      } else if (sort === 'oldest') {
        q = q.order('published_at', { ascending: true });
      } else {
        // 'newest' default
        q = q.order('published_at', { ascending: false });
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, count, error } = await q;
      if (error) {
        console.error('[PinsAPI] fetchPins error:', error);
        throw error;
      }

      const formatted = (data || []).map(p => ({
        id: p.id,
        legacyId: p.legacy_id,
        title: p.title,
        creator: p.creator_id,
        creatorName: p.creators?.name || p.creator_id,
        creatorHandle: p.creators?.handle || '',
        creatorAvatar: p.creators?.avatar_url || 'assets/images/logo.png',
        category: p.category,
        date: p.published_at?.split('T')[0] || '',
        img: CONFIG.resolveImageUrl(p.image_url),
        board: p.boards?.name || 'General',
        boardId: p.board_id,
        description: p.description || '',
        destinationLink: p.destination_link || '',
        tags: p.tags || [],
        savesCount: p.saves_count || 0,
        likesCount: p.likes_count || 0,
        isFeatured: p.is_featured
      }));

      return {
        pins: formatted,
        totalCount: count || formatted.length,
        hasMore: to < (count || 0)
      };
    }

    // 2. Offline / Local Fallback Query
    const local = await getLocalData();
    let raw = [...local.items];

    // Load any user created pins from local storage
    try {
      const localCreated = JSON.parse(localStorage.getItem('pinterest_created_pins') || '[]');
      raw = [...localCreated, ...raw];
    } catch {}

    const qLower = query.trim().toLowerCase();
    const filtered = raw.filter(item => {
      if (creator !== 'all' && item.creator !== creator) return false;
      if ((onlySaved || filter === 'saved') && !savedPinIds.includes(item.id)) return false;
      if (qLower) {
        const matchTitle = item.title.toLowerCase().includes(qLower);
        const matchCreator = (item.creatorName || '').toLowerCase().includes(qLower);
        const matchDesc = (item.description || '').toLowerCase().includes(qLower);
        if (!matchTitle && !matchCreator && !matchDesc) return false;
      }
      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (filter === 'popular' || sort === 'popular') {
        const sa = savedPinIds.includes(a.id) ? 1 : 0;
        const sb = savedPinIds.includes(b.id) ? 1 : 0;
        return sb - sa || new Date(b.date) - new Date(a.date);
      }
      if (sort === 'oldest') return new Date(a.date) - new Date(b.date);
      return new Date(b.date) - new Date(a.date);
    });

    const from = (page - 1) * pageSize;
    const paginated = filtered.slice(from, from + pageSize);

    return {
      pins: paginated,
      totalCount: filtered.length,
      hasMore: from + pageSize < filtered.length
    };
  },

  /**
   * Fetch single pin by ID
   */
  async fetchPinById(id) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('pins')
        .select(`
          *,
          creators (id, name, handle, avatar_url, follower_count),
          boards (id, name, slug)
        `)
        .or(`id.eq.${id},legacy_id.eq.${id}`)
        .maybeSingle();

      if (error || !data) return null;
      return {
        id: data.id,
        legacyId: data.legacy_id,
        title: data.title,
        creator: data.creator_id,
        creatorName: data.creators?.name || data.creator_id,
        creatorHandle: data.creators?.handle || '',
        creatorAvatar: data.creators?.avatar_url || 'assets/images/logo.png',
        creatorFollowers: data.creators?.follower_count || 0,
        category: data.category,
        date: data.published_at?.split('T')[0] || '',
        img: CONFIG.resolveImageUrl(data.image_url),
        board: data.boards?.name || 'General',
        boardId: data.board_id,
        description: data.description || '',
        destinationLink: data.destination_link || '',
        tags: data.tags || [],
        savesCount: data.saves_count || 0,
        likesCount: data.likes_count || 0,
        isFeatured: data.is_featured
      };
    }

    const local = await getLocalData();
    return local.items.find(p => p.id === id) || null;
  },

  /**
   * Fetch all creators
   */
  async fetchCreators() {
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .order('name');
      if (!error && data) return data;
    }
    return [
      { id: 'rose', name: 'Rosé', handle: '@roses_are_rosie', avatar_url: 'assets/images/logo.png', follower_count: 1420000 },
      { id: 'sharly', name: 'Sharly Modak', handle: '@sharly_modak', avatar_url: 'assets/images/logo.png', follower_count: 890000 },
      { id: 'yamu', name: 'Yamu', handle: '@yamu_visuals', avatar_url: 'assets/images/logo.png', follower_count: 430000 }
    ];
  },

  /**
   * Fetch all boards
   */
  async fetchBoards(userId = null) {
    const supabase = await getSupabase();
    if (supabase) {
      let q = supabase
        .from('boards')
        .select('*, creators(name)')
        .order('name');
      const { data, error } = await q;
      if (!error && data) return data;
    }

    // Local boards
    let custom = ['Aesthetics', 'Daily Inspo', 'Visuals'];
    try {
      const saved = localStorage.getItem('pinterest_custom_boards');
      if (saved) custom = JSON.parse(saved);
    } catch {}

    return [
      { id: 'rose-board', name: 'Rosé Collection', slug: 'rose-collection', creator_id: 'rose' },
      { id: 'sharly-board', name: 'Sharly Modak Board', slug: 'sharly-board', creator_id: 'sharly' },
      { id: 'yamu-board', name: 'Yamu Aesthetics', slug: 'yamu-aesthetics', creator_id: 'yamu' },
      ...custom.map(name => ({ id: 'custom-' + name, name, slug: name.toLowerCase().replace(/\s+/g, '-') }))
    ];
  },

  /**
   * Toggle Pin Save (Bookmark)
   */
  async toggleSave(pinId, userId, isSaved) {
    const supabase = await getSupabase();
    if (supabase && userId) {
      if (isSaved) {
        // Remove save
        await supabase
          .from('pin_saves')
          .delete()
          .match({ pin_id: pinId, user_id: userId });
      } else {
        // Add save
        await supabase
          .from('pin_saves')
          .insert({ pin_id: pinId, user_id: userId });
      }
    }
  },

  /**
   * Toggle Reaction
   */
  async toggleReaction(pinId, userId, reactionType, hasReacted) {
    const supabase = await getSupabase();
    if (supabase && userId) {
      if (hasReacted) {
        await supabase
          .from('pin_reactions')
          .delete()
          .match({ pin_id: pinId, user_id: userId, reaction_type: reactionType });
      } else {
        await supabase
          .from('pin_reactions')
          .insert({ pin_id: pinId, user_id: userId, reaction_type: reactionType });
      }
    }
  },

  /**
   * Fetch comments for a pin
   */
  async fetchComments(pinId) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('pin_id', pinId)
        .order('created_at', { ascending: true });
      if (!error && data) return data;
    }
    // Local fallback
    try {
      const local = JSON.parse(localStorage.getItem('pinterest_comments') || '{}');
      return local[pinId] || [];
    } catch {
      return [];
    }
  },

  /**
   * Add a comment to a pin
   */
  async addComment(pinId, userId, content, userName = 'Guest', userAvatar = 'assets/images/logo.png') {
    const supabase = await getSupabase();
    if (supabase && userId) {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          pin_id: pinId,
          user_id: userId,
          content,
          user_name: userName,
          user_avatar: userAvatar
        })
        .select()
        .single();
      if (!error) return data;
    }

    // Local fallback
    const comment = {
      id: 'local-comment-' + Date.now(),
      pin_id: pinId,
      user_id: userId || 'local-user',
      user_name: userName,
      user_avatar: userAvatar,
      content,
      created_at: new Date().toISOString()
    };
    try {
      const local = JSON.parse(localStorage.getItem('pinterest_comments') || '{}');
      if (!local[pinId]) local[pinId] = [];
      local[pinId].push(comment);
      localStorage.setItem('pinterest_comments', JSON.stringify(local));
    } catch {}
    return comment;
  }
};
