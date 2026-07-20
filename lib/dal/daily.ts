/**
 * lib/dal/daily.ts
 *
 * CRUD for daily_entries and related junction/child tables.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DailyEntryRow,
  HabitEntryRow,
  TagEntryRow,
  PrescriptionEntryRow,
  BrainDumpRow,
  DailyNumericEntryRow,
} from '@/types/schema';
import type {
  DailyEntryDetail,
  DailyEntryUpdate,
  WeekDayData,
} from '@/types/dal';
import { getRandomIntention } from './reference';

type Client = SupabaseClient;

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Local date — avoids UTC/server timezone mismatch. */
export function localTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Server-side ISO — use only where timezone drift doesn't matter (DAL range queries). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function getWeekDates(anchorDate: string): string[] {
  const d = new Date(anchorDate + 'T12:00:00');
  const dow = d.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const wd = new Date(d);
    wd.setDate(d.getDate() - dow + i);
    return wd.toISOString().slice(0, 10);
  });
}

// ── Read ──────────────────────────────────────────────────────────────────────

async function assembleDailyEntryDetail(
  client: Client,
  row: DailyEntryRow
): Promise<DailyEntryDetail> {
  const [booleanEntries, tagEntries, prescriptionEntries, numericEntries, brainDump, intention] =
    await Promise.all([
      client
        .from('habit_entries')
        .select('trackable_id')
        .eq('entry_id', row.id)
        .then(r => (r.data ?? []) as Pick<HabitEntryRow, 'trackable_id'>[]),

      client
        .from('tag_entries')
        .select('tag_id')
        .eq('entry_id', row.id)
        .then(r => (r.data ?? []) as Pick<TagEntryRow, 'tag_id'>[]),

      client
        .from('prescription_entries')
        .select('prescription_id')
        .eq('entry_id', row.id)
        .then(r => (r.data ?? []) as Pick<PrescriptionEntryRow, 'prescription_id'>[]),

      client
        .from('daily_numeric_entries')
        .select('*')
        .eq('entry_id', row.id)
        .then(r => (r.data ?? []) as DailyNumericEntryRow[]),

      client
        .from('brain_dumps')
        .select('id, body_md')
        .eq('entry_id', row.id)
        .maybeSingle()
        .then(r => r.data as { id: number; body_md: string | null } | null),

      row.intention_id
        ? client
            .from('intentions')
            .select('*')
            .eq('id', row.intention_id)
            .single()
            .then(r => r.data)
        : Promise.resolve(null),
    ]);

  return {
    ...row,
    intention,
    checked_trackable_ids: booleanEntries.map(h => h.trackable_id),
    tag_ids:               tagEntries.map(t => t.tag_id),
    prescription_ids:      prescriptionEntries.map(p => p.prescription_id),
    numeric_entries:       numericEntries,
    brain_dump:            brainDump,
  };
}

export async function getDailyEntry(
  client: Client,
  date: string
): Promise<DailyEntryDetail | null> {
  const { data, error } = await client
    .from('daily_entries')
    .select('*')
    .eq('entry_date', date)
    .maybeSingle();

  if (error) throw new Error(`getDailyEntry(${date}): ${error.message}`);
  if (!data) return null;
  return assembleDailyEntryDetail(client, data as DailyEntryRow);
}

export async function getDailyEntryRow(
  client: Client,
  date: string
): Promise<DailyEntryRow | null> {
  const { data, error } = await client
    .from('daily_entries')
    .select('*')
    .eq('entry_date', date)
    .maybeSingle();
  if (error) throw new Error(`getDailyEntryRow(${date}): ${error.message}`);
  return data as DailyEntryRow | null;
}

export async function getDailyEntryRows(
  client: Client,
  fromDate: string,
  toDate: string
): Promise<DailyEntryRow[]> {
  const { data, error } = await client
    .from('daily_entries')
    .select('*')
    .gte('entry_date', fromDate)
    .lte('entry_date', toDate)
    .order('entry_date', { ascending: true });

  if (error) throw new Error(`getDailyEntryRows: ${error.message}`);
  return (data ?? []) as DailyEntryRow[];
}

export async function getWeekData(
  client: Client,
  anchorDate: string
): Promise<WeekDayData[]> {
  const dates = getWeekDates(anchorDate);
  const rows = await getDailyEntryRows(client, dates[0], dates[6]);
  const rowsByDate = new Map(rows.map(r => [r.entry_date, r]));

  const entryIds = rows.map(r => r.id);
  let booleanEntries: Pick<HabitEntryRow, 'entry_id' | 'trackable_id'>[] = [];

  if (entryIds.length > 0) {
    const { data } = await client
      .from('habit_entries')
      .select('entry_id, trackable_id')
      .in('entry_id', entryIds);
    booleanEntries = (data ?? []) as typeof booleanEntries;
  }

  const byEntry = booleanEntries.reduce<Record<number, number[]>>((acc, h) => {
    (acc[h.entry_id] ??= []).push(h.trackable_id);
    return acc;
  }, {});

  return dates.map(date => {
    const entry = rowsByDate.get(date) ?? null;
    return {
      date,
      entry,
      checked_trackable_ids: entry ? (byEntry[entry.id] ?? []) : [],
    };
  });
}

// ── Create / Update ───────────────────────────────────────────────────────────

export async function ensureDailyEntry(
  client: Client,
  date: string
): Promise<DailyEntryDetail> {
  const existing = await getDailyEntry(client, date);
  if (existing) return existing;

  const intention = await getRandomIntention(client);

  const { data, error } = await client
    .from('daily_entries')
    .insert({ entry_date: date, intention_id: intention?.id ?? null })
    .select()
    .single();

  if (error) throw new Error(`ensureDailyEntry(${date}): ${error.message}`);
  return assembleDailyEntryDetail(client, data as DailyEntryRow);
}

export async function updateDailyEntry(
  client: Client,
  entryId: number,
  fields: DailyEntryUpdate
): Promise<void> {
  const { error } = await client
    .from('daily_entries')
    .update(fields)
    .eq('id', entryId);
  if (error) throw new Error(`updateDailyEntry(${entryId}): ${error.message}`);
}

// ── Tag entries ───────────────────────────────────────────────────────────────

export async function toggleTagEntry(
  client: Client,
  entryId: number,
  tagId: number,
  active: boolean
): Promise<void> {
  if (active) {
    await client
      .from('tag_entries')
      .upsert({ entry_id: entryId, tag_id: tagId }, { onConflict: 'entry_id,tag_id' })
      .throwOnError();
  } else {
    await client
      .from('tag_entries')
      .delete()
      .eq('entry_id', entryId)
      .eq('tag_id', tagId)
      .throwOnError();
  }
}

// ── Prescription entries ──────────────────────────────────────────────────────

export async function togglePrescriptionEntry(
  client: Client,
  entryId: number,
  prescriptionId: number,
  taken: boolean
): Promise<void> {
  if (taken) {
    await client
      .from('prescription_entries')
      .upsert(
        { entry_id: entryId, prescription_id: prescriptionId },
        { onConflict: 'entry_id,prescription_id' }
      )
      .throwOnError();
  } else {
    await client
      .from('prescription_entries')
      .delete()
      .eq('entry_id', entryId)
      .eq('prescription_id', prescriptionId)
      .throwOnError();
  }
}

// ── Brain dumps ───────────────────────────────────────────────────────────────

export async function upsertBrainDump(
  client: Client,
  entryId: number,
  dumpDate: string,
  bodyMd: string
): Promise<void> {
  const { data: existing } = await client
    .from('brain_dumps')
    .select('id')
    .eq('entry_id', entryId)
    .maybeSingle();

  if (existing) {
    await client.from('brain_dumps').update({ body_md: bodyMd }).eq('id', existing.id).throwOnError();
  } else {
    await client
      .from('brain_dumps')
      .insert({ entry_id: entryId, dump_date: dumpDate, body_md: bodyMd })
      .throwOnError();
  }
}

export async function createStandaloneBrainDump(
  client: Client,
  dumpDate: string,
  bodyMd: string
): Promise<BrainDumpRow> {
  const { data, error } = await client
    .from('brain_dumps')
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
  fromDate: string
): Promise<{ value: string; entry_date: string } | null> {
  const { data: entry } = await client
    .from('daily_entries')
    .select('entry_date, intention_id')
    .lte('entry_date', fromDate)
    .not('intention_id', 'is', null)
    .order('entry_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!entry?.intention_id) return null;

  const { data: intention } = await client
    .from('intentions')
    .select('value')
    .eq('id', entry.intention_id)
    .single();

  return intention ? { value: intention.value as string, entry_date: entry.entry_date as string } : null;
}

// ── Brain Dump queries ────────────────────────────────────────────────────────

export interface BrainDumpWithEntry {
  id:         number;
  entry_id:   number | null;
  dump_date:  string;
  body_md:    string | null;
  created_at: string;
  updated_at: string;
  entry_date: string | null;  // from joined daily_entries, if linked
}

export async function getBrainDumps(
  client: SupabaseClient,
  opts?: {
    search?:  string;
    limit?:   number;
    offset?:  number;
    ascending?: boolean;
  }
): Promise<{ dumps: BrainDumpWithEntry[]; hasMore: boolean }> {
  const limit  = opts?.limit  ?? 20;
  const offset = opts?.offset ?? 0;
  const asc    = opts?.ascending ?? false;

  // Fetch one extra to detect whether there are more pages
  let q = client
    .from('brain_dumps')
    .select('*, daily_entries(entry_date)')
    .order('dump_date', { ascending: asc })
    .order('created_at', { ascending: asc })
    .range(offset, offset + limit);   // range is inclusive, so this fetches limit+1 rows

  if (opts?.search?.trim()) {
    q = q.ilike('body_md', `%${opts.search.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(`getBrainDumps: ${error.message}`);

  const rows = (data ?? []) as (BrainDumpRow & { daily_entries: { entry_date: string } | null })[];
  const hasMore = rows.length > limit;

  return {
    dumps: rows.slice(0, limit).map(r => ({
      ...r,
      entry_date: r.daily_entries?.entry_date ?? null,
    })),
    hasMore,
  };
}

export async function updateBrainDump(
  client: SupabaseClient,
  id:     number,
  bodyMd: string
): Promise<void> {
  await client.from('brain_dumps').update({ body_md: bodyMd }).eq('id', id).throwOnError();
}

export async function deleteBrainDump(
  client: SupabaseClient,
  id: number
): Promise<void> {
  await client.from('brain_dumps').delete().eq('id', id).throwOnError();
}
