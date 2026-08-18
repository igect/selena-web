/**
 * Selena Media Archive — Admin CMS API
 * Pure live Supabase Admin API for production.
 */

import { getSupabase } from '../supabase-client.js';

export const AdminAPI = {
  /**
   * Fetch Dashboard Metrics
   */
  async fetchDashboardMetrics() {
    const supabase = await getSupabase();
    if (!supabase) {
      return { totalPins: 0, publishedPins: 0, draftPins: 0, totalCreators: 0, totalBoards: 0, totalSaves: 0 };
    }

    const [pinsRes, creatorsRes, boardsRes, savesRes] = await Promise.all([
      supabase.from('pins').select('id, is_published, published_at', { count: 'exact' }),
      supabase.from('creators').select('id', { count: 'exact' }),
      supabase.from('boards').select('id', { count: 'exact' }),
      supabase.from('pin_saves').select('id', { count: 'exact' })
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
   * Fetch Admin Pins Table (including drafts and unpublished pins)
   */
  async fetchAdminPins({ page = 1, pageSize = 20, search = '', creator = 'all', status = 'all' } = {}) {
    const supabase = await getSupabase();
    if (!supabase) return { pins: [], totalCount: 0, hasMore: false };

    let q = supabase
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
   * Upload Image File to Supabase Storage bucket 'archive-pins'
   */
  async uploadImage(file, folder = 'uploads') {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live storage connection unavailable.');

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${folder}/${Date.now()}_${sanitizedName}`;

    const { error } = await supabase.storage
      .from('archive-pins')
      .upload(filePath, file, {
        cacheControl: '31536000',
        upsert: false
      });

    if (error) {
      console.error('[AdminAPI] uploadImage error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('archive-pins')
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: publicUrl
    };
  },

  /**
   * Create New Pin
   */
  async createPin(pinData, imageFile = null) {
    let imageUrl = pinData.image_url;
    let imagePath = pinData.image_path || null;

    if (imageFile) {
      const uploaded = await this.uploadImage(imageFile, `pins/${pinData.creator_id || 'general'}`);
      imageUrl = uploaded.url;
      imagePath = uploaded.path;
    }

    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live database unavailable.');

    const { data, error } = await supabase
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
   * Update Pin
   */
  async updatePin(id, pinData, newImageFile = null) {
    let imageUrl = pinData.image_url;
    let imagePath = pinData.image_path;

    if (newImageFile) {
      const uploaded = await this.uploadImage(newImageFile, `pins/${pinData.creator_id || 'general'}`);
      imageUrl = uploaded.url;
      imagePath = uploaded.path;
    }

    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live database unavailable.');

    const updatePayload = {
      title: pinData.title,
      description: pinData.description,
      creator_id: pinData.creator_id,
      board_id: pinData.board_id || null,
      destination_link: pinData.destination_link,
      tags: pinData.tags,
      is_published: pinData.is_published,
      is_featured: pinData.is_featured
    };
    if (imageUrl) updatePayload.image_url = imageUrl;
    if (imagePath) updatePayload.image_path = imagePath;

    const { data, error } = await supabase
      .from('pins')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete Pin (with storage cleanup)
   */
  async deletePin(id, imagePath = null) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live database unavailable.');

    const { error } = await supabase
      .from('pins')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (imagePath && imagePath.startsWith('pins/')) {
      try {
        await supabase.storage.from('archive-pins').remove([imagePath]);
      } catch (e) {
        console.warn('[AdminAPI] Could not delete storage file:', e);
      }
    }
    return true;
  },

  /**
   * Batch Update Pin Status
   */
  async batchSetPublishStatus(ids, isPublished) {
    const supabase = await getSupabase();
    if (!supabase || !ids.length) return;
    const { error } = await supabase
      .from('pins')
      .update({ is_published: isPublished })
      .in('id', ids);
    if (error) throw error;
  },

  /**
   * Batch Delete Pins
   */
  async batchDeletePins(ids) {
    const supabase = await getSupabase();
    if (!supabase || !ids.length) return;
    const { error } = await supabase
      .from('pins')
      .delete()
      .in('id', ids);
    if (error) throw error;
  }
};
