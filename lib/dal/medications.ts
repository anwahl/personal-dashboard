import type { SupabaseClient } from "@supabase/supabase-js";
import type { MedicationRow } from "@/types/schema";

type Client = SupabaseClient;

// Prescription reads/writes live in lib/dal/prescriptions.ts.

// ── Medications ───────────────────────────────────────────────────────────────

/** Adds a medication (e.g. one typed in while adding a prescription). */
export async function createMedication(
  client: Client,
  medicationName: string,
): Promise<MedicationRow> {
  const { data, error } = await client
    .from("medications")
    .insert({ medication_name: medicationName.trim() })
    .select()
    .single();
  if (error) throw new Error(`createMedication: ${error.message}`);
  return data as MedicationRow;
}
