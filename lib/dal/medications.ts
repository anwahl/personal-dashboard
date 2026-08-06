import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrescriptionRow } from "@/types/schema";

type Client = SupabaseClient;

// ── Prescription CRUD ─────────────────────────────────────────────────────────

export interface PrescriptionPayload {
  person_id: number;
  medication_id: number;
  alias: string | null;
  dose: string | null;
  timing_type_id: number | null;
  purpose: string | null;
  prescriber_id: number | null;
  start_date: string | null;
  discontinued_date: string | null;
  sort_order?: number;
  is_active: boolean;
}

export async function createPrescription(
  client: Client,
  payload: PrescriptionPayload,
): Promise<PrescriptionRow> {
  const { data, error } = await client
    .from("prescriptions")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createPrescription: ${error.message}`);
  return data as PrescriptionRow;
}

export async function updatePrescription(
  client: Client,
  id: number,
  payload: Partial<PrescriptionPayload>,
): Promise<PrescriptionRow> {
  const { data, error } = await client
    .from("prescriptions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updatePrescription: ${error.message}`);
  return data as PrescriptionRow;
}

export async function togglePrescriptionActive(
  client: Client,
  id: number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from("prescriptions")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(`togglePrescriptionActive: ${error.message}`);
}
