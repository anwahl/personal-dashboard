import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LastTimeMediaRow,
  LastTimeBooleanRow,
  LastTimeCustomRow,
} from '@/types/schema';

type Client = SupabaseClient;

// ── Media last-time ───────────────────────────────────────────────────────────

export async function getLastTimeMedia(client: Client): Promise<LastTimeMediaRow[]> {
  const { data, error } = await client
    .from('last_time_media')
    .select('*')
    .order('sort_order');
  if (error) throw new Error(`getLastTimeMedia: ${error.message}`);
  return (data ?? []) as LastTimeMediaRow[];
}

export interface LastTimeMediaPayload {
  label:     string;
  emoji:     string | null;
  type_id:   number | null;
  genre_id:  number | null;
  status_id: number | null;
  sort_order: number;
}

export async function createLastTimeMedia(
  client:  Client,
  payload: LastTimeMediaPayload,
): Promise<LastTimeMediaRow> {
  const { data, error } = await client
    .from('last_time_media')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createLastTimeMedia: ${error.message}`);
  return data as LastTimeMediaRow;
}

export async function deleteLastTimeMedia(client: Client, id: number): Promise<void> {
  const { error } = await client.from('last_time_media').delete().eq('id', id);
  if (error) throw new Error(`deleteLastTimeMedia: ${error.message}`);
}

// ── Boolean last-time ─────────────────────────────────────────────────────────

export async function getLastTimeBoolean(client: Client): Promise<LastTimeBooleanRow[]> {
  const { data, error } = await client
    .from('last_time_boolean')
    .select('*')
    .order('sort_order');
  if (error) throw new Error(`getLastTimeBoolean: ${error.message}`);
  return (data ?? []) as LastTimeBooleanRow[];
}

export interface LastTimeBooleanPayload {
  trackable_id: number;
  emoji:        string | null;
  sort_order:   number;
}

export async function createLastTimeBoolean(
  client:  Client,
  payload: LastTimeBooleanPayload,
): Promise<LastTimeBooleanRow> {
  const { data, error } = await client
    .from('last_time_boolean')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createLastTimeBoolean: ${error.message}`);
  return data as LastTimeBooleanRow;
}

export async function updateLastTimeBooleanEmoji(
  client: Client,
  id:     number,
  emoji:  string | null,
): Promise<void> {
  const { error } = await client
    .from('last_time_boolean')
    .update({ emoji })
    .eq('id', id);
  if (error) throw new Error(`updateLastTimeBooleanEmoji: ${error.message}`);
}

export async function deleteLastTimeBoolean(client: Client, id: number): Promise<void> {
  const { error } = await client.from('last_time_boolean').delete().eq('id', id);
  if (error) throw new Error(`deleteLastTimeBoolean: ${error.message}`);
}

// ── Custom last-time ──────────────────────────────────────────────────────────

export async function getLastTimeCustom(client: Client): Promise<LastTimeCustomRow[]> {
  const { data, error } = await client
    .from('last_time_custom')
    .select('*')
    .order('sort_order');
  if (error) throw new Error(`getLastTimeCustom: ${error.message}`);
  return (data ?? []) as LastTimeCustomRow[];
}

export interface LastTimeCustomPayload {
  custom_value: string;
  emoji:        string | null;
  sort_order:   number;
}

export async function createLastTimeCustom(
  client:  Client,
  payload: LastTimeCustomPayload,
): Promise<LastTimeCustomRow> {
  const { data, error } = await client
    .from('last_time_custom')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createLastTimeCustom: ${error.message}`);
  return data as LastTimeCustomRow;
}

export async function deleteLastTimeCustom(client: Client, id: number): Promise<void> {
  const { error } = await client.from('last_time_custom').delete().eq('id', id);
  if (error) throw new Error(`deleteLastTimeCustom: ${error.message}`);
}
