/**
 * lib/dal/trackables.ts
 *
 * Read/write for daily_trackable_entries:
 *   - daily_numeric_entries  (track_type = 'numeric' | 'aggregate')
 *   - habit_entries          (track_type = 'boolean')
 *
 * Row absence = not logged; 0 is a valid metric_value.
 * Use upsert to set, delete to clear.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DailyNumericEntryRow } from '@/types/schema';

type Client = SupabaseClient;

// ── Numeric entries ───────────────────────────────────────────────────────────

/** Upsert a single numeric trackable value for an entry. */
export async function upsertNumericEntry(
  client: Client,
  entryId:     number,
  trackableId: number,
  value:       number
): Promise<void> {
  await client
    .from('daily_numeric_entries')
    .upsert(
      { entry_id: entryId, trackable_id: trackableId, metric_value: value },
      { onConflict: 'entry_id,trackable_id' }
    )
    .throwOnError();
}

/** Delete a numeric trackable entry (= "not logged"). */
export async function deleteNumericEntry(
  client: Client,
  entryId:     number,
  trackableId: number
): Promise<void> {
  await client
    .from('daily_numeric_entries')
    .delete()
    .eq('entry_id', entryId)
    .eq('trackable_id', trackableId)
    .throwOnError();
}

/** Fetch all numeric entries for a daily entry. */
export async function getNumericEntries(
  client: Client,
  entryId: number
): Promise<DailyNumericEntryRow[]> {
  const { data, error } = await client
    .from('daily_numeric_entries')
    .select('*')
    .eq('entry_id', entryId);
  if (error) throw new Error(`getNumericEntries(${entryId}): ${error.message}`);
  return (data ?? []) as DailyNumericEntryRow[];
}

/**
 * Batch-save numeric entries from a MetricState record.
 * null value = delete the row (clear the field).
 */
export async function saveNumericEntries(
  client: Client,
  entryId:     number,
  metricState: Record<number, number | null>
): Promise<void> {
  await Promise.all(
    Object.entries(metricState).map(([idStr, value]) => {
      const trackableId = Number(idStr);
      return value !== null
        ? upsertNumericEntry(client, entryId, trackableId, value)
        : deleteNumericEntry(client, entryId, trackableId);
    })
  );
}

// ── Boolean entries (habits) ──────────────────────────────────────────────────

/** Toggle a single boolean trackable for an entry. */
export async function toggleBooleanEntry(
  client: Client,
  entryId:     number,
  trackableId: number,
  done:        boolean
): Promise<void> {
  if (done) {
    await client
      .from('habit_entries')
      .upsert(
        { entry_id: entryId, trackable_id: trackableId },
        { onConflict: 'entry_id,trackable_id' }
      )
      .throwOnError();
  } else {
    await client
      .from('habit_entries')
      .delete()
      .eq('entry_id', entryId)
      .eq('trackable_id', trackableId)
      .throwOnError();
  }
}
