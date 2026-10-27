/**
 * lib/dal/trackables.ts
 *
 * Trackables: definitions (with their type-specific settings) and the values
 * entered for a day. Each type keeps its values in its own entries table:
 *
 *   boolean          trackable_boolean_entries    a row = yes
 *   numeric          trackable_numeric_entries
 *   combo            trackable_combo_entries      a row = yes; value optional
 *   time             trackable_time_entries       local timestamp
 *   short/long_text  trackable_text_entries
 *   icon             trackable_icon_entries
 *   tags             trackable_tag_entries        a row per tag
 *   choice           trackable_choice_entries     a pool option id
 *   aggregate        trackable_aggregate_entries  an answer per question
 *   prescription     trackable_boolean_entries    a row = taken (which
 *                    prescription: trackable_prescription)
 *
 * No row = nothing entered. Clearing a value deletes its row.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyTrackableRow,
  TrackableRangeRow,
  TrackableChoiceOptionRow,
  TrackableOptionRow,
  TrackableAggregateQuestionRow,
  TrackableAggregateQuestionOptionRow,
  TrackableAggregateOptionRow,
  TrackableToCategoryRow,
  TrackablePrescriptionRow,
  TrackType,
} from "@/types/schema";
import type { TrackableDetail, DayValues } from "@/types/dal";

type Client = SupabaseClient;

const bySort = (a: { sort_order: number; id: number }, b: { sort_order: number; id: number }) =>
  a.sort_order - b.sort_order || a.id - b.id;

async function all<T>(label: string, q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(`${label}: ${error.message}`);
  return (data ?? []) as T[];
}

// ── Definitions ───────────────────────────────────────────────────────────────

/**
 * Every trackable with its range, choice options and aggregate questions.
 * includeInactive=false drops inactive trackables (their inactive options and
 * questions are kept, so a day's saved value can still be shown).
 */
export async function getTrackableDetails(client: Client, includeInactive = false): Promise<TrackableDetail[]> {
  let tq = client.from("daily_trackables").select("*").order("name");
  if (!includeInactive) tq = tq.eq("is_active", true);

  const [trackables, ranges, choiceLinks, options, questions, questionLinks, answers, rxLinks] = await Promise.all([
    all<DailyTrackableRow>("daily_trackables", tq),
    all<TrackableRangeRow>("trackable_ranges", client.from("trackable_ranges").select("*")),
    all<TrackableChoiceOptionRow>("trackable_choice_options", client.from("trackable_choice_options").select("*")),
    all<TrackableOptionRow>("trackable_options", client.from("trackable_options").select("*")),
    all<TrackableAggregateQuestionRow>("trackable_aggregate_questions", client.from("trackable_aggregate_questions").select("*")),
    all<TrackableAggregateQuestionOptionRow>("trackable_aggregate_question_options", client.from("trackable_aggregate_question_options").select("*")),
    all<TrackableAggregateOptionRow>("trackable_aggregate_options", client.from("trackable_aggregate_options").select("*")),
    all<TrackablePrescriptionRow>("trackable_prescription", client.from("trackable_prescription").select("*")),
  ]);

  const optionById = new Map(options.map(o => [o.id, o]));
  const answerById = new Map(answers.map(a => [a.id, a]));

  return trackables.map(t => ({
    ...t,
    range: ranges.find(r => r.trackable_id === t.id) ?? null,
    choice_options: choiceLinks
      .filter(l => l.trackable_id === t.id)
      .sort(bySort)
      .map(l => ({ ...l, value: optionById.get(l.option_id)?.value ?? "" })),
    questions: questions
      .filter(q => q.trackable_id === t.id)
      .sort(bySort)
      .map(q => ({
        ...q,
        options: questionLinks
          .filter(l => l.question_id === q.id)
          .sort(bySort)
          .map(l => {
            const a = answerById.get(l.option_id);
            return { ...l, value: Number(a?.value ?? 0), label: a?.label ?? "" };
          }),
      })),
    prescription_id: rxLinks.find(l => l.trackable_id === t.id)?.prescription_id ?? null,
  }));
}

export async function getTrackableLinks(client: Client): Promise<TrackableToCategoryRow[]> {
  return all<TrackableToCategoryRow>(
    "trackable_to_category",
    client.from("trackable_to_category").select("*").order("sort_order"),
  );
}

// ── A day's values ────────────────────────────────────────────────────────────

export function emptyDayValues(): DayValues {
  return { boolean: [], numeric: {}, combo: {}, time: {}, text: {}, icon: {}, tags: {}, choice: {}, aggregate: {} };
}

/** "2026-10-24T22:30:00" → "2026-10-24T22:30" (what a datetime-local input takes). */
const toMinutes = (ts: string) => ts.replace(" ", "T").slice(0, 16);

export async function getDayValues(client: Client, entryId: number): Promise<DayValues> {
  const byEntry = (table: string, cols: string) =>
    all<Record<string, unknown>>(table, client.from(table).select(cols).eq("entry_id", entryId));

  const [bool, num, combo, time, text, icon, tags, choice, agg] = await Promise.all([
    byEntry("trackable_boolean_entries", "trackable_id"),
    byEntry("trackable_numeric_entries", "trackable_id, value"),
    byEntry("trackable_combo_entries",   "trackable_id, value"),
    byEntry("trackable_time_entries",    "trackable_id, value"),
    byEntry("trackable_text_entries",    "trackable_id, value"),
    byEntry("trackable_icon_entries",    "trackable_id, icon_id"),
    byEntry("trackable_tag_entries",     "trackable_id, tag_id"),
    byEntry("trackable_choice_entries",  "trackable_id, option_id"),
    byEntry("trackable_aggregate_entries", "question_id, option_id"),
  ]);

  const v = emptyDayValues();
  v.boolean = bool.map(r => r.trackable_id as number);
  for (const r of num)    v.numeric[r.trackable_id as number] = Number(r.value);
  for (const r of combo)  v.combo[r.trackable_id as number]   = r.value == null ? null : Number(r.value);
  for (const r of time)   v.time[r.trackable_id as number]    = toMinutes(String(r.value));
  for (const r of text)   v.text[r.trackable_id as number]    = String(r.value);
  for (const r of icon)   v.icon[r.trackable_id as number]    = r.icon_id as number;
  for (const r of tags)   (v.tags[r.trackable_id as number] ??= []).push(r.tag_id as number);
  for (const r of choice) v.choice[r.trackable_id as number]  = r.option_id as number;
  for (const r of agg)    v.aggregate[r.question_id as number] = r.option_id as number;
  return v;
}

// ── Writing values ────────────────────────────────────────────────────────────

const ENTRY_KEY = "entry_id,trackable_id";

async function upsertValue(client: Client, table: string, entryId: number, trackableId: number, fields: Record<string, unknown>) {
  await client.from(table)
    .upsert({ entry_id: entryId, trackable_id: trackableId, ...fields }, { onConflict: ENTRY_KEY })
    .throwOnError();
}

async function deleteValue(client: Client, table: string, entryId: number, trackableId: number) {
  await client.from(table).delete().eq("entry_id", entryId).eq("trackable_id", trackableId).throwOnError();
}

export async function setBooleanEntry(client: Client, entryId: number, trackableId: number, yes: boolean) {
  if (yes) await upsertValue(client, "trackable_boolean_entries", entryId, trackableId, {});
  else     await deleteValue(client, "trackable_boolean_entries", entryId, trackableId);
}

export async function setTagEntry(client: Client, entryId: number, trackableId: number, tagId: number, on: boolean) {
  if (on) {
    await client.from("trackable_tag_entries")
      .upsert({ entry_id: entryId, trackable_id: trackableId, tag_id: tagId }, { onConflict: "entry_id,trackable_id,tag_id" })
      .throwOnError();
  } else {
    await client.from("trackable_tag_entries").delete()
      .eq("entry_id", entryId).eq("trackable_id", trackableId).eq("tag_id", tagId).throwOnError();
  }
}

/** The answer to one aggregate question (null = clear it). */
export async function setAggregateAnswer(client: Client, entryId: number, questionId: number, optionId: number | null) {
  if (optionId == null) {
    await client.from("trackable_aggregate_entries").delete()
      .eq("entry_id", entryId).eq("question_id", questionId).throwOnError();
  } else {
    await client.from("trackable_aggregate_entries")
      .upsert({ entry_id: entryId, question_id: questionId, option_id: optionId }, { onConflict: "entry_id,question_id" })
      .throwOnError();
  }
}

/** Value kinds saved with the Save button (booleans, tags and aggregate
 *  answers save as soon as they're tapped). */
type SavedKind = "numeric" | "combo" | "time" | "text" | "icon" | "choice";

const TABLE: Record<SavedKind, { table: string; column: string }> = {
  numeric: { table: "trackable_numeric_entries", column: "value" },
  combo:   { table: "trackable_combo_entries",   column: "value" },
  time:    { table: "trackable_time_entries",    column: "value" },
  text:    { table: "trackable_text_entries",    column: "value" },
  icon:    { table: "trackable_icon_entries",    column: "icon_id" },
  choice:  { table: "trackable_choice_entries",  column: "option_id" },
};

/**
 * Saves what changed between `saved` and `next` for the Save-button kinds.
 * Text is trimmed; empty text deletes the row.
 */
export async function saveDayValues(client: Client, entryId: number, saved: DayValues, next: DayValues): Promise<void> {
  const writes: Promise<void>[] = [];
  for (const kind of Object.keys(TABLE) as SavedKind[]) {
    const { table, column } = TABLE[kind];
    const before = saved[kind] as Record<number, unknown>;
    const after  = next[kind]  as Record<number, unknown>;
    const ids = new Set([...Object.keys(before), ...Object.keys(after)].map(Number));
    for (const id of ids) {
      let value = after[id];
      if (kind === "text" && typeof value === "string") value = value.trim() || undefined;
      const had = id in before;
      const has = value !== undefined && (kind === "combo" || value !== null);
      if (!has) {
        if (had) writes.push(deleteValue(client, table, entryId, id));
      } else if (!had || before[id] !== value) {
        writes.push(upsertValue(client, table, entryId, id, { [column]: value }));
      }
    }
  }
  await Promise.all(writes);
}

// ── Has entries (the type is locked once it has) ─────────────────────────────

const ENTRY_TABLE: Record<Exclude<TrackType, "aggregate">, string> = {
  boolean:      "trackable_boolean_entries",
  prescription: "trackable_boolean_entries",
  numeric:    "trackable_numeric_entries",
  combo:      "trackable_combo_entries",
  time:       "trackable_time_entries",
  short_text: "trackable_text_entries",
  long_text:  "trackable_text_entries",
  icon:       "trackable_icon_entries",
  tags:       "trackable_tag_entries",
  choice:     "trackable_choice_entries",
};

export async function trackableHasEntries(client: Client, trackable: Pick<DailyTrackableRow, "id" | "track_type">): Promise<boolean> {
  if (trackable.track_type === "aggregate") {
    const { data: qs } = await client.from("trackable_aggregate_questions").select("id").eq("trackable_id", trackable.id);
    const ids = (qs ?? []).map(q => q.id as number);
    if (!ids.length) return false;
    const { count } = await client.from("trackable_aggregate_entries")
      .select("id", { count: "exact", head: true }).in("question_id", ids);
    return (count ?? 0) > 0;
  }
  const { count } = await client.from(ENTRY_TABLE[trackable.track_type])
    .select("id", { count: "exact", head: true }).eq("trackable_id", trackable.id);
  return (count ?? 0) > 0;
}
