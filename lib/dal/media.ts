/** lib/dal/media.ts */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MediaEntryRow, MediaTypeRow, MediaStatusRow } from '@/types/schema';
import type { MediaEntryDetail, MediaEntryInsert, MediaEntryUpdate } from '@/types/dal';

type Client = SupabaseClient;

async function enrich(client: Client, rows: MediaEntryRow[]): Promise<MediaEntryDetail[]> {
  if (rows.length === 0) return [];

  const typeIds   = [...new Set(rows.map(r => r.media_type_id))];
  const statusIds = [...new Set(rows.map(r => r.status_id).filter(Boolean) as number[])];
  const entryIds  = rows.map(r => r.id);

  const [types, statuses, genreEntries] = await Promise.all([
    client.from('media_types').select('*').in('id', typeIds)
      .then(r => (r.data ?? []) as MediaTypeRow[]),
    statusIds.length > 0
      ? client.from('media_statuses').select('*').in('id', statusIds).then(r => (r.data ?? []) as MediaStatusRow[])
      : Promise.resolve([]),
    client.from('media_genre_entries').select('media_entry_id, genre_id').in('media_entry_id', entryIds)
      .then(r => (r.data ?? []) as { media_entry_id: number; genre_id: number }[]),
  ]);

  const typeMap   = new Map(types.map(t => [t.id, t]));
  const statusMap = new Map(statuses.map(s => [s.id, s]));
  const genreMap  = genreEntries.reduce<Record<number, number[]>>((acc, ge) => {
    if (!acc[ge.media_entry_id]) acc[ge.media_entry_id] = [];
    acc[ge.media_entry_id].push(ge.genre_id);
    return acc;
  }, {});

  return rows.map(row => ({
    ...row,
    media_type: typeMap.get(row.media_type_id)!,
    status:     row.status_id ? (statusMap.get(row.status_id) ?? null) : null,
    genre_ids:  genreMap[row.id] ?? [],
  }));
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getMediaEntries(
  client: Client,
  options?: { mediaTypeId?: number }
): Promise<MediaEntryDetail[]> {
  let q = client.from('media_entries').select('*').order('sort_order').order('title');
  if (options?.mediaTypeId != null) q = q.eq('media_type_id', options.mediaTypeId);

  const { data, error } = await q;
  if (error) throw new Error(`getMediaEntries: ${error.message}`);
  return enrich(client, (data ?? []) as MediaEntryRow[]);
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createMediaEntry(
  client: Client,
  data: MediaEntryInsert
): Promise<MediaEntryRow> {
  const { data: row, error } = await client
    .from('media_entries')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`createMediaEntry: ${error.message}`);
  return row as MediaEntryRow;
}

export async function updateMediaEntry(
  client: Client,
  id:   number,
  data: MediaEntryUpdate
): Promise<void> {
  const { error } = await client.from('media_entries').update(data).eq('id', id);
  if (error) throw new Error(`updateMediaEntry: ${error.message}`);
}

export async function deleteMediaEntry(client: Client, id: number): Promise<void> {
  const { error } = await client.from('media_entries').delete().eq('id', id);
  if (error) throw new Error(`deleteMediaEntry: ${error.message}`);
}
