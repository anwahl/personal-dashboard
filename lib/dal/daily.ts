/**
 * lib/dal/daily.ts
 *
 * CRUD for daily_entries and all related junction/child tables.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DailyEntryRow, HabitEntryRow, TagEntryRow, PrescriptionEntryRow, BrainDumpRow } from '@/types/schema';
import type {
  DailyEntryDetail,
  DailyEntryInsert,
  DailyEntryUpdate,
  WeekDayData,
  BrainDumpInsert,
  BrainDumpUpdate,
} from '@/types/dal';
import { getRandomIntention } from './reference';

type Client = SupabaseClient;

// ── Date helpers ──────────────────────────────────────────────────────────────

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
  const dayOfWeek = d.getDay(); // 0 = Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const wd = new Date(d);
    wd.setDate(d.getDate() - dayOfWeek + i);
    return wd.toISOString().slice(0, 10);
  });
}

// ── Read ──────────────────────────────────────────────────────────────────────

async function assembleDailyEntryDetail(
  client: Client,
  row: DailyEntryRow
): Promise<DailyEntryDetail> {
  const [habitEntries, tagEntries, prescriptionEntries, brainDump, intention] =
    await Promise.all([
      client
        .from('habit_entries')
        .select('habit_id')
        .eq('entry_id', row.id)
        .then(r => (r.data ?? []) as Pick<HabitEntryRow, 'habit_id'>[]),

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
    habit_ids:        habitEntries.map(h => h.habit_id),
    tag_ids:          tagEntries.map(t => t.tag_id),
    prescription_ids: prescriptionEntries.map(p => p.prescription_id),
    brain_dump:       brainDump,
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

/** Fetch the raw row — used for analytics where joins aren't needed. */
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

/** Fetch raw rows for a date range (analytics, sparklines, heatmaps). */
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

/** Fetch a week's worth of data for the weekly strip widget. */
export async function getWeekData(
  client: Client,
  anchorDate: string
): Promise<WeekDayData[]> {
  const dates = getWeekDates(anchorDate);
  const [fromDate, toDate] = [dates[0], dates[6]];

  const [rows, habitEntries] = await Promise.all([
    getDailyEntryRows(client, fromDate, toDate),
    client
      .from('habit_entries')
      .select('entry_id, habit_id')
      .gte('entry_id', 0) // will refine below after getting entry IDs
      .then(r => (r.data ?? []) as Pick<HabitEntryRow, 'entry_id' | 'habit_id'>[]),
  ]);

  const rowsByDate = new Map(rows.map(r => [r.entry_date, r]));

  // Re-fetch habit_entries filtered to relevant entry IDs
  const entryIds = rows.map(r => r.id);
  let filteredHabits: Pick<HabitEntryRow, 'entry_id' | 'habit_id'>[] = [];

  if (entryIds.length > 0) {
    const { data: he } = await client
      .from('habit_entries')
      .select('entry_id, habit_id')
      .in('entry_id', entryIds);
    filteredHabits = (he ?? []) as typeof filteredHabits;
  }

  const habitsByEntry = filteredHabits.reduce<Record<number, number[]>>(
    (acc, h) => {
      if (!acc[h.entry_id]) acc[h.entry_id] = [];
      acc[h.entry_id].push(h.habit_id);
      return acc;
    },
    {}
  );

  return dates.map(date => {
    const entry = rowsByDate.get(date) ?? null;
    return {
      date,
      entry,
      habit_ids: entry ? (habitsByEntry[entry.id] ?? []) : [],
    };
  });
}

// ── Create / Update ───────────────────────────────────────────────────────────

/** Ensures a row exists for the given date. Creates one with a random intention if missing. */
export async function ensureDailyEntry(
  client: Client,
  date: string
): Promise<DailyEntryDetail> {
  const existing = await getDailyEntry(client, date);
  if (existing) return existing;

  const intention = await getRandomIntention(client);

  const { data, error } = await client
    .from('daily_entries')
    .insert({
      entry_date:   date,
      intention_id: intention?.id ?? null,
    })
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

// ── Habit entries ─────────────────────────────────────────────────────────────

/** Replace the full set of completed habits for an entry. */
export async function setHabitEntries(
  client: Client,
  entryId: number,
  habitIds: number[]
): Promise<void> {
  // Delete existing then insert new (idiomatic for small junction sets)
  const { error: delErr } = await client
    .from('habit_entries')
    .delete()
    .eq('entry_id', entryId);
  if (delErr) throw new Error(`setHabitEntries delete: ${delErr.message}`);

  if (habitIds.length === 0) return;

  const { error: insErr } = await client.from('habit_entries').insert(
    habitIds.map(habit_id => ({ entry_id: entryId, habit_id }))
  );
  if (insErr) throw new Error(`setHabitEntries insert: ${insErr.message}`);
}

export async function toggleHabitEntry(
  client: Client,
  entryId: number,
  habitId: number,
  done: boolean
): Promise<void> {
  if (done) {
    await client
      .from('habit_entries')
      .upsert({ entry_id: entryId, habit_id: habitId })
      .throwOnError();
  } else {
    await client
      .from('habit_entries')
      .delete()
      .eq('entry_id', entryId)
      .eq('habit_id', habitId)
      .throwOnError();
  }
}

// ── Tag entries ───────────────────────────────────────────────────────────────

export async function setTagEntries(
  client: Client,
  entryId: number,
  tagIds: number[]
): Promise<void> {
  await client.from('tag_entries').delete().eq('entry_id', entryId).throwOnError();
  if (tagIds.length === 0) return;
  await client
    .from('tag_entries')
    .insert(tagIds.map(tag_id => ({ entry_id: entryId, tag_id })))
    .throwOnError();
}

export async function toggleTagEntry(
  client: Client,
  entryId: number,
  tagId: number,
  active: boolean
): Promise<void> {
  if (active) {
    await client
      .from('tag_entries')
      .upsert({ entry_id: entryId, tag_id: tagId })
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

export async function setPrescriptionEntries(
  client: Client,
  entryId: number,
  prescriptionIds: number[]
): Promise<void> {
  await client
    .from('prescription_entries')
    .delete()
    .eq('entry_id', entryId)
    .throwOnError();
  if (prescriptionIds.length === 0) return;
  await client
    .from('prescription_entries')
    .insert(prescriptionIds.map(prescription_id => ({ entry_id: entryId, prescription_id })))
    .throwOnError();
}

export async function togglePrescriptionEntry(
  client: Client,
  entryId: number,
  prescriptionId: number,
  taken: boolean
): Promise<void> {
  if (taken) {
    await client
      .from('prescription_entries')
      .upsert({ entry_id: entryId, prescription_id: prescriptionId })
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

export async function getBrainDump(
  client: Client,
  entryId: number
): Promise<BrainDumpRow | null> {
  const { data, error } = await client
    .from('brain_dumps')
    .select('*')
    .eq('entry_id', entryId)
    .maybeSingle();
  if (error) throw new Error(`getBrainDump: ${error.message}`);
  return data as BrainDumpRow | null;
}

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
    await client
      .from('brain_dumps')
      .update({ body_md: bodyMd })
      .eq('id', existing.id)
      .throwOnError();
  } else {
    await client
      .from('brain_dumps')
      .insert({ entry_id: entryId, dump_date: dumpDate, body_md: bodyMd })
      .throwOnError();
  }
}

/** Create a standalone brain dump (not linked to a daily entry). */
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
