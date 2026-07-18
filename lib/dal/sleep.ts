/**
 * lib/dal/sleep.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SleepEntryRow,
  NapRow,
  WakeEventRow,
  SleepEventRow,
  SleepTimingEntryRow,
  SleepConsumptionEntryRow,
} from '@/types/schema';
import type {
  SleepEntryDetail,
  SleepEntryInsert,
  SleepEntryUpdate,
  PriorSleepContext,
} from '@/types/dal';
import { addDays } from './daily';

type Client = SupabaseClient;

// ── Read ──────────────────────────────────────────────────────────────────────

async function assembleSleepDetail(
  client: Client,
  row: SleepEntryRow
): Promise<SleepEntryDetail> {
  const [nap, wakeEvents, sleepEvents, timingEntries, consumptionEntries] =
    await Promise.all([
      client
        .from('naps')
        .select('*')
        .eq('sleep_entry_id', row.id)
        .maybeSingle()
        .then(r => r.data as NapRow | null),

      client
        .from('wake_events')
        .select('*')
        .eq('sleep_entry_id', row.id)
        .maybeSingle()
        .then(r => r.data as WakeEventRow | null),

      client
        .from('sleep_events')
        .select('event_type_id')
        .eq('sleep_entry_id', row.id)
        .then(r => (r.data ?? []) as Pick<SleepEventRow, 'event_type_id'>[]),

      client
        .from('sleep_timing_entries')
        .select('*')
        .eq('sleep_entry_id', row.id)
        .then(r => (r.data ?? []) as SleepTimingEntryRow[]),

      client
        .from('sleep_consumption_entries')
        .select('consumption_type_id')
        .eq('sleep_entry_id', row.id)
        .then(r => (r.data ?? []) as Pick<SleepConsumptionEntryRow, 'consumption_type_id'>[]),
    ]);

  return {
    ...row,
    nap,
    wake_events:     wakeEvents,
    sleep_event_ids: sleepEvents.map(e => e.event_type_id),
    timing_entries:  timingEntries,
    consumption_ids: consumptionEntries.map(e => e.consumption_type_id),
  };
}

export async function getSleepEntry(
  client: Client,
  entryId: number
): Promise<SleepEntryDetail | null> {
  const { data, error } = await client
    .from('sleep_entries')
    .select('*')
    .eq('entry_id', entryId)
    .maybeSingle();

  if (error) throw new Error(`getSleepEntry(${entryId}): ${error.message}`);
  if (!data) return null;

  return assembleSleepDetail(client, data as SleepEntryRow);
}

/**
 * Get the previous day's sleep entry as a "prior context" object.
 * The daily page shows this as "last night's behaviors" on the sleep tab.
 */
export async function getPriorSleepContext(
  client: Client,
  currentDate: string,
  currentEntryId: number
): Promise<PriorSleepContext | null> {
  const priorDate = addDays(currentDate, -1);

  // Find prior day's daily entry
  const { data: priorEntry } = await client
    .from('daily_entries')
    .select('id')
    .eq('entry_date', priorDate)
    .maybeSingle();

  if (!priorEntry) return null;

  // Find its sleep entry
  const { data: priorSleep } = await client
    .from('sleep_entries')
    .select('id, today_pre_bed_activity')
    .eq('entry_id', priorEntry.id)
    .maybeSingle();

  if (!priorSleep) return null;

  const [timingEntries, consumptionEntries] = await Promise.all([
    client
      .from('sleep_timing_entries')
      .select('*')
      .eq('sleep_entry_id', priorSleep.id)
      .then(r => (r.data ?? []) as SleepTimingEntryRow[]),

    client
      .from('sleep_consumption_entries')
      .select('consumption_type_id')
      .eq('sleep_entry_id', priorSleep.id)
      .then(r => (r.data ?? []) as Pick<SleepConsumptionEntryRow, 'consumption_type_id'>[]),
  ]);

  return {
    today_pre_bed_activity: priorSleep.today_pre_bed_activity,
    timing_entries:         timingEntries,
    consumption_ids:        consumptionEntries.map(e => e.consumption_type_id),
  };
}

// ── Create / Update ───────────────────────────────────────────────────────────

export async function upsertSleepEntry(
  client: Client,
  entryId: number,
  fields: SleepEntryUpdate
): Promise<SleepEntryRow> {
  const { data: existing } = await client
    .from('sleep_entries')
    .select('id')
    .eq('entry_id', entryId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await client
      .from('sleep_entries')
      .update(fields)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new Error(`upsertSleepEntry update: ${error.message}`);
    return data as SleepEntryRow;
  }

  const { data, error } = await client
    .from('sleep_entries')
    .insert({ entry_id: entryId, ...fields })
    .select()
    .single();
  if (error) throw new Error(`upsertSleepEntry insert: ${error.message}`);
  return data as SleepEntryRow;
}

// ── Naps ──────────────────────────────────────────────────────────────────────

export async function upsertNap(
  client: Client,
  sleepEntryId: number,
  nap: { nap_count?: number; duration_min?: number | null; was_refreshing?: boolean }
): Promise<void> {
  const { data: existing } = await client
    .from('naps')
    .select('id')
    .eq('sleep_entry_id', sleepEntryId)
    .maybeSingle();

  if (existing) {
    await client.from('naps').update(nap).eq('id', existing.id).throwOnError();
  } else {
    await client
      .from('naps')
      .insert({ sleep_entry_id: sleepEntryId, nap_count: 1, ...nap })
      .throwOnError();
  }
}

export async function deleteNap(client: Client, sleepEntryId: number): Promise<void> {
  await client.from('naps').delete().eq('sleep_entry_id', sleepEntryId).throwOnError();
}

// ── Wake events ───────────────────────────────────────────────────────────────

export async function upsertWakeEvents(
  client: Client,
  sleepEntryId: number,
  wakeEvents: { event_count: number; duration_min?: number; detail?: string | null }
): Promise<void> {
  const { data: existing } = await client
    .from('wake_events')
    .select('id')
    .eq('sleep_entry_id', sleepEntryId)
    .maybeSingle();

  if (existing) {
    await client
      .from('wake_events')
      .update(wakeEvents)
      .eq('id', existing.id)
      .throwOnError();
  } else {
    await client
      .from('wake_events')
      .insert({ sleep_entry_id: sleepEntryId, ...wakeEvents })
      .throwOnError();
  }
}

// ── Sleep events (boolean flags: hallucinations, restless legs, etc.) ─────────

export async function setSleepEvents(
  client: Client,
  sleepEntryId: number,
  eventTypeIds: number[]
): Promise<void> {
  await client
    .from('sleep_events')
    .delete()
    .eq('sleep_entry_id', sleepEntryId)
    .throwOnError();

  if (eventTypeIds.length === 0) return;

  await client
    .from('sleep_events')
    .insert(eventTypeIds.map(event_type_id => ({ sleep_entry_id: sleepEntryId, event_type_id })))
    .throwOnError();
}

export async function toggleSleepEvent(
  client: Client,
  sleepEntryId: number,
  eventTypeId: number,
  active: boolean
): Promise<void> {
  if (active) {
    await client
      .from('sleep_events')
      .upsert({ sleep_entry_id: sleepEntryId, event_type_id: eventTypeId })
      .throwOnError();
  } else {
    await client
      .from('sleep_events')
      .delete()
      .eq('sleep_entry_id', sleepEntryId)
      .eq('event_type_id', eventTypeId)
      .throwOnError();
  }
}

// ── Timing entries ────────────────────────────────────────────────────────────

export async function setSleepTimingEntry(
  client: Client,
  sleepEntryId: number,
  timingCategoryId: number,
  timingOptionId: number
): Promise<void> {
  await client
    .from('sleep_timing_entries')
    .upsert({
      sleep_entry_id:      sleepEntryId,
      timing_category_id:  timingCategoryId,
      timing_option_id:    timingOptionId,
    })
    .throwOnError();
}

// ── Consumption entries ───────────────────────────────────────────────────────

export async function setSleepConsumptionEntries(
  client: Client,
  sleepEntryId: number,
  consumptionTypeIds: number[]
): Promise<void> {
  await client
    .from('sleep_consumption_entries')
    .delete()
    .eq('sleep_entry_id', sleepEntryId)
    .throwOnError();

  if (consumptionTypeIds.length === 0) return;

  await client
    .from('sleep_consumption_entries')
    .insert(
      consumptionTypeIds.map(consumption_type_id => ({
        sleep_entry_id: sleepEntryId,
        consumption_type_id,
      }))
    )
    .throwOnError();
}

export async function toggleSleepConsumptionEntry(
  client: Client,
  sleepEntryId: number,
  consumptionTypeId: number,
  active: boolean
): Promise<void> {
  if (active) {
    await client
      .from('sleep_consumption_entries')
      .upsert({ sleep_entry_id: sleepEntryId, consumption_type_id: consumptionTypeId })
      .throwOnError();
  } else {
    await client
      .from('sleep_consumption_entries')
      .delete()
      .eq('sleep_entry_id', sleepEntryId)
      .eq('consumption_type_id', consumptionTypeId)
      .throwOnError();
  }
}
