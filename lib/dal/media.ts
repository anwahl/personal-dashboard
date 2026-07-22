/** lib/dal/media.ts */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MediaEntryRow, MediaTypeRow, MediaStatusRow, MediaStatusEntryRow,
} from '@/types/schema';
import type { MediaEntryDetail, MediaEntryInsert, MediaEntryUpdate } from '@/types/dal';

type Client = SupabaseClient;

// ── Enrichment ─────────────────────────────────────────────────────────────────

async function enrich(client: Client, rows: MediaEntryRow[]): Promise<MediaEntryDetail[]> {
  if (rows.length === 0) return [];

  const typeIds  = [...new Set(rows.map(r => r.media_type_id))];
  const entryIds = rows.map(r => r.id);

  const [types, statusEntries, genreEntries] = await Promise.all([
    client.from('media_types').select('*').in('id', typeIds)
      .then(r => (r.data ?? []) as MediaTypeRow[]),

    // All status entries for these media entries, newest first
    client.from('media_status_entries')
      .select('media_entry_id, status_id, status_date')
      .in('media_entry_id', entryIds)
      .order('status_date', { ascending: false })
      .order('id', { ascending: false })
      .then(r => (r.data ?? []) as Pick<MediaStatusEntryRow, 'media_entry_id' | 'status_id' | 'status_date'>[]),

    client.from('media_genre_entries')
      .select('media_entry_id, genre_id')
      .in('media_entry_id', entryIds)
      .then(r => (r.data ?? []) as { media_entry_id: number; genre_id: number }[]),
  ]);

  // Take the first (latest) status entry per media_entry
  const latestByEntry = new Map<number, { status_id: number; status_date: string }>();
  for (const se of statusEntries) {
    if (!latestByEntry.has(se.media_entry_id)) {
      latestByEntry.set(se.media_entry_id, { status_id: se.status_id, status_date: se.status_date });
    }
  }

  // Fetch the actual status rows we need
  const statusIds = [...new Set([...latestByEntry.values()].map(s => s.status_id))];
  const statuses  = statusIds.length > 0
    ? (await client.from('media_statuses').select('*').in('id', statusIds)
        .then(r => (r.data ?? []) as MediaStatusRow[]))
    : [];

  const typeMap   = new Map(types.map(t => [t.id, t]));
  const statusMap = new Map(statuses.map(s => [s.id, s]));
  const genreMap  = genreEntries.reduce<Record<number, number[]>>((acc, ge) => {
    (acc[ge.media_entry_id] ??= []).push(ge.genre_id);
    return acc;
  }, {});

  return rows.map(row => {
    const latest = latestByEntry.get(row.id);
    return {
      ...row,
      media_type:         typeMap.get(row.media_type_id)!,
      current_status:     latest ? (statusMap.get(latest.status_id) ?? null) : null,
      latest_status_date: latest?.status_date ?? null,
      genre_ids:          genreMap[row.id] ?? [],
    };
  });
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

export async function getInProgressMediaEntries(
  client: Client
): Promise<MediaEntryDetail[]> {
  // Entries whose most recent status entry has status_type = 'in_progress'
  const all = await getMediaEntries(client);
  return all.filter(e => e.current_status?.status_type === 'in_progress');
}

export async function getStatusHistory(
  client: Client,
  mediaEntryId: number
): Promise<(MediaStatusEntryRow & { status: MediaStatusRow })[]> {
  const { data: entries, error } = await client
    .from('media_status_entries')
    .select('*')
    .eq('media_entry_id', mediaEntryId)
    .order('status_date', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw new Error(`getStatusHistory: ${error.message}`);
  const rows = (entries ?? []) as MediaStatusEntryRow[];

  const statusIds = [...new Set(rows.map(r => r.status_id))];
  const { data: statuses } = await client
    .from('media_statuses').select('*').in('id', statusIds);

  const statusMap = new Map(((statuses ?? []) as MediaStatusRow[]).map(s => [s.id, s]));
  return rows.map(r => ({ ...r, status: statusMap.get(r.status_id)! }));
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createMediaEntry(
  client: Client,
  data: MediaEntryInsert
): Promise<MediaEntryRow> {
  const { data: row, error } = await client
    .from('media_entries').insert(data).select().single();
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

export async function addMediaStatusEntry(
  client: Client,
  mediaEntryId: number,
  statusId:     number,
  statusDate:   string
): Promise<void> {
  await client
    .from('media_status_entries')
    .insert({ media_entry_id: mediaEntryId, status_id: statusId, status_date: statusDate })
    .throwOnError();
}

// ── Media notes ───────────────────────────────────────────────────────────────

import type { MediaNoteRow } from '@/types/schema';

export async function getMediaNotes(
  client: Client,
  mediaEntryId: number
): Promise<MediaNoteRow[]> {
  const { data, error } = await client
    .from('media_notes').select('*').eq('media_entry_id', mediaEntryId)
    .order('note_date', { ascending: false });
  if (error) throw new Error(`getMediaNotes: ${error.message}`);
  return (data ?? []) as MediaNoteRow[];
}

export async function createMediaNote(
  client: Client,
  mediaEntryId: number,
  noteDate: string,
  bodyMd: string
): Promise<MediaNoteRow> {
  const { data, error } = await client
    .from('media_notes')
    .insert({ media_entry_id: mediaEntryId, note_date: noteDate, body_md: bodyMd })
    .select().single();
  if (error) throw new Error(`createMediaNote: ${error.message}`);
  return data as MediaNoteRow;
}

export async function deleteMediaNote(client: Client, id: number): Promise<void> {
  const { error } = await client.from('media_notes').delete().eq('id', id);
  if (error) throw new Error(`deleteMediaNote: ${error.message}`);
}

// ── Single entry by ID ────────────────────────────────────────────────────────

export async function getMediaEntryById(
  client: Client,
  id: number
): Promise<MediaEntryDetail> {
  const { data, error } = await client
    .from('media_entries').select('*').eq('id', id).single();
  if (error) throw new Error(`getMediaEntryById: ${error.message}`);
  const [enriched] = await enrich(client, [data as MediaEntryRow]);
  if (!enriched) throw new Error(`getMediaEntryById: entry ${id} not found`);
  return enriched;
}
