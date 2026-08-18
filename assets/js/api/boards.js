/**
 * Selena Media Archive — Boards API
 * Deep module managing curated system collections and custom user boards.
 */

import { getSupabase } from './supabase.js';

export const BoardsAPI = {
  /**
   * Fetch boards visible to user (system boards + own custom boards)
   */
  async fetchBoards(userId = null) {
    const sb = await getSupabase();
    if (!sb) return [];

    let q = sb
      .from('boards')
      .select('*, creators(name, handle, avatar_url)')
      .order('name');

    if (userId) {
      q = q.or(`is_system.eq.true,user_id.eq.${userId}`);
    } else {
      q = q.eq('is_system', true);
    }

    const { data, error } = await q;
    if (error) {
      console.error('[BoardsAPI] fetchBoards error:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Fetch single board by UUID or slug
   */
  async fetchBoardById(idOrSlug) {
    const sb = await getSupabase();
    if (!sb) return null;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    let q = sb.from('boards').select('*, creators(name, handle, avatar_url)');

    if (isUUID) {
      q = q.eq('id', idOrSlug);
    } else {
      q = q.eq('slug', idOrSlug);
    }

    const { data, error } = await q.maybeSingle();
    if (error || !data) return null;
    return data;
  },

  /**
   * Create a new custom board for user
   */
  async createBoard(name, userId, description = '') {
    if (!userId) throw new Error('Authentication required to create a board.');
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `board-${Date.now()}`;

    const { data, error } = await sb
      .from('boards')
      .insert({
        name: name.trim(),
        slug,
        description: description.trim() || null,
        user_id: userId,
        is_system: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a custom user board
   */
  async deleteBoard(boardId, userId) {
    const sb = await getSupabase();
    if (!sb || !userId) return false;

    const { error } = await sb
      .from('boards')
      .delete()
      .match({ id: boardId, user_id: userId });

    if (error) throw error;
    return true;
  }
};
