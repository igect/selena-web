/**
 * Selena Media Archive — Pins & Interactions API
 * Deep module encapsulating PostgreSQL pin queries, full-text search, saves, reactions, and uploads.
 */

import { CONFIG } from '../config.js';
import { getSupabase } from './supabase.js';

export const PinsAPI = {
  /**
   * Fetch paginated list of pins with multi-criteria filtering
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
    const sb = await getSupabase();
    if (!sb) return { pins: [], totalCount: 0, hasMore: false };

    let q = sb
      .from('pins')
      .select(`
        id, legacy_id, creator_id, board_id, user_id, title, description, category,
        image_url, image_path, aspect_ratio, destination_link, tags,
        saves_count, likes_count, is_published, is_featured, published_at, created_at,
        creators (id, name, handle, avatar_url),
        boards (id, name, slug)
      `, { count: 'exact' });

    // Published pins only for regular catalog queries
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
      const clean = query.trim();
      q = q.or(`title.ilike.%${clean}%,description.ilike.%${clean}%`);
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

    const formatted = (data || []).map(p => this.formatPinRow(p));

    return {
      pins: formatted,
      totalCount: count || formatted.length,
      hasMore: to < (count || 0)
    };
  },

  /**
   * Fetch single pin by UUID or legacy_id
   */
  async fetchPinById(id) {
    const sb = await getSupabase();
    if (!sb) return null;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let q = sb
      .from('pins')
      .select(`
        *,
        creators (id, name, handle, avatar_url, follower_count),
        boards (id, name, slug)
      `);

    if (isUUID) {
      q = q.or(`id.eq.${id},legacy_id.eq.${id}`);
    } else {
      q = q.eq('legacy_id', id);
    }

    const { data, error } = await q.maybeSingle();
    if (error || !data) return null;
    return this.formatPinRow(data);
  },

  /**
   * Fetch related pins ("More like this")
   */
  async fetchRelatedPins(currentPinId, creatorId = null, limit = 8) {
    const sb = await getSupabase();
    if (!sb) return [];

    let q = sb
      .from('pins')
      .select(`
        id, legacy_id, title, creator_id, image_url, saves_count, likes_count, published_at,
        creators (name, avatar_url)
      `)
      .eq('is_published', true)
      .neq('id', currentPinId)
      .limit(limit);

    if (creatorId && creatorId !== 'all') {
      q = q.eq('creator_id', creatorId);
    } else {
      q = q.order('saves_count', { ascending: false });
    }

    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(p => this.formatPinRow(p));
  },

  /**
   * Fetch all creators
   */
  async fetchCreators() {
    const sb = await getSupabase();
    if (!sb) return [];

    const { data, error } = await sb
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
   * Toggle Pin Save (Bookmark)
   */
  async toggleSave(pinId, userId, isSaved) {
    const sb = await getSupabase();
    if (!sb || !userId) return;

    if (isSaved) {
      const { error } = await sb
        .from('pin_saves')
        .delete()
        .match({ pin_id: pinId, user_id: userId });
      if (error) console.error('[PinsAPI] toggleSave delete error:', error);
    } else {
      const { error } = await sb
        .from('pin_saves')
        .insert({ pin_id: pinId, user_id: userId });
      if (error) console.error('[PinsAPI] toggleSave insert error:', error);
    }
  },

  /**
   * Toggle Reaction (love, sparkle, fire)
   */
  async toggleReaction(pinId, userId, reactionType, hasReacted) {
    const sb = await getSupabase();
    if (!sb || !userId) return;

    if (hasReacted) {
      const { error } = await sb
        .from('pin_reactions')
        .delete()
        .match({ pin_id: pinId, user_id: userId, reaction_type: reactionType });
      if (error) console.error('[PinsAPI] toggleReaction delete error:', error);
    } else {
      const { error } = await sb
        .from('pin_reactions')
        .insert({ pin_id: pinId, user_id: userId, reaction_type: reactionType });
      if (error) console.error('[PinsAPI] toggleReaction insert error:', error);
    }
  },

  /**
   * Fetch comments for a pin
   */
  async fetchComments(pinId) {
    const sb = await getSupabase();
    if (!sb) return [];

    const { data, error } = await sb
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
    const sb = await getSupabase();
    if (!sb || !userId) throw new Error('Authentication required.');

    const { data, error } = await sb
      .from('comments')
      .insert({
        pin_id: pinId,
        user_id: userId,
        content: content.trim(),
        user_name: userName,
        user_avatar: userAvatar
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a user pin with optional image upload to Supabase Storage
   */
  async createPin(pinData, imageFile = null) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    let imageUrl = pinData.imageUrl || 'assets/images/logo.png';
    let imagePath = null;

    if (imageFile) {
      const folder = 'user-pins';
      const sanitized = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${folder}/${Date.now()}_${sanitized}`;

      const { error: uploadError } = await sb.storage
        .from('archive-pins')
        .upload(fileName, imageFile, { cacheControl: '31536000', upsert: false });

      if (uploadError) {
        console.error('[PinsAPI] Image upload failed:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = sb.storage.from('archive-pins').getPublicUrl(fileName);
      imageUrl = publicUrl;
      imagePath = fileName;
    }

    const tagsArray = Array.isArray(pinData.tags)
      ? pinData.tags
      : (pinData.tags ? pinData.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : []);

    const row = {
      title: pinData.title || 'Untitled Pin',
      description: pinData.description || '',
      creator_id: pinData.creatorId || pinData.creator || 'rose',
      board_id: pinData.boardId || null,
      user_id: pinData.userId || null,
      image_url: imageUrl,
      image_path: imagePath,
      destination_link: pinData.destinationLink || null,
      tags: tagsArray,
      category: pinData.category || 'photo',
      is_published: true,
      published_at: new Date().toISOString()
    };

    const { data, error } = await sb
      .from('pins')
      .insert(row)
      .select('*, creators(id, name, handle, avatar_url), boards(id, name, slug)')
      .single();

    if (error) throw error;
    return this.formatPinRow(data);
  },

  /**
   * Normalizes raw database row into uniform Pin schema
   */
  formatPinRow(p) {
    if (!p) return null;
    return {
      id: p.id,
      legacyId: p.legacy_id,
      title: p.title,
      creator: p.creator_id,
      creatorName: p.creators?.name || p.creator_id,
      creatorHandle: p.creators?.handle || '',
      creatorAvatar: p.creators?.avatar_url || 'assets/images/logo.png',
      creatorFollowers: p.creators?.follower_count || 0,
      category: p.category,
      date: p.published_at?.split('T')[0] || p.created_at?.split('T')[0] || '',
      img: CONFIG.resolveImageUrl(p.image_url),
      imagePath: p.image_path,
      board: p.boards?.name || 'General',
      boardId: p.board_id,
      description: p.description || '',
      destinationLink: p.destination_link || '',
      tags: p.tags || [],
      savesCount: p.saves_count || 0,
      likesCount: p.likes_count || 0,
      isPublished: p.is_published,
      isFeatured: p.is_featured
    };
  }
};
