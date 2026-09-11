/**
 * lib/dal/lasttime.ts
 *
 * Fetches all Last Time Tracker items with their computed last_date.
 *
 * Sources:
 *   last_time_media   → filters media_status_entries by type/genre/status (any combo)
 *   last_time_boolean → derives date from habit_entries → daily_entries
 *   last_time_custom  → reads last_date directly
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { localTodayISO } from "@/lib/utils/dates";
import type {
  LastTimeMediaRow,
  LastTimeBooleanRow,
  LastTimeCustomRow,
} from "@/types/schema";
import type { LastTimeEntry } from "@/types/dal";

type Client = SupabaseClient;

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(
    (Date.now() - new Date(y, m - 1, d).getTime()) / 86_400_000,
  );
}

// ── Media: per-item date computation ─────────────────────────────────────────

/**
 * For a single last_time_media row, finds the most recent status_date
 * across media entries that match ALL non-null filters (type AND genre AND status).
 */
async function computeMediaLastDate(
  client: Client,
  item: LastTimeMediaRow,
): Promise<string | null> {
  // Step 1: narrow down entry IDs by type and/or genre
  let entryIds: number[] | null = null;

  if (item.type_id !== null || item.genre_id !== null) {
    let q = client.from("media_entries").select("id");
    if (item.type_id !== null) q = q.eq("media_type_id", item.type_id);

    const { data: entryRows } = await q;
    let ids = ((entryRows ?? []) as { id: number }[]).map((e) => e.id);

    if (item.genre_id !== null) {
      // Further filter by genre
      let gq = client
        .from("media_genre_entries")
        .select("media_entry_id")
        .eq("genre_id", item.genre_id);
      if (ids.length > 0) gq = gq.in("media_entry_id", ids);
      const { data: genreRows } = await gq;
      ids = ((genreRows ?? []) as { media_entry_id: number }[]).map(
        (r) => r.media_entry_id,
      );
    }

    entryIds = ids;
    if (entryIds.length === 0) return null; // no matching entries → never
  }

  // Step 2: find most recent status entry matching our filters
  let sq = client
    .from("media_status_entries")
    .select("status_date")
    .order("status_date", { ascending: false })
    .limit(1);

  if (item.status_id !== null) sq = sq.eq("status_id", item.status_id);
  if (entryIds !== null) sq = sq.in("media_entry_id", entryIds);

  const { data } = await sq;
  return (
    (data?.[0] as { status_date: string } | undefined)?.status_date ?? null
  );
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function getLastTimeEntries(
  client: Client,
  includeInactive = false,
): Promise<LastTimeEntry[]> {
  let mq = client.from("last_time_media").select("*").order("sort_order");
  let bq = client.from("last_time_boolean").select("*").order("sort_order");
  let cq = client.from("last_time_custom").select("*").order("sort_order");
  if (!includeInactive) {
    mq = mq.eq("is_active", true);
    bq = bq.eq("is_active", true);
    cq = cq.eq("is_active", true);
  }

  const [{ data: mData }, { data: bData }, { data: cData }] = await Promise.all(
    [mq, bq, cq],
  );

  const mediaItems = (mData ?? []) as LastTimeMediaRow[];
  const boolItems = (bData ?? []) as LastTimeBooleanRow[];
  const customItems = (cData ?? []) as LastTimeCustomRow[];

  const results: LastTimeEntry[] = [];

  // ── Media — compute date per item ──
  for (const item of mediaItems) {
    const last_date = await computeMediaLastDate(client, item);
    results.push({
      id: item.id,
      category: "media",
      icon_id: item.icon_id,
      label: item.label,
      last_date,
      days_ago: daysAgo(last_date),
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
  }

  // ── Boolean (habit) ──
  if (boolItems.length) {
    const trackableIds = boolItems.map((b) => b.trackable_id);

    const [{ data: habitRows }, { data: trackables }] = await Promise.all([
      client
        .from("habit_entries")
        .select("trackable_id, daily_entries(entry_date)")
        .in("trackable_id", trackableIds),
      client
        .from("daily_trackables")
        .select("id, name, icon_id")
        .in("id", trackableIds),
    ]);

    const trackableMap = new Map(
      (
        (trackables ?? []) as {
          id: number;
          name: string;
          icon_id: number | null;
        }[]
      ).map((t) => [t.id, t]),
    );

    const latestByTrackable = new Map<number, string>();
    for (const row of (habitRows ?? []) as any[]) {
      const date = row.daily_entries?.entry_date;
      const tid = row.trackable_id;
      if (
        date &&
        (!latestByTrackable.has(tid) || date > latestByTrackable.get(tid)!)
      ) {
        latestByTrackable.set(tid, date);
      }
    }

    for (const item of boolItems) {
      const t = trackableMap.get(item.trackable_id);
      const last_date = latestByTrackable.get(item.trackable_id) ?? null;
      results.push({
        id: item.id,
        category: "boolean",
        icon_id: item.icon_id ?? t?.icon_id ?? null,
        label: t?.name ?? `Trackable ${item.trackable_id}`,
        last_date,
        days_ago: daysAgo(last_date),
        sort_order: item.sort_order,
        is_active: item.is_active,
      });
    }
  }

  // ── Custom ──
  for (const item of customItems) {
    results.push({
      id: item.id,
      category: "custom",
      icon_id: item.icon_id,
      label: item.custom_value,
      last_date: item.last_date,
      days_ago: daysAgo(item.last_date),
      sort_order: item.sort_order,
      is_active: item.is_active,
      custom_id: item.id,
    });
  }

  return results.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function logCustomLastTime(
  client: Client,
  id: number,
  date?: string,
): Promise<void> {
  const today = date ?? localTodayISO();
  await client
    .from("last_time_custom")
    .update({ last_date: today })
    .eq("id", id)
    .throwOnError();
}


export async function getLastTimeMedia(
  client: Client,
): Promise<LastTimeMediaRow[]> {
  const { data, error } = await client
    .from("last_time_media")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(`getLastTimeMedia: ${error.message}`);
  return (data ?? []) as LastTimeMediaRow[];
}

export interface LastTimeMediaPayload {
  label: string;
  icon_id?: number | null;
  type_id: number | null;
  genre_id: number | null;
  status_id: number | null;
  sort_order?: number;
}

export async function createLastTimeMedia(
  client: Client,
  payload: LastTimeMediaPayload,
): Promise<LastTimeMediaRow> {
  const { data, error } = await client
    .from("last_time_media")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createLastTimeMedia: ${error.message}`);
  return data as LastTimeMediaRow;
}

export async function deleteLastTimeMedia(
  client: Client,
  id: number,
): Promise<void> {
  const { error } = await client.from("last_time_media").delete().eq("id", id);
  if (error) throw new Error(`deleteLastTimeMedia: ${error.message}`);
}

// ── Boolean last-time ─────────────────────────────────────────────────────────

export async function getLastTimeBoolean(
  client: Client,
): Promise<LastTimeBooleanRow[]> {
  const { data, error } = await client
    .from("last_time_boolean")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(`getLastTimeBoolean: ${error.message}`);
  return (data ?? []) as LastTimeBooleanRow[];
}

export interface LastTimeBooleanPayload {
  trackable_id: number;
  sort_order: number;
}

export async function createLastTimeBoolean(
  client: Client,
  payload: LastTimeBooleanPayload,
): Promise<LastTimeBooleanRow> {
  const { data, error } = await client
    .from("last_time_boolean")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createLastTimeBoolean: ${error.message}`);
  return data as LastTimeBooleanRow;
}


export async function deleteLastTimeBoolean(
  client: Client,
  id: number,
): Promise<void> {
  const { error } = await client
    .from("last_time_boolean")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`deleteLastTimeBoolean: ${error.message}`);
}

// ── Custom last-time ──────────────────────────────────────────────────────────

export async function getLastTimeCustom(
  client: Client,
): Promise<LastTimeCustomRow[]> {
  const { data, error } = await client
    .from("last_time_custom")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(`getLastTimeCustom: ${error.message}`);
  return (data ?? []) as LastTimeCustomRow[];
}

export interface LastTimeCustomPayload {
  custom_value: string;
  icon_id?: number | null;
  sort_order?: number;
}

export async function createLastTimeCustom(
  client: Client,
  payload: LastTimeCustomPayload,
): Promise<LastTimeCustomRow> {
  const { data, error } = await client
    .from("last_time_custom")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createLastTimeCustom: ${error.message}`);
  return data as LastTimeCustomRow;
}

export async function deleteLastTimeCustom(
  client: Client,
  id: number,
): Promise<void> {
  const { error } = await client.from("last_time_custom").delete().eq("id", id);
  if (error) throw new Error(`deleteLastTimeCustom: ${error.message}`);
}

// ── Update functions ──────────────────────────────────────────────────────────

export async function updateLastTimeMedia(
  client: Client,
  id: number,
  payload: Partial<LastTimeMediaPayload>,
): Promise<void> {
  const { error } = await client
    .from("last_time_media")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(`updateLastTimeMedia: ${error.message}`);
}

export async function updateLastTimeCustom(
  client: Client,
  id: number,
  payload: Partial<LastTimeCustomPayload>,
): Promise<void> {
  const { error } = await client
    .from("last_time_custom")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(`updateLastTimeCustom: ${error.message}`);
}
