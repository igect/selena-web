/**
 * Selena Media Archive — Pins & User Interaction API
 * Pure Supabase Backend API for live production.
 */

import { CONFIG } from '../config.js';
import { getSupabase } from '../supabase-client.js';

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
    if (!supabase) return { pins: [], totalCount: 0, hasMore: false };

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

    if (creator && creator !== 'all') {
      q = q.eq('creator_id', creator);
    }

    if (boardId) {
      q = q.eq('board_id', boardId);
    }

    if (userId) {
      q = q.eq('user_id', userId);
    }

    if (onlySaved || filter === 'saved') {
      if (savedPinIds && savedPinIds.length > 0) {
        q = q.in('id', savedPinIds);
      } else {
        return { pins: [], totalCount: 0, hasMore: false };
      }
    }

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
  },

  /**
   * Fetch single pin by ID
   */
  async fetchPinById(id) {
    const supabase = await getSupabase();
    if (!supabase) return null;

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
  },

  /**
   * Fetch all creators
   */
  async fetchCreators() {
    const supabase = await getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .order('name');
    if (error) {
      console.error('[PinsAPI] fetchCreators error:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Fetch all boards
   */
  async fetchBoards(userId = null) {
    const supabase = await getSupabase();
    if (!supabase) return [];
    let q = supabase
      .from('boards')
      .select('*, creators(name)')
      .order('name');
    if (userId) {
      q = q.or(`user_id.eq.${userId},is_system.eq.true`);
    }
    const { data, error } = await q;
    if (error) {
      console.error('[PinsAPI] fetchBoards error:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Create a new board
   */
  async createBoard(name, userId) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live database unavailable');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data, error } = await supabase
      .from('boards')
      .insert({ name, slug, user_id: userId })
      .select()
      .single();
    if (error) {
      console.error('[PinsAPI] createBoard error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  },

  /**
   * Toggle Pin Save (Bookmark)
   */
  async toggleSave(pinId, userId, isSaved) {
    const supabase = await getSupabase();
    if (!supabase || !userId) return;

    if (isSaved) {
      const { error } = await supabase
        .from('pin_saves')
        .delete()
        .match({ pin_id: pinId, user_id: userId });
      if (error) console.error('[PinsAPI] toggleSave error:', error);
    } else {
      const { error } = await supabase
        .from('pin_saves')
        .insert({ pin_id: pinId, user_id: userId });
      if (error) console.error('[PinsAPI] toggleSave error:', error);
    }
  },

  /**
   * Toggle Reaction
   */
  async toggleReaction(pinId, userId, reactionType, hasReacted) {
    const supabase = await getSupabase();
    if (!supabase || !userId) return;

    if (hasReacted) {
      const { error } = await supabase
        .from('pin_reactions')
        .delete()
        .match({ pin_id: pinId, user_id: userId, reaction_type: reactionType });
      if (error) console.error('[PinsAPI] toggleReaction error:', error);
    } else {
      const { error } = await supabase
        .from('pin_reactions')
        .insert({ pin_id: pinId, user_id: userId, reaction_type: reactionType });
      if (error) console.error('[PinsAPI] toggleReaction error:', error);
    }
  },

  /**
   * Fetch comments for a pin
   */
  async fetchComments(pinId) {
    const supabase = await getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('pin_id', pinId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[PinsAPI] fetchComments error:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Add a comment to a pin
   */
  async addComment(pinId, userId, content, userName = 'Guest', userAvatar = 'assets/images/logo.png') {
    const supabase = await getSupabase();
    if (!supabase || !userId) return null;

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
    if (error) {
      console.error('[PinsAPI] addComment error:', error);
      return null;
    }
    return data;
  },

  /**
   * Create a new pin
   */
  async createUserPin(pinData, imageFile) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live database unavailable');

    const creatorId = pinData.creatorId || pinData.creator || 'rose';
    const tagsArray = Array.isArray(pinData.tags)
      ? pinData.tags
      : (pinData.tags ? pinData.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : []);

    let imageUrl = pinData.imageUrl || 'assets/images/logo.png';
    let imagePath = null;

    if (imageFile) {
      const folder = 'user-pins';
      const fileName = `${folder}/${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('archive-pins')
        .upload(fileName, imageFile, { cacheControl: '31536000', upsert: false });
      if (uploadError) {
        console.error('[PinsAPI] Image upload error:', uploadError);
        return { data: null, error: uploadError };
      }
      const { data: { publicUrl } } = supabase.storage.from('archive-pins').getPublicUrl(fileName);
      imageUrl = publicUrl;
      imagePath = fileName;
    }

    const row = {
      title: pinData.title || 'Untitled Pin',
      description: pinData.description || '',
      creator_id: creatorId,
      image_url: imageUrl,
      image_path: imagePath,
      destination_link: pinData.destinationLink || null,
      board_id: pinData.boardId || null,
      user_id: pinData.userId,
      tags: tagsArray,
      is_published: true,
      published_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('pins')
      .insert(row)
      .select('*, creators(id, name, handle, avatar_url), boards(id, name, slug)')
      .single();

    if (error) {
      console.error('[PinsAPI] createUserPin error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  }
};
