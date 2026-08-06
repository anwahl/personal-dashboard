/**
 * lib/dal/analytics.ts
 *
 * Queries for the health analytics page.
 * Reads chart configuration from chart_definitions + chart_trackable_links,
 * then fetches daily_numeric_entries for the linked trackables.
 * Fully data-agnostic — no hardcoded metric names or chart types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrackingDataPoint } from "@/types/dal";
import type { HabitEntryRow } from "@/types/schema";

type Client = SupabaseClient;

// ── Numeric / aggregate trend data ────────────────────────────────────────────

/**
 * Fetch daily_numeric_entries for the given trackable IDs over a date range.
 * Returns one TrackingDataPoint per day that has at least one value.
 */
export async function getTrackingData(
  client: Client,
  trackableIds: number[],
  fromDate: string,
  toDate: string,
): Promise<TrackingDataPoint[]> {
  if (!trackableIds.length) return [];

  // Fetch daily_entries in range to get the entry_id → date mapping
  const { data: entries, error: eErr } = await client
    .from("daily_entries")
    .select("id, entry_date")
    .gte("entry_date", fromDate)
    .lte("entry_date", toDate)
    .order("entry_date", { ascending: true });

  if (eErr) throw new Error(`getTrackingData entries: ${eErr.message}`);
  if (!entries?.length) return [];

  const dateById = new Map<number, string>(
    (entries as { id: number; entry_date: string }[]).map((e) => [
      e.id,
      e.entry_date,
    ]),
  );

  // Fetch numeric entries for the relevant trackables
  const { data: numeric, error: nErr } = await client
    .from("daily_numeric_entries")
    .select("entry_id, trackable_id, metric_value")
    .in("entry_id", [...dateById.keys()])
    .in("trackable_id", trackableIds);

  if (nErr) throw new Error(`getTrackingData numeric: ${nErr.message}`);

  // Group by entry_id → build TrackingDataPoint[]
  const byEntry = new Map<number, Record<number, number>>();
  for (const row of (numeric ?? []) as {
    entry_id: number;
    trackable_id: number;
    metric_value: number;
  }[]) {
    if (!byEntry.has(row.entry_id)) byEntry.set(row.entry_id, {});
    byEntry.get(row.entry_id)![row.trackable_id] = row.metric_value;
  }

  return [...byEntry.entries()]
    .map(([entryId, values]) => ({ date: dateById.get(entryId)!, values }))
    .filter((p) => p.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Boolean (habit) completion data ──────────────────────────────────────────

/**
 * Fetch habit_entries for the given trackable IDs over a date range.
 * Returns one TrackingDataPoint per day that has at least one boolean entry,
 * where values[trackable_id] = 1 (done) or absent (not done).
 */
export async function getBooleanData(
  client: Client,
  trackableIds: number[],
  fromDate: string,
  toDate: string,
): Promise<TrackingDataPoint[]> {
  if (!trackableIds.length) return [];

  const { data: entries, error: eErr } = await client
    .from("daily_entries")
    .select("id, entry_date")
    .gte("entry_date", fromDate)
    .lte("entry_date", toDate)
    .order("entry_date", { ascending: true });

  if (eErr) throw new Error(`getBooleanData entries: ${eErr.message}`);
  if (!entries?.length) return [];

  const dateById = new Map<number, string>(
    (entries as { id: number; entry_date: string }[]).map((e) => [
      e.id,
      e.entry_date,
    ]),
  );

  const { data: habitData, error: hErr } = await client
    .from("habit_entries")
    .select("entry_id, trackable_id")
    .in("entry_id", [...dateById.keys()])
    .in("trackable_id", trackableIds);

  if (hErr) throw new Error(`getBooleanData habits: ${hErr.message}`);

  // Build one data point per entry that had at least one habit logged
  const byEntry = new Map<number, Record<number, number>>();
  for (const row of (habitData ?? []) as Pick<
    HabitEntryRow,
    "entry_id" | "trackable_id"
  >[]) {
    if (!byEntry.has(row.entry_id)) byEntry.set(row.entry_id, {});
    byEntry.get(row.entry_id)![row.trackable_id] = 1;
  }

  // Return ALL dates in range so the heatmap can show empty cells too
  return (entries as { id: number; entry_date: string }[]).map((e) => ({
    date: e.entry_date,
    values: byEntry.get(e.id) ?? {},
  }));
}

// ── Combined data (numeric + boolean merged) ──────────────────────────────────

/**
 * Fetch all trackable data and merge into one TrackingDataPoint[] stream.
 * Boolean trackables appear as value=1 on days they were completed.
 * This single dataset is used by ALL chart types — no more split numeric/boolean.
 */
export async function getCombinedTrackingData(
  client: Client,
  allTrackableIds: number[],
  booleanTrackableIds: number[],
  fromDate: string,
  toDate: string,
): Promise<TrackingDataPoint[]> {
  if (!allTrackableIds.length) return [];

  const numericIds = allTrackableIds.filter(
    (id) => !booleanTrackableIds.includes(id),
  );

  const [numericData, booleanData] = await Promise.all([
    numericIds.length
      ? getTrackingData(client, numericIds, fromDate, toDate)
      : Promise.resolve([]),
    booleanTrackableIds.length
      ? getBooleanData(client, booleanTrackableIds, fromDate, toDate)
      : Promise.resolve([]),
  ]);

  // Merge both into a single date-keyed map
  const byDate = new Map<string, Record<number, number>>();

  const merge = (dp: TrackingDataPoint) => {
    if (!byDate.has(dp.date)) byDate.set(dp.date, {});
    Object.assign(byDate.get(dp.date)!, dp.values);
  };

  numericData.forEach(merge);
  // Only merge boolean dates that actually have values (don't inflate with empty days)
  booleanData.filter((dp) => Object.keys(dp.values).length > 0).forEach(merge);

  return [...byDate.entries()]
    .map(([date, values]) => ({ date, values }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
