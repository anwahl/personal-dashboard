/**
 * lib/dal/reference.ts
 *
 * All reference / type table queries.
 *
 * These are the tables that define what the UI presents —
 * habit names, symptom types, ESS questions, etc.
 * The frontend NEVER hardcodes these values; it always fetches them here.
 *
 * include_inactive: when true, returns all rows (for admin/settings);
 *                   when false (default), returns only is_active = true.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  HabitRow,
  TagRow,
  SymptomCategoryRow,
  SymptomTypeRow,
  EssQuestionTypeRow,
  EssAnswerTypeRow,
  TimingOptionRow,
  TimingCategoryRow,
  PreBedConsumptionTypeRow,
  SleepEventTypeRow,
  ProviderTypeRow,
  AppointmentTypeRow,
  MedicationTimingTypeRow,
  TaskStatusRow,
  TaskPriorityRow,
  TimelineEventTypeRow,
  MediaTypeRow,
  MediaStatusRow,
  MediaGenreRow,
  IntentionRow,
  JournalCategoryRow,
  JournalPromptRow,
  PersonRow,
} from '@/types/schema';
import type {
  ReferenceData,
  SymptomCategoryWithTypes,
  JournalCategoryWithPrompts,
} from '@/types/dal';

// ── Shared helper ─────────────────────────────────────────────────────────────

type Client = SupabaseClient;

async function fetchRef<T>(
  client: Client,
  table: string,
  includeInactive = false
): Promise<T[]> {
  let q = client.from(table).select('*').order('sort_order');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

// ── Individual reference fetchers ─────────────────────────────────────────────

export const getHabits = (c: Client, includeInactive = false) =>
  fetchRef<HabitRow>(c, 'habits', includeInactive);

export const getTags = (c: Client, includeInactive = false) =>
  fetchRef<TagRow>(c, 'tags', includeInactive);

export const getEssQuestionTypes = (c: Client, includeInactive = false) =>
  fetchRef<EssQuestionTypeRow>(c, 'ess_question_types', includeInactive);

export const getEssAnswerTypes = (c: Client, includeInactive = false) =>
  fetchRef<EssAnswerTypeRow>(c, 'ess_answer_types', includeInactive);

export const getTimingOptions = (c: Client, includeInactive = false) =>
  fetchRef<TimingOptionRow>(c, 'timing_options', includeInactive);

export const getTimingCategories = (c: Client, includeInactive = false) =>
  fetchRef<TimingCategoryRow>(c, 'timing_categories', includeInactive);

export const getPreBedConsumptionTypes = (c: Client, includeInactive = false) =>
  fetchRef<PreBedConsumptionTypeRow>(c, 'pre_bed_consumption_types', includeInactive);

export const getSleepEventTypes = (c: Client, includeInactive = false) =>
  fetchRef<SleepEventTypeRow>(c, 'sleep_event_types', includeInactive);

export const getProviderTypes = (c: Client, includeInactive = false) =>
  fetchRef<ProviderTypeRow>(c, 'provider_types', includeInactive);

export const getAppointmentTypes = (c: Client, includeInactive = false) =>
  fetchRef<AppointmentTypeRow>(c, 'appointment_types', includeInactive);

export const getMedicationTimingTypes = (c: Client, includeInactive = false) =>
  fetchRef<MedicationTimingTypeRow>(c, 'medication_timing_types', includeInactive);

export const getTaskStatuses = (c: Client, includeInactive = false) =>
  fetchRef<TaskStatusRow>(c, 'task_statuses', includeInactive);

export const getTaskPriorities = (c: Client, includeInactive = false) =>
  fetchRef<TaskPriorityRow>(c, 'task_priorities', includeInactive);

export const getTimelineEventTypes = (c: Client, includeInactive = false) =>
  fetchRef<TimelineEventTypeRow>(c, 'timeline_event_types', includeInactive);

export const getMediaTypes = (c: Client, includeInactive = false) =>
  fetchRef<MediaTypeRow>(c, 'media_types', includeInactive);

export const getMediaStatuses = (c: Client, includeInactive = false) =>
  fetchRef<MediaStatusRow>(c, 'media_statuses', includeInactive);

export const getMediaGenres = (c: Client, includeInactive = false) =>
  fetchRef<MediaGenreRow>(c, 'media_genres', includeInactive);

export const getPeople = (c: Client, includeInactive = false) =>
  fetchRef<PersonRow>(c, 'people', includeInactive);

// ── Symptom categories with their types (nested) ──────────────────────────────

export async function getSymptomCategoriesWithTypes(
  client: Client,
  includeInactive = false
): Promise<SymptomCategoryWithTypes[]> {
  const [categories, types] = await Promise.all([
    fetchRef<SymptomCategoryRow>(client, 'symptom_categories', includeInactive),
    fetchRef<SymptomTypeRow>(client, 'symptom_types', includeInactive),
  ]);

  return categories.map(cat => ({
    ...cat,
    types: types.filter(t => t.category_id === cat.id),
  }));
}

// ── Intentions ────────────────────────────────────────────────────────────────

export async function getActiveIntentions(client: Client): Promise<IntentionRow[]> {
  const { data, error } = await client
    .from('intentions')
    .select('*')
    .eq('is_active', true);
  if (error) throw new Error(`getActiveIntentions: ${error.message}`);
  return (data ?? []) as IntentionRow[];
}

export async function getRandomIntention(client: Client): Promise<IntentionRow | null> {
  // Postgres random row selection — efficient for small tables
  const { data, error } = await client
    .from('intentions')
    .select('*')
    .eq('is_active', true)
    .order('id'); // deterministic order first so LIMIT+OFFSET is consistent

  if (error) throw new Error(`getRandomIntention: ${error.message}`);
  if (!data || data.length === 0) return null;

  const idx = Math.floor(Math.random() * data.length);
  return data[idx] as IntentionRow;
}

// ── Journal categories with their prompts ─────────────────────────────────────

export async function getJournalCategoriesWithPrompts(
  client: Client,
  includeInactive = false
): Promise<JournalCategoryWithPrompts[]> {
  const categoriesQ = client
    .from('journal_categories')
    .select('*')
    .order('sort_order');

  const promptsQ = client
    .from('journal_prompts')
    .select('*')
    .order('id');

  if (!includeInactive) {
    categoriesQ.eq('is_active', true);
    promptsQ.eq('is_active', true);
  }

  const [{ data: cats, error: cErr }, { data: prompts, error: pErr }] =
    await Promise.all([categoriesQ, promptsQ]);

  if (cErr) throw new Error(`journal_categories: ${cErr.message}`);
  if (pErr) throw new Error(`journal_prompts: ${pErr.message}`);

  return (cats ?? []).map((cat: JournalCategoryRow) => ({
    ...cat,
    prompts: ((prompts ?? []) as JournalPromptRow[]).filter(
      p => p.category_id === cat.id
    ),
  }));
}

export async function getRandomJournalPrompt(
  client: Client,
  categoryId?: number
): Promise<JournalPromptRow | null> {
  let q = client.from('journal_prompts').select('*').eq('is_active', true);
  if (categoryId != null) q = q.eq('category_id', categoryId);

  const { data, error } = await q;
  if (error) throw new Error(`getRandomJournalPrompt: ${error.message}`);
  if (!data || data.length === 0) return null;

  return data[Math.floor(Math.random() * data.length)] as JournalPromptRow;
}

// ── Full reference data bundle (for pages that need everything) ───────────────

export async function getReferenceData(client: Client): Promise<ReferenceData> {
  const [
    habits,
    tags,
    symptomCategories,
    essQuestionTypes,
    essAnswerTypes,
    timingOptions,
    timingCategories,
    consumptionTypes,
    sleepEventTypes,
    appointmentTypes,
    providerTypes,
    medicationTimings,
    taskStatuses,
    taskPriorities,
    mediaTypes,
    mediaStatuses,
    mediaGenres,
    journalCategories,
    people,
  ] = await Promise.all([
    getHabits(client),
    getTags(client),
    getSymptomCategoriesWithTypes(client),
    getEssQuestionTypes(client),
    getEssAnswerTypes(client),
    getTimingOptions(client),
    getTimingCategories(client),
    getPreBedConsumptionTypes(client),
    getSleepEventTypes(client),
    getAppointmentTypes(client),
    getProviderTypes(client),
    getMedicationTimingTypes(client),
    getTaskStatuses(client),
    getTaskPriorities(client),
    getMediaTypes(client),
    getMediaStatuses(client),
    getMediaGenres(client),
    getJournalCategoriesWithPrompts(client),
    getPeople(client),
  ]);

  return {
    habits,
    tags,
    symptomCategories,
    essQuestionTypes,
    essAnswerTypes,
    timingOptions,
    timingCategories,
    consumptionTypes,
    sleepEventTypes,
    appointmentTypes,
    providerTypes,
    medicationTimings,
    taskStatuses,
    taskPriorities,
    mediaTypes,
    mediaStatuses,
    mediaGenres,
    journalCategories,
    people,
  };
}
