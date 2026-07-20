/**
 * lib/dal/reference.ts
 *
 * All reference / type table queries.
 * includeInactive=true for settings pages; false (default) for normal use.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DailyTrackableRow,
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
  ChartCategoryRow,
  ChartDefinitionRow,
  ChartTrackableLinkRow,
} from '@/types/schema';
import type {
  ReferenceData,
  SymptomCategoryWithTypes,
  JournalCategoryWithPrompts,
  ChartTrackableLinkDetail,
  ChartDefinitionDetail,
  } from '@/types/dal';

type Client = SupabaseClient;

async function fetchRef<T>(
  client: Client,
  table: string,
  includeInactive = false,
  orderCol = 'sort_order'
): Promise<T[]> {
  let q = client.from(table).select('*').order(orderCol);
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

// ── Trackables (replaces getHabits) ──────────────────────────────────────────

export const getTrackables = (c: Client, includeInactive = false) =>
  fetchRef<DailyTrackableRow>(c, 'daily_trackables', includeInactive);

// ── Other reference tables ────────────────────────────────────────────────────

export const getTags = (c: Client, includeInactive = false) =>
  fetchRef<TagRow>(c, 'tags', includeInactive, 'tag_value');

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
  fetchRef<MediaGenreRow>(c, 'media_genres', includeInactive, 'genre_name');

export const getPeople = (c: Client, includeInactive = false) =>
  fetchRef<PersonRow>(c, 'people', includeInactive);

// ── Symptom categories with their types ──────────────────────────────────────

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
  const { data, error } = await client.from('intentions').select('*').eq('is_active', true);
  if (error) throw new Error(`getActiveIntentions: ${error.message}`);
  return (data ?? []) as IntentionRow[];
}

export async function getRandomIntention(client: Client): Promise<IntentionRow | null> {
  const { data, error } = await client
    .from('intentions').select('*').eq('is_active', true).order('id');
  if (error) throw new Error(`getRandomIntention: ${error.message}`);
  if (!data?.length) return null;
  return data[Math.floor(Math.random() * data.length)] as IntentionRow;
}

// ── Journal categories with prompts ──────────────────────────────────────────

export async function getJournalCategoriesWithPrompts(
  client: Client,
  includeInactive = false
): Promise<JournalCategoryWithPrompts[]> {
  const catsQ    = client.from('journal_categories').select('*').order('sort_order');
  const promptsQ = client.from('journal_prompts').select('*').order('id');
  if (!includeInactive) { catsQ.eq('is_active', true); promptsQ.eq('is_active', true); }

  const [{ data: cats, error: cErr }, { data: prompts, error: pErr }] =
    await Promise.all([catsQ, promptsQ]);

  if (cErr) throw new Error(`journal_categories: ${cErr.message}`);
  if (pErr) throw new Error(`journal_prompts: ${pErr.message}`);

  return (cats ?? []).map((cat: JournalCategoryRow) => ({
    ...cat,
    prompts: ((prompts ?? []) as JournalPromptRow[]).filter(p => p.category_id === cat.id),
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
  if (!data?.length) return null;
  return data[Math.floor(Math.random() * data.length)] as JournalPromptRow;
}

// ── Chart categories ─────────────────────────────────────────────────────────

export async function getChartCategories(
  client: Client,
  includeInactive = false
): Promise<ChartCategoryRow[]> {
  let q = client.from('chart_categories').select('*').order('sort_order');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw new Error(`chart_categories: ${error.message}`);
  return (data ?? []) as ChartCategoryRow[];
}

// ── Chart definitions (with trackable links) ──────────────────────────────────

export async function getChartDefinitions(
  client: Client,
  includeInactive = false
): Promise<ChartDefinitionDetail[]> {
  let q = client.from('chart_definitions').select('*').order('sort_order');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data: charts, error: cErr } = await q;
  if (cErr) throw new Error(`chart_definitions: ${cErr.message}`);
  if (!charts?.length) return [];

  const chartIds = (charts as ChartDefinitionRow[]).map(c => c.id);

  const [{ data: links, error: lErr }, { data: trackables, error: tErr }, { data: categories, error: catErr }] = await Promise.all([
    client
      .from('chart_trackable_links')
      .select('*')
      .in('chart_id', chartIds)
      .order('sort_order'),
    client.from('daily_trackables').select('*').order('sort_order'),
    client.from('chart_categories').select('*').order('sort_order'),
  ]);

  if (lErr)    throw new Error(`chart_trackable_links: ${lErr.message}`);
  if (tErr)    throw new Error(`daily_trackables: ${tErr.message}`);
  if (catErr)  throw new Error(`chart_categories: ${catErr.message}`);

  const trackableById = new Map(
    ((trackables ?? []) as DailyTrackableRow[]).map(t => [t.id, t])
  );
  const categoryById = new Map(
    ((categories ?? []) as ChartCategoryRow[]).map(c => [c.id, c])
  );

  return (charts as ChartDefinitionRow[]).map(chart => ({
    ...chart,
    links: ((links ?? []) as ChartTrackableLinkRow[])
      .filter(l => l.chart_id === chart.id)
      .map(l => ({
        ...l,
        trackable: trackableById.get(l.trackable_id)!,
      }))
      .filter(l => l.trackable),
    category: chart.category_id ? (categoryById.get(chart.category_id) ?? null) : null,
  }));
}

// ── Full reference data bundle ────────────────────────────────────────────────

export async function getReferenceData(client: Client): Promise<ReferenceData> {
  const [
    trackables, tags, symptomCategories,
    essQuestionTypes, essAnswerTypes,
    timingOptions, timingCategories, consumptionTypes, sleepEventTypes,
    appointmentTypes, providerTypes, medicationTimings,
    taskStatuses, taskPriorities,
    mediaTypes, mediaStatuses, mediaGenres,
    journalCategories, people,
  ] = await Promise.all([
    getTrackables(client),
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
    trackables, tags, symptomCategories,
    essQuestionTypes, essAnswerTypes,
    timingOptions, timingCategories, consumptionTypes, sleepEventTypes,
    appointmentTypes, providerTypes, medicationTimings,
    taskStatuses, taskPriorities,
    mediaTypes, mediaStatuses, mediaGenres,
    journalCategories, people,
  };
}
