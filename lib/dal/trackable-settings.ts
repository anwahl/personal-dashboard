/**
 * lib/dal/trackable-settings.ts
 *
 * Settings writes for trackables: the trackable itself, its range, choice
 * options, aggregate questions/answers, and category memberships.
 *
 * Shared pools (choice options, aggregate answers) hold only values; the
 * bridge rows hold order and active state. Nothing here deletes a trackable,
 * an option or a question: they are deactivated, keeping their history.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyTrackableRow,
  TrackableRangeRow,
  TrackableChoiceOptionRow,
  TrackableAggregateQuestionRow,
  TrackableAggregateQuestionOptionRow,
  TrackableToCategoryRow,
  TrackableOptionRow,
  TrackableAggregateOptionRow,
} from "@/types/schema";

type Client = SupabaseClient;
type SortUpdate = { id: number; sort_order: number };

async function one<T>(label: string, q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data as T;
}

async function setSortOrders(client: Client, table: string, updates: SortUpdate[]) {
  const results = await Promise.all(
    updates.map(({ id, sort_order }) => client.from(table).update({ sort_order }).eq("id", id)),
  );
  for (const r of results) if (r.error) throw new Error(`${table} order: ${r.error.message}`);
}

async function setActive(client: Client, table: string, id: number, isActive: boolean) {
  await client.from(table).update({ is_active: isActive }).eq("id", id).throwOnError();
}

// ── Trackables ────────────────────────────────────────────────────────────────

export type TrackableFields = Partial<Pick<DailyTrackableRow,
  "name" | "track_type" | "icon_id" | "color_hex" | "parent_trackable_id">>;

export async function addTrackable(client: Client, fields: TrackableFields): Promise<DailyTrackableRow> {
  return one("addTrackable", client.from("daily_trackables").insert(fields).select().single());
}

export async function updateTrackable(client: Client, id: number, fields: TrackableFields): Promise<void> {
  await client.from("daily_trackables").update(fields).eq("id", id).throwOnError();
}

export const toggleTrackable = (client: Client, id: number, isActive: boolean) =>
  setActive(client, "daily_trackables", id, isActive);

export async function saveRange(
  client: Client, trackableId: number, range: { range_min: number; range_max: number; range_step: number },
): Promise<TrackableRangeRow> {
  return one("saveRange", client.from("trackable_ranges")
    .upsert({ trackable_id: trackableId, ...range }, { onConflict: "trackable_id" })
    .select().single());
}

// ── Pools ─────────────────────────────────────────────────────────────────────

/** Every choice option ever created (shared across trackables). */
export async function getChoicePool(client: Client): Promise<TrackableOptionRow[]> {
  const { data, error } = await client.from("trackable_options").select("*").order("value");
  if (error) throw new Error(`getChoicePool: ${error.message}`);
  return (data ?? []) as TrackableOptionRow[];
}

/** Every aggregate answer ever created (shared across questions). */
export async function getAnswerPool(client: Client): Promise<TrackableAggregateOptionRow[]> {
  const { data, error } = await client.from("trackable_aggregate_options").select("*").order("value").order("label");
  if (error) throw new Error(`getAnswerPool: ${error.message}`);
  return ((data ?? []) as TrackableAggregateOptionRow[]).map(a => ({ ...a, value: Number(a.value) }));
}

// ── Prescription link ─────────────────────────────────────────────────────────

/** Points a prescription trackable at a prescription (null = unlink). */
export async function setTrackablePrescription(
  client: Client, trackableId: number, prescriptionId: number | null,
): Promise<void> {
  await client.from("trackable_prescription").delete().eq("trackable_id", trackableId).throwOnError();
  if (prescriptionId != null) {
    await client.from("trackable_prescription")
      .insert({ trackable_id: trackableId, prescription_id: prescriptionId })
      .throwOnError();
  }
}

// ── Choice options ────────────────────────────────────────────────────────────

/** The pool option with this value, created if it doesn't exist. */
async function findOrCreateOption(client: Client, value: string): Promise<number> {
  const trimmed = value.trim();
  const { data: found } = await client.from("trackable_options").select("id").eq("value", trimmed).maybeSingle();
  if (found) return found.id as number;
  const created = await one<{ id: number }>("trackable_options",
    client.from("trackable_options").insert({ value: trimmed }).select("id").single());
  return created.id;
}

export async function addChoiceOption(
  client: Client, trackableId: number, value: string, sortOrder: number,
): Promise<TrackableChoiceOptionRow & { value: string }> {
  const optionId = await findOrCreateOption(client, value);
  const row = await one<TrackableChoiceOptionRow>("addChoiceOption", client.from("trackable_choice_options")
    .insert({ trackable_id: trackableId, option_id: optionId, sort_order: sortOrder })
    .select().single());
  return { ...row, value: value.trim() };
}

/** Renames a pool option: every trackable offering it (and every day that
 *  picked it) shows the new text. */
export async function renameChoiceOption(client: Client, optionId: number, value: string): Promise<void> {
  await client.from("trackable_options").update({ value: value.trim() }).eq("id", optionId).throwOnError();
}

export const toggleChoiceOption   = (client: Client, id: number, isActive: boolean) =>
  setActive(client, "trackable_choice_options", id, isActive);
export const reorderChoiceOptions = (client: Client, updates: SortUpdate[]) =>
  setSortOrders(client, "trackable_choice_options", updates);

// ── Aggregate questions and answers ──────────────────────────────────────────

export async function addAggregateQuestion(
  client: Client, trackableId: number, question: string, sortOrder: number,
): Promise<TrackableAggregateQuestionRow> {
  return one("addAggregateQuestion", client.from("trackable_aggregate_questions")
    .insert({ trackable_id: trackableId, question: question.trim(), sort_order: sortOrder })
    .select().single());
}

export async function renameAggregateQuestion(client: Client, id: number, question: string): Promise<void> {
  await client.from("trackable_aggregate_questions").update({ question: question.trim() }).eq("id", id).throwOnError();
}

export const toggleAggregateQuestion   = (client: Client, id: number, isActive: boolean) =>
  setActive(client, "trackable_aggregate_questions", id, isActive);
export const reorderAggregateQuestions = (client: Client, updates: SortUpdate[]) =>
  setSortOrders(client, "trackable_aggregate_questions", updates);

/** The pool answer with this label + value, created if it doesn't exist. */
async function findOrCreateAnswer(client: Client, label: string, value: number): Promise<number> {
  const trimmed = label.trim();
  const { data: found } = await client.from("trackable_aggregate_options").select("id")
    .eq("label", trimmed).eq("value", value).maybeSingle();
  if (found) return found.id as number;
  const created = await one<{ id: number }>("trackable_aggregate_options",
    client.from("trackable_aggregate_options").insert({ label: trimmed, value }).select("id").single());
  return created.id;
}

export async function addAggregateAnswer(
  client: Client, questionId: number, label: string, value: number, sortOrder: number,
): Promise<TrackableAggregateQuestionOptionRow & { label: string; value: number }> {
  const optionId = await findOrCreateAnswer(client, label, value);
  const row = await one<TrackableAggregateQuestionOptionRow>("addAggregateAnswer",
    client.from("trackable_aggregate_question_options")
      .insert({ question_id: questionId, option_id: optionId, sort_order: sortOrder })
      .select().single());
  return { ...row, label: label.trim(), value };
}

/** Edits a pool answer: every question offering it (and every day that
 *  picked it, so past totals too) shows the new label and value. */
export async function updateAggregateAnswer(client: Client, optionId: number, label: string, value: number): Promise<void> {
  await client.from("trackable_aggregate_options")
    .update({ label: label.trim(), value }).eq("id", optionId).throwOnError();
}

export const toggleAggregateAnswer   = (client: Client, id: number, isActive: boolean) =>
  setActive(client, "trackable_aggregate_question_options", id, isActive);
export const reorderAggregateAnswers = (client: Client, updates: SortUpdate[]) =>
  setSortOrders(client, "trackable_aggregate_question_options", updates);

// ── Categories and memberships ────────────────────────────────────────────────

export async function addTrackableCategory(client: Client, name: string) {
  return one<{ id: number; category_name: string; is_active: boolean }>("addTrackableCategory",
    client.from("trackable_categories").insert({ category_name: name.trim() }).select().single());
}

export async function renameTrackableCategory(client: Client, id: number, name: string): Promise<void> {
  await client.from("trackable_categories").update({ category_name: name.trim() }).eq("id", id).throwOnError();
}

export const toggleTrackableCategory = (client: Client, id: number, isActive: boolean) =>
  setActive(client, "trackable_categories", id, isActive);

export async function addTrackableLink(
  client: Client, trackableId: number, categoryId: number, sortOrder: number,
): Promise<TrackableToCategoryRow> {
  return one("addTrackableLink", client.from("trackable_to_category")
    .insert({ trackable_id: trackableId, category_id: categoryId, sort_order: sortOrder })
    .select().single());
}

export async function moveTrackableLink(client: Client, linkId: number, categoryId: number): Promise<void> {
  await client.from("trackable_to_category").update({ category_id: categoryId }).eq("id", linkId).throwOnError();
}

export async function removeTrackableLink(client: Client, linkId: number): Promise<void> {
  await client.from("trackable_to_category").delete().eq("id", linkId).throwOnError();
}

export const reorderTrackableLinks = (client: Client, updates: SortUpdate[]) =>
  setSortOrders(client, "trackable_to_category", updates);
