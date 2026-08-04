import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

/**
 * Tables managed by ManageableList. Listing them explicitly gives
 * type coverage and documents what this DAL owns.
 */
export type ManageableTable =
  | "tags"
  | "intentions"
  | "sleep_event_types"
  | "habits"
  | "providers"
  | "medications"
  | "chart_categories"
  | "daily_trackables"
  | "trackable_categories"
  | "people_categories";

/**
 * All tables with a sort_order column — superset of ManageableTable.
 * Used by reorderSettingsItem which is shared across DAL files.
 */
export type ReorderableTable =
  | ManageableTable
  | "icons"
  | "symptom_categories"
  | "symptom_types"
  | "journal_categories"
  | "journal_prompts"
  | "weekly_journal_categories"
  | "weekly_journal_prompts"
  | "last_time_media"
  | "last_time_boolean"
  | "last_time_custom";

// ── Generic active toggle ─────────────────────────────────────────────────────

export async function toggleSettingsItem(
  client: Client,
  table: ManageableTable,
  id: number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from(table)
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(`toggleSettingsItem(${table}): ${error.message}`);
}

// ── Generic add ───────────────────────────────────────────────────────────────

export async function addSettingsItem<T>(
  client: Client,
  table: ManageableTable,
  payload: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client
    .from(table)
    .upsert(payload)
    .select()
    .single();
  if (error) throw new Error(`addSettingsItem(${table}): ${error.message}`);
  return data as T;
}

// ── Generic update ────────────────────────────────────────────────────────────

export async function updateSettingsItem<T>(
  client: Client,
  table: ManageableTable,
  id: number,
  payload: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client
    .from(table)
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updateSettingsItem(${table}): ${error.message}`);
  return data as T;
}

// ── Generic delete ────────────────────────────────────────────────────────────

export async function deleteSettingsItem(
  client: Client,
  table: ManageableTable,
  id: number,
): Promise<void> {
  const { error } = await client.from(table).delete().eq("id", id);
  if (error) throw new Error(`deleteSettingsItem(${table}): ${error.message}`);
}

// ── Generic sort-order swap (any table with sort_order column) ────────────────

/**
 * Swaps the sort_order of two items. Both updates run in parallel.
 * Works on any table in ReorderableTable — used by ManageableList and
 * the category/child settings components (symptoms, journal, last-time).
 */
export async function reorderSettingsItem(
  client: Client,
  table: ReorderableTable,
  idA: number,
  orderA: number,
  idB: number,
  orderB: number,
): Promise<void> {
  const [resA, resB] = await Promise.all([
    client.from(table).update({ sort_order: orderB }).eq("id", idA),
    client.from(table).update({ sort_order: orderA }).eq("id", idB),
  ]);
  if (resA.error)
    throw new Error(`reorderSettingsItem(${table}) A: ${resA.error.message}`);
  if (resB.error)
    throw new Error(`reorderSettingsItem(${table}) B: ${resB.error.message}`);
}

/**
 * Batch-sets sort_order for multiple items at once.
 * Used when normalizing all-zero sort_orders on first move.
 */
export async function batchSetSortOrder(
  client: Client,
  table: ReorderableTable,
  updates: Array<{ id: number; sort_order: number }>,
): Promise<void> {
  const results = await Promise.all(
    updates.map(({ id, sort_order }) =>
      client.from(table).update({ sort_order }).eq("id", id),
    ),
  );
  for (const res of results) {
    if (res.error)
      throw new Error(`batchSetSortOrder(${table}): ${res.error.message}`);
  }
}
