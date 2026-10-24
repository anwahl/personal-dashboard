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
