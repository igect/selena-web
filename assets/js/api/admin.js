/**
 * Selena Media Archive — Admin Management API
 * Deep module providing complete administrative CRUD, media storage management, and analytics metrics.
 */

import { getSupabase } from './supabase.js';

export const AdminAPI = {
  /**
   * Fetch live counts across pins, creators, boards, and saves
   */
  async fetchDashboardMetrics() {
    const sb = await getSupabase();
    if (!sb) {
      return { totalPins: 0, publishedPins: 0, draftPins: 0, totalCreators: 0, totalBoards: 0, totalSaves: 0 };
    }

    const [pinsRes, creatorsRes, boardsRes, savesRes] = await Promise.all([
      sb.from('pins').select('id, is_published', { count: 'exact' }),
      sb.from('creators').select('id', { count: 'exact' }),
      sb.from('boards').select('id', { count: 'exact' }),
      sb.from('pin_saves').select('id', { count: 'exact' })
    ]);

    const publishedCount = (pinsRes.data || []).filter(p => p.is_published).length;
    const draftCount = (pinsRes.data || []).filter(p => !p.is_published).length;

    return {
      totalPins: pinsRes.count || 0,
      publishedPins: publishedCount,
      draftPins: draftCount,
      totalCreators: creatorsRes.count || 0,
      totalBoards: boardsRes.count || 0,
      totalSaves: savesRes.count || 0
    };
  },

  /**
   * Fetch admin pins catalog including draft/unpublished items
   */
  async fetchAdminPins({ page = 1, pageSize = 20, search = '', creator = 'all', status = 'all' } = {}) {
    const sb = await getSupabase();
    if (!sb) return { pins: [], totalCount: 0, hasMore: false };

    let q = sb
      .from('pins')
      .select(`
        id, legacy_id, title, creator_id, board_id, category,
        image_url, image_path, destination_link, tags, saves_count,
        likes_count, is_published, is_featured, published_at, created_at,
        creators (name),
        boards (name)
      `, { count: 'exact' });

    if (creator !== 'all') q = q.eq('creator_id', creator);
    if (status === 'published') q = q.eq('is_published', true);
    if (status === 'draft') q = q.eq('is_published', false);
    if (status === 'featured') q = q.eq('is_featured', true);
    if (search && search.trim()) {
      q = q.ilike('title', `%${search.trim()}%`);
    }

    q = q.order('created_at', { ascending: false });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    q = q.range(from, to);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      pins: data || [],
      totalCount: count || (data || []).length,
      hasMore: to < (count || 0)
    };
  },

  /**
   * Upload image asset to Supabase Storage bucket 'archive-pins'
   */
  async uploadMedia(file, folder = 'uploads') {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database storage unavailable.');

    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${folder}/${Date.now()}_${sanitized}`;

    const { error } = await sb.storage
      .from('archive-pins')
      .upload(filePath, file, { cacheControl: '31536000', upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = sb.storage.from('archive-pins').getPublicUrl(filePath);

    return { path: filePath, url: publicUrl };
  },

  /**
   * Create new curated pin
   */
  async createAdminPin(pinData, imageFile = null) {
    let imageUrl = pinData.image_url;
    let imagePath = pinData.image_path || null;

    if (imageFile) {
      const uploaded = await this.uploadMedia(imageFile, `pins/${pinData.creator_id || 'general'}`);
      imageUrl = uploaded.url;
      imagePath = uploaded.path;
    }

    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const { data, error } = await sb
      .from('pins')
      .insert({
        creator_id: pinData.creator_id,
        board_id: pinData.board_id || null,
        title: pinData.title,
        description: pinData.description || '',
        category: pinData.category || 'photo',
        image_url: imageUrl,
        image_path: imagePath,
        destination_link: pinData.destination_link || null,
        tags: pinData.tags || [],
        is_published: pinData.is_published !== false,
        is_featured: Boolean(pinData.is_featured),
        aspect_ratio: pinData.aspect_ratio || 1.0,
        published_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update existing pin
   */
  async updateAdminPin(id, pinData, newImageFile = null) {
    let imageUrl = pinData.image_url;
    let imagePath = pinData.image_path;

    if (newImageFile) {
      const uploaded = await this.uploadMedia(newImageFile, `pins/${pinData.creator_id || 'general'}`);
      imageUrl = uploaded.url;
      imagePath = uploaded.path;
    }

    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const payload = {
      title: pinData.title,
      description: pinData.description,
      creator_id: pinData.creator_id,
      board_id: pinData.board_id || null,
      destination_link: pinData.destination_link,
      tags: pinData.tags,
      is_published: pinData.is_published,
      is_featured: pinData.is_featured
    };
    if (imageUrl) payload.image_url = imageUrl;
    if (imagePath) payload.image_path = imagePath;

    const { data, error } = await sb
      .from('pins')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete pin and associated cloud storage media
   */
  async deleteAdminPin(id, imagePath = null) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database service unavailable.');

    const { error } = await sb.from('pins').delete().eq('id', id);
    if (error) throw error;

    if (imagePath && imagePath.startsWith('pins/')) {
      try {
        await sb.storage.from('archive-pins').remove([imagePath]);
      } catch (err) {
        console.warn('[AdminAPI] Storage cleanup warning:', err);
      }
    }
    return true;
  },

  /**
   * Batch update publish status
   */
  async batchPublish(ids, isPublished) {
    const sb = await getSupabase();
    if (!sb || !ids.length) return;
    const { error } = await sb
      .from('pins')
      .update({ is_published: isPublished })
      .in('id', ids);
    if (error) throw error;
  },

  /**
   * Batch delete pins
   */
  async batchDelete(ids) {
    const sb = await getSupabase();
    if (!sb || !ids.length) return;
    const { error } = await sb.from('pins').delete().in('id', ids);
    if (error) throw error;
  }
};
