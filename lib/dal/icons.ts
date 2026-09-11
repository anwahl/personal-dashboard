import type { SupabaseClient } from '@supabase/supabase-js';
import type { IconRow } from '@/types/schema';

type Client = SupabaseClient;

export async function getIcons(
  client: Client,
  includeInactive = false,
): Promise<IconRow[]> {
  let q = client.from('icons').select('*').order('sort_order').order('id');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw new Error(`getIcons: ${error.message}`);
  return data ?? [];
}

export async function createIcon(
  client: Client,
  payload: { name: string; tags: string | null; svg_data: string; sort_order: number },
): Promise<IconRow> {
  const { data, error } = await client
    .from('icons')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createIcon: ${error.message}`);
  return data;
}

export async function updateIcon(
  client: Client,
  id: number,
  patch: Partial<{ name: string; tags: string | null; svg_data: string; sort_order: number; is_active: boolean }>,
): Promise<void> {
  const { error } = await client.from('icons').update(patch).eq('id', id);
  if (error) throw new Error(`updateIcon: ${error.message}`);
}

export async function deleteIcon(client: Client, id: number): Promise<void> {
  const { error } = await client.from('icons').delete().eq('id', id);
  if (error) throw new Error(`deleteIcon: ${error.message}`);
}

/**
 * Set icon_id on any table that has that column.
 * Passing null clears the icon.
 */
export async function setIconId(
  client: Client,
  table: 'daily_trackables' | 'last_time_media' | 'last_time_boolean' | 'last_time_custom' | 'daily_entries',
  id: number,
  icon_id: number | null,
): Promise<void> {
  const { error } = await client.from(table).update({ icon_id }).eq('id', id);
  if (error) throw new Error(`setIconId(${table}): ${error.message}`);
}
