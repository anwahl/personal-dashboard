import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

/**
 * Tables managed by the settings lists (ManageableList, HierarchicalList,
 * LastTimeSettings). Listing them explicitly gives type coverage and
 * documents what this DAL owns. Settings are deactivated, never deleted,
 * so the history that points at them is kept.
 */
export type ManageableTable =
  | "tags"
  | "intentions"
  | "providers"
  | "provider_types"
  | "medications"
  | "chart_categories"
  | "people_categories"
  | "people"
  | "item_lists"
  | "checklists"
  | "last_time_media"
  | "last_time_boolean"
  | "last_time_custom";

/**
 * All tables with a sort_order column — superset of ManageableTable.
 * Used by reorderSettingsItem which is shared across DAL files.
 */
export type ReorderableTable =
  | ManageableTable
  | "icons"
  | "journal_categories"
  | "journal_prompts"
  | "weekly_journal_categories"
  | "weekly_journal_prompts"
  | "info_groups"
  | "info_field_types"
  | "log_schemas"
  | "log_schema_fields";

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

// ── Generic sort-order swap (any table with sort_order column) ────────────────

/**
 * Swaps the sort_order of two items. Both updates run in parallel.
 * Works on any table in ReorderableTable — used by ManageableList and
 * the category/child settings components (journal, last-time).
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

// ── Category assignment ───────────────────────────────────────────────────────

/** Item tables that belong to a category via `category_id`. */
export type CategorizedTable =
  | "journal_prompts"
  | "weekly_journal_prompts"
  | "people";

/**
 * Moves an item to another category. Pair with batchSetSortOrder to place it.
 */
export async function setItemCategory(
  client: Client,
  table: CategorizedTable,
  id: number,
  categoryId: number | null,
): Promise<void> {
  const { error } = await client
    .from(table)
    .update({ category_id: categoryId })
    .eq("id", id);
  if (error) throw new Error(`setItemCategory(${table}): ${error.message}`);
}
