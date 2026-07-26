import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProviderRow } from '@/types/schema';

type Client = SupabaseClient;

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getProviders(client: Client): Promise<ProviderRow[]> {
  const { data, error } = await client
    .from('providers')
    .select('*')
    .order('provider_name');
  if (error) throw new Error(`getProviders: ${error.message}`);
  return (data ?? []) as ProviderRow[];
}

// ── Write ─────────────────────────────────────────────────────────────────────

export interface ProviderPayload {
  provider_type_id: number;
  provider_name:    string | null;
  practice_name:    string | null;
  phone:            string | null;
  address?:         string | null;
  portal_url?:      string | null;
}

export async function createProvider(
  client:  Client,
  payload: ProviderPayload,
): Promise<ProviderRow> {
  const { data, error } = await client
    .from('providers')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createProvider: ${error.message}`);
  return data as ProviderRow;
}

export async function updateProvider(
  client:  Client,
  id:      number,
  payload: Partial<ProviderPayload>,
): Promise<ProviderRow> {
  const { data, error } = await client
    .from('providers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`updateProvider: ${error.message}`);
  return data as ProviderRow;
}

export async function toggleProviderActive(
  client:   Client,
  id:       number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from('providers')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw new Error(`toggleProviderActive: ${error.message}`);
}
