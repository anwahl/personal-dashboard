/**
 * lib/dal/symptoms.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SymptomEntryRow,
  CrashRow,
  AnxietyEntryRow,
  DailySymptomEntryRow,
} from '@/types/schema';
import type {
  SymptomEntryDetail,
  SymptomEntryInsert,
  SymptomEntryUpdate,
  CrashInsert,
  CrashUpdate,
  AnxietyEntryInsert,
  AnxietyEntryUpdate,
} from '@/types/dal';

type Client = SupabaseClient;

// ── Read ──────────────────────────────────────────────────────────────────────

async function assembleSymptomDetail(
  client: Client,
  row: SymptomEntryRow
): Promise<SymptomEntryDetail> {
  const [crash, anxiety, symptoms] = await Promise.all([
    client
      .from('crashes')
      .select('*')
      .eq('entry_id', row.entry_id)
      .maybeSingle()
      .then(r => r.data as CrashRow | null),

    client
      .from('anxiety_entries')
      .select('*')
      .eq('entry_id', row.entry_id)
      .maybeSingle()
      .then(r => r.data as AnxietyEntryRow | null),

    client
      .from('daily_symptom_entries')
      .select('*')
      .eq('symptom_entry_id', row.id)
      .then(r => (r.data ?? []) as DailySymptomEntryRow[]),
  ]);

  return { ...row, crash, anxiety, symptom_entries: symptoms };
}

export async function getSymptomEntry(
  client: Client,
  entryId: number
): Promise<SymptomEntryDetail | null> {
  const { data, error } = await client
    .from('symptom_entries')
    .select('*')
    .eq('entry_id', entryId)
    .maybeSingle();

  if (error) throw new Error(`getSymptomEntry(${entryId}): ${error.message}`);
  if (!data) return null;

  return assembleSymptomDetail(client, data as SymptomEntryRow);
}

// ── Symptom entry ─────────────────────────────────────────────────────────────

export async function upsertSymptomEntry(
  client: Client,
  entryId: number,
  fields: SymptomEntryUpdate
): Promise<SymptomEntryRow> {
  const { data: existing } = await client
    .from('symptom_entries')
    .select('id')
    .eq('entry_id', entryId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await client
      .from('symptom_entries')
      .update(fields)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new Error(`upsertSymptomEntry update: ${error.message}`);
    return data as SymptomEntryRow;
  }

  const { data, error } = await client
    .from('symptom_entries')
    .insert({ entry_id: entryId, ...fields })
    .select()
    .single();
  if (error) throw new Error(`upsertSymptomEntry insert: ${error.message}`);
  return data as SymptomEntryRow;
}

// ── Daily symptom entries (junction: which symptoms were present) ──────────────

export async function setDailySymptomEntries(
  client: Client,
  symptomEntryId: number,
  symptoms: { symptom_type_id: number; severity?: number | null }[]
): Promise<void> {
  await client
    .from('daily_symptom_entries')
    .delete()
    .eq('symptom_entry_id', symptomEntryId)
    .throwOnError();

  if (symptoms.length === 0) return;

  await client
    .from('daily_symptom_entries')
    .insert(symptoms.map(s => ({ symptom_entry_id: symptomEntryId, ...s })))
    .throwOnError();
}

export async function toggleDailySymptomEntry(
  client: Client,
  symptomEntryId: number,
  symptomTypeId: number,
  active: boolean,
  severity?: number | null
): Promise<void> {
  if (active) {
    await client
      .from('daily_symptom_entries')
      .upsert({
        symptom_entry_id: symptomEntryId,
        symptom_type_id:  symptomTypeId,
        severity:         severity ?? null,
      }, { onConflict: 'symptom_entry_id,symptom_type_id' })
      .throwOnError();
  } else {
    await client
      .from('daily_symptom_entries')
      .delete()
      .eq('symptom_entry_id', symptomEntryId)
      .eq('symptom_type_id', symptomTypeId)
      .throwOnError();
  }
}

// ── Crashes ───────────────────────────────────────────────────────────────────

/** Row existence = crash occurred. Use upsertCrash to set/update. */
export async function upsertCrash(
  client: Client,
  entryId: number,
  fields: Omit<CrashInsert, 'entry_id'>
): Promise<void> {
  const { data: existing } = await client
    .from('crashes')
    .select('id')
    .eq('entry_id', entryId)
    .maybeSingle();

  if (existing) {
    await client.from('crashes').update(fields).eq('id', existing.id).throwOnError();
  } else {
    await client.from('crashes').insert({ entry_id: entryId, ...fields }).throwOnError();
  }
}

export async function deleteCrash(client: Client, entryId: number): Promise<void> {
  await client.from('crashes').delete().eq('entry_id', entryId).throwOnError();
}

// ── Anxiety entries ───────────────────────────────────────────────────────────

/** Row existence = notable anxiety that day. Use upsertAnxiety to set/update. */
export async function upsertAnxiety(
  client: Client,
  entryId: number,
  fields: Omit<AnxietyEntryInsert, 'entry_id'>
): Promise<void> {
  const { data: existing } = await client
    .from('anxiety_entries')
    .select('id')
    .eq('entry_id', entryId)
    .maybeSingle();

  if (existing) {
    await client
      .from('anxiety_entries')
      .update(fields)
      .eq('id', existing.id)
      .throwOnError();
  } else {
    await client
      .from('anxiety_entries')
      .insert({ entry_id: entryId, ...fields })
      .throwOnError();
  }
}

export async function deleteAnxiety(client: Client, entryId: number): Promise<void> {
  await client.from('anxiety_entries').delete().eq('entry_id', entryId).throwOnError();
}
