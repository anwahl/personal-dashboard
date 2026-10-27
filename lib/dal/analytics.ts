/**
 * lib/dal/analytics.ts
 *
 * Chart data: one number per trackable per day, read from the trackable's
 * entries table by its type. Fully data-agnostic: which trackables a chart
 * shows comes from chart_definitions + chart_trackable_links.
 *
 *   boolean    1 on days marked yes (prescription: 1 on days taken)
 *   numeric    the value
 *   combo      the value; 1 on "yes" days with no value
 *   aggregate  the day's total (sum of the answers' values)
 *
 * Other types (time, choice, text, icon, tags) aren't charted yet.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrackingDataPoint } from "@/types/dal";
import type { DailyTrackableRow, TrackType } from "@/types/schema";

type Client = SupabaseClient;
type Charted = Pick<DailyTrackableRow, "id" | "track_type">;

/** The types charts can show. */
export const CHARTABLE_TYPES: readonly TrackType[] = ["boolean", "prescription", "numeric", "combo", "aggregate"];

/**
 * Every value of the given trackables between two dates (inclusive), one
 * data point per day that has at least one value.
 */
export async function getCombinedTrackingData(
  client: Client,
  trackables: Charted[],
  fromDate: string,
  toDate: string,
): Promise<TrackingDataPoint[]> {
  const idsOf = (type: TrackType) => trackables.filter(t => t.track_type === type).map(t => t.id);
  const booleanIds   = [...idsOf("boolean"), ...idsOf("prescription")];
  const numericIds   = idsOf("numeric");
  const comboIds     = idsOf("combo");
  const aggregateIds = idsOf("aggregate");
  if (!booleanIds.length && !numericIds.length && !comboIds.length && !aggregateIds.length) return [];

  const { data: entries, error: eErr } = await client
    .from("daily_entries")
    .select("id, entry_date")
    .gte("entry_date", fromDate)
    .lte("entry_date", toDate);
  if (eErr) throw new Error(`getCombinedTrackingData entries: ${eErr.message}`);
  if (!entries?.length) return [];

  const dateById = new Map((entries as { id: number; entry_date: string }[]).map(e => [e.id, e.entry_date]));
  const entryIds = [...dateById.keys()];

  const fetchRows = async (table: string, cols: string, ids: number[], idCol = "trackable_id") => {
    if (!ids.length) return [] as Record<string, unknown>[];
    const { data, error } = await client.from(table).select(cols).in("entry_id", entryIds).in(idCol, ids);
    if (error) throw new Error(`getCombinedTrackingData ${table}: ${error.message}`);
    return (data ?? []) as unknown as Record<string, unknown>[];
  };

  // Aggregates: question → trackable, answer → value.
  const questionTrackable = new Map<number, number>();
  const answerValue       = new Map<number, number>();
  if (aggregateIds.length) {
    const [{ data: qs, error: qErr }, { data: answers, error: aErr }] = await Promise.all([
      client.from("trackable_aggregate_questions").select("id, trackable_id").in("trackable_id", aggregateIds),
      client.from("trackable_aggregate_options").select("id, value"),
    ]);
    if (qErr) throw new Error(`getCombinedTrackingData questions: ${qErr.message}`);
    if (aErr) throw new Error(`getCombinedTrackingData answers: ${aErr.message}`);
    for (const q of qs ?? []) questionTrackable.set(q.id as number, q.trackable_id as number);
    for (const a of answers ?? []) answerValue.set(a.id as number, Number(a.value));
  }

  const [bool, num, combo, agg] = await Promise.all([
    fetchRows("trackable_boolean_entries", "entry_id, trackable_id", booleanIds),
    fetchRows("trackable_numeric_entries", "entry_id, trackable_id, value", numericIds),
    fetchRows("trackable_combo_entries", "entry_id, trackable_id, value", comboIds),
    fetchRows("trackable_aggregate_entries", "entry_id, question_id, option_id", [...questionTrackable.keys()], "question_id"),
  ]);

  const byEntry = new Map<number, Record<number, number>>();
  const put = (entryId: number, trackableId: number, value: number, add = false) => {
    const values = byEntry.get(entryId) ?? {};
    values[trackableId] = add ? (values[trackableId] ?? 0) + value : value;
    byEntry.set(entryId, values);
  };

  for (const r of bool)  put(r.entry_id as number, r.trackable_id as number, 1);
  for (const r of num)   put(r.entry_id as number, r.trackable_id as number, Number(r.value));
  for (const r of combo) put(r.entry_id as number, r.trackable_id as number, r.value == null ? 1 : Number(r.value));
  for (const r of agg) {
    const trackableId = questionTrackable.get(r.question_id as number);
    if (trackableId != null) put(r.entry_id as number, trackableId, answerValue.get(r.option_id as number) ?? 0, true);
  }

  return [...byEntry.entries()]
    .map(([entryId, values]) => ({ date: dateById.get(entryId)!, values }))
    .filter(p => p.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}
