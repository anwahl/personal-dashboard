/**
 * lib/dal/lasttime.ts
 *
 * Fetches all Last Time Tracker items with their computed last_date.
 *
 * Sources:
 *   last_time_media   → derives date from media_status_entries
 *   last_time_boolean → derives date from habit_entries → daily_entries
 *   last_time_custom  → reads last_date directly
 *
 * Returns a flat array of LastTimeEntry sorted by sort_order.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LastTimeMediaRow, LastTimeBooleanRow, LastTimeCustomRow,
} from '@/types/schema';
import type { LastTimeEntry } from '@/types/dal';

type Client = SupabaseClient;

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const diff = Math.floor(
    (Date.now() - new Date(y, m - 1, d).getTime()) / 86_400_000
  );
  return diff;
}

// ── Media: date maps by flag type ─────────────────────────────────────────────

async function buildMediaDateMaps(client: Client): Promise<{
  byType:   Map<number, string>;
  byGenre:  Map<number, string>;
  byStatus: Map<number, string>;
}> {
  // Fetch all status entries (newest first) + their media entry's type
  const [{ data: seData }, { data: entries }, { data: genreEntries }] = await Promise.all([
    client
      .from('media_status_entries')
      .select('media_entry_id, status_id, status_date')
      .order('status_date', { ascending: false })
      .order('id', { ascending: false }),
    client.from('media_entries').select('id, media_type_id'),
    client.from('media_genre_entries').select('media_entry_id, genre_id'),
  ]);

  const typeById  = new Map(((entries ?? []) as { id: number; media_type_id: number }[]).map(e => [e.id, e.media_type_id]));
  const genreMap  = new Map<number, number[]>(); // entry_id → genre_ids
  for (const ge of ((genreEntries ?? []) as { media_entry_id: number; genre_id: number }[])) {
    (genreMap.get(ge.media_entry_id) ?? genreMap.set(ge.media_entry_id, []).get(ge.media_entry_id)!).push(ge.genre_id);
  }

  const byType   = new Map<number, string>();
  const byGenre  = new Map<number, string>();
  const byStatus = new Map<number, string>();

  for (const se of ((seData ?? []) as { media_entry_id: number; status_id: number; status_date: string }[])) {
    const typeId = typeById.get(se.media_entry_id);
    if (typeId && !byType.has(typeId)) byType.set(typeId, se.status_date);
    if (!byStatus.has(se.status_id)) byStatus.set(se.status_id, se.status_date);
    for (const genreId of genreMap.get(se.media_entry_id) ?? []) {
      if (!byGenre.has(genreId)) byGenre.set(genreId, se.status_date);
    }
  }

  return { byType, byGenre, byStatus };
}

// ── Label resolution ─────────────────────────────────────────────────────────

async function resolveMediaLabels(
  client: Client,
  items: LastTimeMediaRow[]
): Promise<Map<number, string>> {
  const typeIds   = items.filter(i => i.last_time_flag === 'type'  ).map(i => i.flag_value);
  const genreIds  = items.filter(i => i.last_time_flag === 'genre' ).map(i => i.flag_value);
  const statusIds = items.filter(i => i.last_time_flag === 'status').map(i => i.flag_value);

  const [types, genres, statuses] = await Promise.all([
    typeIds.length   ? client.from('media_types').select('id, type_name').in('id', typeIds).then(r => r.data ?? []) : Promise.resolve([]),
    genreIds.length  ? client.from('media_genres').select('id, genre_name').in('id', genreIds).then(r => r.data ?? []) : Promise.resolve([]),
    statusIds.length ? client.from('media_statuses').select('id, status_name').in('id', statusIds).then(r => r.data ?? []) : Promise.resolve([]),
  ]);

  const map = new Map<number, string>(); // item.id → label
  const nameById = new Map<number, string>([
    ...((types   as { id: number; type_name: string }[])  .map(t => [t.id, t.type_name]   as [number, string])),
    ...((genres  as { id: number; genre_name: string }[]) .map(g => [g.id, g.genre_name]  as [number, string])),
    ...((statuses as { id: number; status_name: string }[]).map(s => [s.id, s.status_name] as [number, string])),
  ]);

  for (const item of items) {
    map.set(item.id, item.label ?? nameById.get(item.flag_value) ?? `#${item.flag_value}`);
  }
  return map;
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function getLastTimeEntries(
  client: Client,
  includeInactive = false
): Promise<LastTimeEntry[]> {
  let mq = client.from('last_time_media').select('*').order('sort_order');
  let bq = client.from('last_time_boolean').select('*').order('sort_order');
  let cq = client.from('last_time_custom').select('*').order('sort_order');
  if (!includeInactive) { mq = mq.eq('is_active', true); bq = bq.eq('is_active', true); cq = cq.eq('is_active', true); }

  const [{ data: mData }, { data: bData }, { data: cData }] = await Promise.all([mq, bq, cq]);

  const mediaItems   = (mData  ?? []) as LastTimeMediaRow[];
  const boolItems    = (bData  ?? []) as LastTimeBooleanRow[];
  const customItems  = (cData  ?? []) as LastTimeCustomRow[];

  const results: LastTimeEntry[] = [];

  // ── Media ──
  if (mediaItems.length) {
    const [dateMaps, labelMap] = await Promise.all([
      buildMediaDateMaps(client),
      resolveMediaLabels(client, mediaItems),
    ]);

    for (const item of mediaItems) {
      const dateMap =
        item.last_time_flag === 'type'   ? dateMaps.byType   :
        item.last_time_flag === 'genre'  ? dateMaps.byGenre  :
                                           dateMaps.byStatus;
      const last_date = dateMap.get(item.flag_value) ?? null;
      results.push({
        id:         item.id,
        category:   'media',
        emoji:      item.emoji,
        label:      labelMap.get(item.id) ?? '',
        last_date,
        days_ago:   daysAgo(last_date),
        sort_order: item.sort_order,
        is_active:  item.is_active,
      });
    }
  }

  // ── Boolean (habit) ──
  if (boolItems.length) {
    const trackableIds = boolItems.map(b => b.trackable_id);

    // Get most recent habit_entry date per trackable
    const { data: habitRows } = await client
      .from('habit_entries')
      .select('trackable_id, daily_entries(entry_date)')
      .in('trackable_id', trackableIds)
      .order('trackable_id');

    // Also get trackable names + emojis
    const { data: trackables } = await client
      .from('daily_trackables')
      .select('id, name, emoji')
      .in('id', trackableIds);

    const trackableMap = new Map(
      ((trackables ?? []) as { id: number; name: string; emoji: string | null }[]).map(t => [t.id, t])
    );

    // Compute latest date per trackable
    const latestByTrackable = new Map<number, string>();
    for (const row of ((habitRows ?? []) as any[])) {
      const date = row.daily_entries?.entry_date;
      const tid  = row.trackable_id;
      if (date && (!latestByTrackable.has(tid) || date > latestByTrackable.get(tid)!)) {
        latestByTrackable.set(tid, date);
      }
    }

    for (const item of boolItems) {
      const t = trackableMap.get(item.trackable_id);
      const last_date = latestByTrackable.get(item.trackable_id) ?? null;
      results.push({
        id:         item.id,
        category:   'boolean',
        emoji:      item.emoji ?? t?.emoji ?? null,
        label:      t?.name ?? `Trackable ${item.trackable_id}`,
        last_date,
        days_ago:   daysAgo(last_date),
        sort_order: item.sort_order,
        is_active:  item.is_active,
      });
    }
  }

  // ── Custom ──
  for (const item of customItems) {
    results.push({
      id:         item.id,
      category:   'custom',
      emoji:      item.emoji,
      label:      item.custom_value,
      last_date:  item.last_date,
      days_ago:   daysAgo(item.last_date),
      sort_order: item.sort_order,
      is_active:  item.is_active,
      custom_id:  item.id,
    });
  }

  return results.sort((a, b) => a.sort_order - b.sort_order);
}

// ── Writes ────────────────────────────────────────────────────────────────────

/** Log a custom last-time item as done today */
export async function logCustomLastTime(
  client: Client,
  id: number,
  date?: string
): Promise<void> {
  const today = date ?? new Date().toISOString().slice(0, 10);
  await client
    .from('last_time_custom')
    .update({ last_date: today })
    .eq('id', id)
    .throwOnError();
}
