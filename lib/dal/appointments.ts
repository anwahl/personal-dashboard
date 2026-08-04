/** lib/dal/appointments.ts */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppointmentRow,
  PersonRow,
  ProviderRow,
  AppointmentTypeRow,
  PrescriptionChangeRow,
} from "@/types/schema";
import type {
  AppointmentDetail,
  AppointmentInsert,
  AppointmentUpdate,
} from "@/types/dal";
import { localTodayISO } from "@/lib/utils/dates";

type Client = SupabaseClient;

async function enrich(
  client: Client,
  rows: AppointmentRow[],
): Promise<AppointmentDetail[]> {
  if (rows.length === 0) return [];

  const personIds = [...new Set(rows.map((r) => r.person_id))];
  const providerIds = [
    ...new Set(rows.map((r) => r.provider_id).filter(Boolean) as number[]),
  ];
  const apptTypeIds = [
    ...new Set(
      rows.map((r) => r.appointment_type_id).filter(Boolean) as number[],
    ),
  ];

  const [people, providers, apptTypes] = await Promise.all([
    client
      .from("people")
      .select("*")
      .in("id", personIds)
      .then((r) => (r.data ?? []) as PersonRow[]),
    providerIds.length > 0
      ? client
          .from("providers")
          .select("*")
          .in("id", providerIds)
          .then((r) => (r.data ?? []) as ProviderRow[])
      : Promise.resolve([]),
    apptTypeIds.length > 0
      ? client
          .from("appointment_types")
          .select("*")
          .in("id", apptTypeIds)
          .then((r) => (r.data ?? []) as AppointmentTypeRow[])
      : Promise.resolve([]),
  ]);

  const personMap = new Map(people.map((p) => [p.id, p]));
  const providerMap = new Map(providers.map((p) => [p.id, p]));
  const typeMap = new Map(apptTypes.map((t) => [t.id, t]));

  return rows.map((row) => ({
    ...row,
    person: personMap.get(row.person_id)!,
    provider: row.provider_id
      ? (providerMap.get(row.provider_id) ?? null)
      : null,
    appointment_type: row.appointment_type_id
      ? (typeMap.get(row.appointment_type_id) ?? null)
      : null,
  }));
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getUpcomingAppointments(
  client: Client,
  fromDate?: string,
  limit = 10,
): Promise<AppointmentDetail[]> {
  const from = fromDate ?? localTodayISO();
  const { data, error } = await client
    .from("appointments")
    .select("*")
    .gte("appointment_date", from)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(`getUpcomingAppointments: ${error.message}`);
  return enrich(client, (data ?? []) as AppointmentRow[]);
}

export async function getAllAppointments(client: Client): Promise<{
  upcoming: AppointmentDetail[];
  past: AppointmentDetail[];
}> {
  const today = localTodayISO();

  const [{ data: upcoming, error: ue }, { data: past, error: pe }] =
    await Promise.all([
      client
        .from("appointments")
        .select("*")
        .gte("appointment_date", today)
        .order("appointment_date", { ascending: true }),
      client
        .from("appointments")
        .select("*")
        .lt("appointment_date", today)
        .order("appointment_date", { ascending: false })
        .limit(50),
    ]);

  if (ue) throw new Error(`getAllAppointments upcoming: ${ue.message}`);
  if (pe) throw new Error(`getAllAppointments past: ${pe.message}`);

  const [enrichedUpcoming, enrichedPast] = await Promise.all([
    enrich(client, (upcoming ?? []) as AppointmentRow[]),
    enrich(client, (past ?? []) as AppointmentRow[]),
  ]);

  return { upcoming: enrichedUpcoming, past: enrichedPast };
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createAppointment(
  client: Client,
  data: AppointmentInsert,
): Promise<AppointmentRow> {
  const { data: row, error } = await client
    .from("appointments")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`createAppointment: ${error.message}`);
  return row as AppointmentRow;
}

export async function updateAppointment(
  client: Client,
  id: number,
  data: AppointmentUpdate,
): Promise<void> {
  const { error } = await client.from("appointments").update(data).eq("id", id);
  if (error) throw new Error(`updateAppointment: ${error.message}`);
}

export async function deleteAppointment(
  client: Client,
  id: number,
): Promise<void> {
  const { error } = await client.from("appointments").delete().eq("id", id);
  if (error) throw new Error(`deleteAppointment: ${error.message}`);
}

export async function getAppointmentById(
  client: Client,
  id: number,
): Promise<AppointmentDetail | null> {
  const { data, error } = await client
    .from("appointments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getAppointmentById(${id}): ${error.message}`);
  if (!data) return null;

  const enriched = await enrich(client, [data as AppointmentRow]);
  return enriched[0] ?? null;
}

// ── Prescription changes ───────────────────────────────────────────────────────

export interface PrescriptionChangePayload {
  appointment_id:  number | null;
  prescription_id: number;
  field_changed:   string;
  previous_value:  string | null;
  new_value:       string | null;
  change_notes:    string | null;
}

export async function getPrescriptionChanges(
  client:        Client,
  appointmentId: number,
): Promise<PrescriptionChangeRow[]> {
  const { data, error } = await client
    .from('prescription_changes')
    .select('*')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getPrescriptionChanges: ${error.message}`);
  return (data ?? []) as PrescriptionChangeRow[];
}

export async function createPrescriptionChange(
  client:  Client,
  payload: PrescriptionChangePayload,
): Promise<PrescriptionChangeRow> {
  const { data, error } = await client
    .from('prescription_changes')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createPrescriptionChange: ${error.message}`);
  return data as PrescriptionChangeRow;
}

export async function deletePrescriptionChange(client: Client, id: number): Promise<void> {
  const { error } = await client.from('prescription_changes').delete().eq('id', id);
  if (error) throw new Error(`deletePrescriptionChange: ${error.message}`);
}
