/**
 * lib/dal/symptoms.ts
 *
 * symptom_entries is removed — crash, anxiety, and daily_symptom_entries
 * are now fetched directly by entry_id from daily_entries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CrashRow,
  AnxietyEntryRow,
  DailySymptomEntryRow,
  SymptomCategoryRow,
  SymptomTypeRow,
} from "@/types/schema";
import type {
  DailySymptomData,
  CrashInsert,
  AnxietyEntryInsert,
} from "@/types/dal";

type Client = SupabaseClient;

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getDailySymptomData(
  client: Client,
  entryId: number,
): Promise<DailySymptomData | null> {
  const [crashRes, anxietyRes, symptomsRes] = await Promise.all([
    client.from("crashes").select("*").eq("entry_id", entryId).maybeSingle(),
    client
      .from("anxiety_entries")
      .select("*")
      .eq("entry_id", entryId)
      .maybeSingle(),
    client.from("daily_symptom_entries").select("*").eq("entry_id", entryId),
  ]);

  const crash = crashRes.data as CrashRow | null;
  const anxiety = anxietyRes.data as AnxietyEntryRow | null;
  const symptomEntries = (symptomsRes.data ?? []) as DailySymptomEntryRow[];

  // Return null if nothing has been logged for this entry yet
  if (!crash && !anxiety && symptomEntries.length === 0) return null;

  return { crash, anxiety, symptom_entries: symptomEntries };
}

// ── Daily symptom types (which symptoms were present) ─────────────────────────

export async function setDailySymptomEntries(
  client: Client,
  entryId: number,
  symptoms: { symptom_type_id: number; severity?: number | null }[],
): Promise<void> {
  await client
    .from("daily_symptom_entries")
    .delete()
    .eq("entry_id", entryId)
    .throwOnError();

  if (symptoms.length === 0) return;

  await client
    .from("daily_symptom_entries")
    .insert(symptoms.map((s) => ({ entry_id: entryId, ...s })))
    .throwOnError();
}

export async function addDailySymptomEntry(
  client: Client,
  entryId: number,
  symptomTypeId: number,
  severity?: number | null,
): Promise<void> {
  await client
    .from("daily_symptom_entries")
    .upsert(
      {
        entry_id: entryId,
        symptom_type_id: symptomTypeId,
        severity: severity ?? null,
      },
      { onConflict: "entry_id,symptom_type_id" },
    )
    .throwOnError();
}

export async function removeDailySymptomEntry(
  client: Client,
  entryId: number,
  symptomTypeId: number,
): Promise<void> {
  await client
    .from("daily_symptom_entries")
    .delete()
    .eq("entry_id", entryId)
    .eq("symptom_type_id", symptomTypeId)
    .throwOnError();
}

// ── Crashes ───────────────────────────────────────────────────────────────────

export async function upsertCrash(
  client: Client,
  entryId: number,
  fields: Omit<CrashInsert, "entry_id">,
): Promise<void> {
  const { data: existing } = await client
    .from("crashes")
    .select("id")
    .eq("entry_id", entryId)
    .maybeSingle();

  if (existing) {
    await client
      .from("crashes")
      .update(fields)
      .eq("id", existing.id)
      .throwOnError();
  } else {
    await client
      .from("crashes")
      .insert({ entry_id: entryId, ...fields })
      .throwOnError();
  }
}

export async function deleteCrash(
  client: Client,
  entryId: number,
): Promise<void> {
  await client.from("crashes").delete().eq("entry_id", entryId).throwOnError();
}

// ── Anxiety entries ───────────────────────────────────────────────────────────

export async function upsertAnxiety(
  client: Client,
  entryId: number,
  fields: Omit<AnxietyEntryInsert, "entry_id">,
): Promise<void> {
  const { data: existing } = await client
    .from("anxiety_entries")
    .select("id")
    .eq("entry_id", entryId)
    .maybeSingle();

  if (existing) {
    await client
      .from("anxiety_entries")
      .update(fields)
      .eq("id", existing.id)
      .throwOnError();
  } else {
    await client
      .from("anxiety_entries")
      .insert({ entry_id: entryId, ...fields })
      .throwOnError();
  }
}

export async function deleteAnxiety(
  client: Client,
  entryId: number,
): Promise<void> {
  await client
    .from("anxiety_entries")
    .delete()
    .eq("entry_id", entryId)
    .throwOnError();
}


// ── Settings operations ───────────────────────────────────────────────────────

export async function addSymptomCategory(
  client:    Client,
  name:      string,
  sortOrder: number,
): Promise<SymptomCategoryRow> {
  const { data, error } = await client
    .from('symptom_categories')
    .insert({ category_name: name.trim(), sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(`addSymptomCategory: ${error.message}`);
  return data as SymptomCategoryRow;
}

export async function toggleSymptomCategory(
  client:   Client,
  id:       number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from('symptom_categories')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw new Error(`toggleSymptomCategory: ${error.message}`);
}

export async function addSymptomType(
  client:     Client,
  categoryId: number,
  name:       string,
  sortOrder:  number,
): Promise<SymptomTypeRow> {
  const { data, error } = await client
    .from('symptom_types')
    .insert({ category_id: categoryId, symptom_name: name.trim(), sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(`addSymptomType: ${error.message}`);
  return data as SymptomTypeRow;
}

export async function toggleSymptomType(
  client:   Client,
  id:       number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from('symptom_types')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw new Error(`toggleSymptomType: ${error.message}`);
}

export async function updateSymptomCategory(
  client: Client,
  id:     number,
  name:   string,
): Promise<void> {
  const { error } = await client
    .from('symptom_categories')
    .update({ category_name: name.trim() })
    .eq('id', id);
  if (error) throw new Error(`updateSymptomCategory: ${error.message}`);
}

export async function deleteSymptomCategory(
  client: Client,
  id:     number,
): Promise<void> {
  const { error } = await client.from('symptom_categories').delete().eq('id', id);
  if (error) throw new Error(`deleteSymptomCategory: ${error.message}`);
}

export async function updateSymptomType(
  client: Client,
  id:     number,
  name:   string,
): Promise<void> {
  const { error } = await client
    .from('symptom_types')
    .update({ symptom_name: name.trim() })
    .eq('id', id);
  if (error) throw new Error(`updateSymptomType: ${error.message}`);
}

export async function deleteSymptomType(
  client: Client,
  id:     number,
): Promise<void> {
  const { error } = await client.from('symptom_types').delete().eq('id', id);
  if (error) throw new Error(`deleteSymptomType: ${error.message}`);
}
