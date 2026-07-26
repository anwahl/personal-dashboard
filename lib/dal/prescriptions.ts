/**
 * lib/dal/prescriptions.ts
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PrescriptionRow,
  MedicationRow,
  MedicationTimingTypeRow,
  ProviderRow,
  PrescriptionRefillRow,
} from "@/types/schema";
import type {
  PrescriptionDetail,
  PrescriptionInsert,
  PrescriptionUpdate,
} from "@/types/dal";

type Client = SupabaseClient;

async function enrichPrescriptions(
  client: Client,
  rows: PrescriptionRow[],
): Promise<PrescriptionDetail[]> {
  if (rows.length === 0) return [];

  const medIds = [...new Set(rows.map((r) => r.medication_id))];
  const timingIds = [
    ...new Set(rows.map((r) => r.timing_type_id).filter(Boolean)),
  ] as number[];
  const providerIds = [
    ...new Set(rows.map((r) => r.prescriber_id).filter(Boolean)),
  ] as number[];

  const [meds, timings, providers, refills] = await Promise.all([
    client
      .from("medications")
      .select("*")
      .in("id", medIds)
      .then((r) => (r.data ?? []) as MedicationRow[]),

    timingIds.length > 0
      ? client
          .from("medication_timing_types")
          .select("*")
          .in("id", timingIds)
          .then((r) => (r.data ?? []) as MedicationTimingTypeRow[])
      : Promise.resolve([]),

    providerIds.length > 0
      ? client
          .from("providers")
          .select("*")
          .in("id", providerIds)
          .then((r) => (r.data ?? []) as ProviderRow[])
      : Promise.resolve([]),

    // Latest refill per prescription
    client
      .from("prescription_refills")
      .select("*")
      .in(
        "prescription_id",
        rows.map((r) => r.id),
      )
      .order("fill_date", { ascending: false })
      .then((r) => (r.data ?? []) as PrescriptionRefillRow[]),
  ]);

  const medMap = new Map(meds.map((m) => [m.id, m]));
  const timingMap = new Map(timings.map((t) => [t.id, t]));
  const providerMap = new Map(providers.map((p) => [p.id, p]));

  // One latest refill per prescription (already sorted desc)
  const latestRefillMap = new Map<number, PrescriptionRefillRow>();
  for (const refill of refills) {
    if (!latestRefillMap.has(refill.prescription_id)) {
      latestRefillMap.set(refill.prescription_id, refill);
    }
  }

  return rows.map((row) => ({
    ...row,
    medication: medMap.get(row.medication_id)!,
    timing_type: row.timing_type_id
      ? (timingMap.get(row.timing_type_id) ?? null)
      : null,
    prescriber: row.prescriber_id
      ? (providerMap.get(row.prescriber_id) ?? null)
      : null,
    latest_refill: latestRefillMap.get(row.id) ?? null,
  }));
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getActivePrescriptions(
  client: Client,
  personId: number,
): Promise<PrescriptionDetail[]> {
  const { data, error } = await client
    .from("prescriptions")
    .select("*")
    .eq("person_id", personId)
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw new Error(`getActivePrescriptions: ${error.message}`);
  return enrichPrescriptions(client, (data ?? []) as PrescriptionRow[]);
}

export async function getAllPrescriptions(
  client: Client,
  personId: number,
): Promise<PrescriptionDetail[]> {
  const { data, error } = await client
    .from("prescriptions")
    .select("*")
    .eq("person_id", personId)
    .order("sort_order");

  if (error) throw new Error(`getAllPrescriptions: ${error.message}`);
  return enrichPrescriptions(client, (data ?? []) as PrescriptionRow[]);
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createPrescription(
  client: Client,
  data: PrescriptionInsert,
): Promise<PrescriptionRow> {
  const { data: row, error } = await client
    .from("prescriptions")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`createPrescription: ${error.message}`);
  return row as PrescriptionRow;
}

export async function updatePrescription(
  client: Client,
  id: number,
  data: PrescriptionUpdate,
): Promise<void> {
  const { error } = await client
    .from("prescriptions")
    .update(data)
    .eq("id", id);
  if (error) throw new Error(`updatePrescription: ${error.message}`);
}
