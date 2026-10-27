/**
 * lib/dal/daily.ts
 *
 * CRUD for daily_entries and related junction/child tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyEntryRow,
  TagRow,
  BrainDumpRow,
} from "@/types/schema";
import type {
  DailyEntryDetail,
} from "@/types/dal";
import { getDayValues } from "./trackables";
import { getRandomIntention } from "./reference";

type Client = SupabaseClient;

// ── Read ──────────────────────────────────────────────────────────────────────

async function assembleDailyEntryDetail(
  client: Client,
  row: DailyEntryRow,
): Promise<DailyEntryDetail> {
  const [values, intention] = await Promise.all([
    getDayValues(client, row.id),

    row.intention_id
      ? client
          .from("intentions")
          .select("*")
          .eq("id", row.intention_id)
          .single()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  return {
    ...row,
    intention,
    values,
  };
}

export async function getDailyEntry(
  client: Client,
  date: string,
): Promise<DailyEntryDetail | null> {
  const { data, error } = await client
    .from("daily_entries")
    .select("*")
    .eq("entry_date", date)
    .maybeSingle();

  if (error) throw new Error(`getDailyEntry(${date}): ${error.message}`);
  if (!data) return null;
  return assembleDailyEntryDetail(client, data as DailyEntryRow);
}

export async function getDailyEntryRow(
  client: Client,
  date: string,
): Promise<DailyEntryRow | null> {
  const { data, error } = await client
    .from("daily_entries")
    .select("*")
    .eq("entry_date", date)
    .maybeSingle();
  if (error) throw new Error(`getDailyEntryRow(${date}): ${error.message}`);
  return data as DailyEntryRow | null;
}

// ── Create / Update ───────────────────────────────────────────────────────────

/**
 * Creates the daily entry for a date and returns its id — called the first
 * time something on that day is saved (visiting a date doesn't create one).
 * If the entry already exists (e.g. saved from another tab meanwhile), its id
 * is returned instead.
 */
export async function createDailyEntry(
  client: Client,
  date: string,
  intentionId: number | null,
): Promise<number> {
  const existing = await getDailyEntryRow(client, date);
  if (existing) return existing.id;

  const { data, error } = await client
    .from("daily_entries")
    .insert({ entry_date: date, intention_id: intentionId })
    .select("id")
    .single();
  if (error) {
    // Lost a race with another save: use the entry that won.
    const raced = await getDailyEntryRow(client, date);
    if (raced) return raced.id;
    throw new Error(`createDailyEntry(${date}): ${error.message}`);
  }
  return (data as { id: number }).id;
}

/**
 * The entry for a date, created if it doesn't exist yet (with a randomly
 * picked intention, as the daily page does on its first save). For saving
 * from outside the daily page, e.g. a daily journal placed on Home.
 */
export async function ensureDailyEntry(client: Client, date: string): Promise<number> {
  const existing = await getDailyEntryRow(client, date);
  if (existing) return existing.id;
  const intention = await getRandomIntention(client);
  return createDailyEntry(client, date, intention?.id ?? null);
}

// ── Brain dumps ───────────────────────────────────────────────────────────────

export async function upsertBrainDump(
  client: Client,
  entryId: number,
  dumpDate: string,
  bodyMd: string,
): Promise<void> {
  if (!bodyMd.trim()) return; // never create an empty brain dump row
  const { data: existing } = await client
    .from("brain_dumps")
    .select("id")
    .eq("entry_id", entryId)
    .maybeSingle();

  if (existing) {
    await client
      .from("brain_dumps")
      .update({ body_md: bodyMd })
      .eq("id", existing.id)
      .throwOnError();
  } else {
    await client
      .from("brain_dumps")
      .insert({ entry_id: entryId, dump_date: dumpDate, body_md: bodyMd })
      .throwOnError();
  }
}

export async function createStandaloneBrainDump(
  client: Client,
  dumpDate: string,
  bodyMd: string,
): Promise<BrainDumpRow> {
  const { data, error } = await client
    .from("brain_dumps")
    .insert({ dump_date: dumpDate, body_md: bodyMd })
    .select()
    .single();
  if (error) throw new Error(`createStandaloneBrainDump: ${error.message}`);
  return data as BrainDumpRow;
}

// ── Recent intention ─────────────────────────────────────────────────────────

/**
 * Finds the most recent daily entry on or before `fromDate` that has an
 * intention set, and returns that intention's value + the entry date.
 */
export async function getRecentIntention(
  client: SupabaseClient,
  fromDate: string,
): Promise<{ value: string; entry_date: string } | null> {
  const { data: entry } = await client
    .from("daily_entries")
    .select("entry_date, intention_id")
    .lte("entry_date", fromDate)
    .not("intention_id", "is", null)
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!entry?.intention_id) return null;

  const { data: intention } = await client
    .from("intentions")
    .select("value")
    .eq("id", entry.intention_id)
    .single();

  return intention
    ? {
        value: intention.value as string,
        entry_date: entry.entry_date as string,
      }
    : null;
}

// ── Brain Dump queries ────────────────────────────────────────────────────────

export interface BrainDumpWithEntry {
  id: number;
  entry_id: number | null;
  dump_date: string;
  body_md: string | null;
  created_at: string;
  updated_at: string;
  entry_date: string | null; // from joined daily_entries, if linked
}

export async function getBrainDumps(
  client: SupabaseClient,
  opts?: {
    search?: string;
    limit?: number;
    offset?: number;
    ascending?: boolean;
  },
): Promise<{ dumps: BrainDumpWithEntry[]; hasMore: boolean }> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const asc = opts?.ascending ?? false;

  // Fetch one extra to detect whether there are more pages
  let q = client
    .from("brain_dumps")
    .select("*, daily_entries(entry_date)")
    .order("dump_date", { ascending: asc })
    .order("created_at", { ascending: asc })
    .range(offset, offset + limit); // range is inclusive, so this fetches limit+1 rows

  if (opts?.search?.trim()) {
    q = q.ilike("body_md", `%${opts.search.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(`getBrainDumps: ${error.message}`);

  const rows = (data ?? []) as (BrainDumpRow & {
    daily_entries: { entry_date: string } | null;
  })[];
  const hasMore = rows.length > limit;

  return {
    dumps: rows.slice(0, limit).map((r) => ({
      ...r,
      entry_date: r.daily_entries?.entry_date ?? null,
    })),
    hasMore,
  };
}

export async function deleteBrainDump(
  client: SupabaseClient,
  id: number,
): Promise<void> {
  await client.from("brain_dumps").delete().eq("id", id).throwOnError();
}

// ── Tag helpers ───────────────────────────────────────────────────────────────

/** Returns the tag with this value, creating it first if it doesn't exist. */
export async function findOrCreateTag(
  client: Client,
  tagValue: string,
): Promise<TagRow> {
  const trimmed = tagValue.trim();
  const { data: existing } = await client
    .from("tags")
    .select("*")
    .eq("tag_value", trimmed)
    .maybeSingle();
  if (existing) return existing as TagRow;

  const { data: created, error } = await client
    .from("tags")
    .insert({ tag_value: trimmed })
    .select("*")
    .single();
  if (error) throw new Error(`findOrCreateTag: ${error.message}`);
  return created as TagRow;
}
