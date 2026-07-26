import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient;

/**
 * Tables managed by ManageableList. Listing them explicitly gives
 * SonarQube-safe type coverage and documents what this DAL owns.
 */
export type ManageableTable =
  | 'tags'
  | 'intentions'
  | 'sleep_event_types'
  | 'habits'
  | 'providers'
  | 'medications'
  | 'chart_categories';

// ── Generic active toggle ─────────────────────────────────────────────────────

export async function toggleSettingsItem(
  client:    Client,
  table:     ManageableTable,
  id:        number,
  isActive:  boolean,
): Promise<void> {
  const { error } = await client
    .from(table)
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw new Error(`toggleSettingsItem(${table}): ${error.message}`);
}

// ── Generic add ───────────────────────────────────────────────────────────────

export async function addSettingsItem<T>(
  client:  Client,
  table:   ManageableTable,
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
  client:  Client,
  table:   ManageableTable,
  id:      number,
  payload: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client
    .from(table)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`updateSettingsItem(${table}): ${error.message}`);
  return data as T;
}
