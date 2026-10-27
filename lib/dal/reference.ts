/**
 * lib/dal/reference.ts
 *
 * All reference / type table queries.
 * includeInactive=true for settings pages; false (default) for normal use.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TrackableCategoryRow,
  TagRow,
  ProviderTypeRow,
  AppointmentTypeRow,
  MedicationTimingTypeRow,
  TaskStatusRow,
  TaskPriorityRow,
  MediaTypeRow,
  MediaStatusRow,
  MediaGenreRow,
  IntentionRow,
  JournalCategoryRow,
  JournalPromptRow,
  PersonRow,
  PeopleCategoryRow,
  ChartCategoryRow,
  ChartDefinitionRow,
  ChartTrackableLinkRow,
  MediaStatusTypeLinkRow,
  ProviderRow,
  InfoGroupRow,
  ItemListRow,
  LogSchemaRow,
  ChecklistRow,
  InfoFieldTypeRow,
  LogSchemaFieldRow,
  LogSchemaFieldOptionRow,
  MedicationRow,
  IconRow,
} from "@/types/schema";
import type {
  ReferenceData,
  JournalCategoryWithPrompts,
  ChartDefinitionDetail,
} from "@/types/dal";
import { getTrackableDetails, getTrackableLinks } from "./trackables";
import { getEveryPrescription } from "./prescriptions";

type Client = SupabaseClient;

async function fetchRef<T>(
  client: Client,
  table: string,
  includeInactive = false,
  orderCol = "sort_order",
): Promise<T[]> {
  let q = client.from(table).select("*").order(orderCol);
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

// ── Icons ─────────────────────────────────────────────────────────────────────

export const getIconsRef = (c: Client, includeInactive = false) =>
  fetchRef<IconRow>(c, 'icons', includeInactive);

// ── Trackables ────────────────────────────────────────────────────────────────

/** Categories have no order of their own (order lives where they're placed). */
export const getTrackableCategories = (c: Client, includeInactive = false) =>
  fetchRef<TrackableCategoryRow>(c, "trackable_categories", includeInactive, "category_name");

/** Every trackable with its range, choice options and aggregate questions. */
export const getTrackables = getTrackableDetails;

// ── Other reference tables ────────────────────────────────────────────────────

export const getTags = (c: Client, includeInactive = false) =>
  fetchRef<TagRow>(c, "tags", includeInactive, "tag_value");

export const getProviderTypes = (c: Client, includeInactive = false) =>
  fetchRef<ProviderTypeRow>(c, "provider_types", includeInactive);

export const getAppointmentTypes = (c: Client, includeInactive = false) =>
  fetchRef<AppointmentTypeRow>(c, "appointment_types", includeInactive);

export const getMedicationTimingTypes = (c: Client, includeInactive = false) =>
  fetchRef<MedicationTimingTypeRow>(
    c,
    "medication_timing_types",
    includeInactive,
  );

export const getTaskStatuses = (c: Client, includeInactive = false) =>
  fetchRef<TaskStatusRow>(c, "task_statuses", includeInactive);

export const getTaskPriorities = (c: Client, includeInactive = false) =>
  fetchRef<TaskPriorityRow>(c, "task_priorities", includeInactive);

export const getMediaTypes = (c: Client, includeInactive = false) =>
  fetchRef<MediaTypeRow>(c, "media_types", includeInactive);

export const getMediaStatuses = (c: Client, includeInactive = false) =>
  fetchRef<MediaStatusRow>(c, "media_statuses", includeInactive);

export const getMediaGenres = (c: Client, includeInactive = false) =>
  fetchRef<MediaGenreRow>(c, "media_genres", includeInactive, "genre_name");

export const getPeople = (c: Client, includeInactive = false) =>
  fetchRef<PersonRow>(c, "people", includeInactive);

export const getPeopleCategories = (c: Client, includeInactive = false) =>
  fetchRef<PeopleCategoryRow>(c, "people_categories", includeInactive);

/** Returns only people whose category has is_assignable = true (or who have no category). */
export async function getAssignablePeople(client: Client): Promise<PersonRow[]> {
  const [people, categories] = await Promise.all([
    getPeople(client),
    getPeopleCategories(client),
  ]);
  const assignableIds = new Set(
    categories.filter(c => c.is_assignable).map(c => c.id),
  );
  // Include people with no category as assignable (safe default)
  return people.filter(p => p.category_id == null || assignableIds.has(p.category_id));
}

// ── Intentions ────────────────────────────────────────────────────────────────

export async function getRandomIntention(
  client: Client,
): Promise<IntentionRow | null> {
  const { data, error } = await client
    .from("intentions")
    .select("*")
    .eq("is_active", true)
    .order("id");
  if (error) throw new Error(`getRandomIntention: ${error.message}`);
  if (!data?.length) return null;
  const randomIndex =
    crypto.getRandomValues(new Uint32Array(1))[0] % data.length;
  return data[randomIndex] as IntentionRow;
}

// ── Journal categories with prompts ──────────────────────────────────────────

export async function getJournalCategoriesWithPrompts(
  client: Client,
  includeInactive = false,
): Promise<JournalCategoryWithPrompts[]> {
  const catsQ = client
    .from("journal_categories")
    .select("*")
    .order("sort_order");
  const promptsQ = client.from("journal_prompts").select("*").order("id");
  if (!includeInactive) {
    catsQ.eq("is_active", true);
    promptsQ.eq("is_active", true);
  }

  const [{ data: cats, error: cErr }, { data: prompts, error: pErr }] =
    await Promise.all([catsQ, promptsQ]);

  if (cErr) throw new Error(`journal_categories: ${cErr.message}`);
  if (pErr) throw new Error(`journal_prompts: ${pErr.message}`);

  return (cats ?? []).map((cat: JournalCategoryRow) => ({
    ...cat,
    prompts: ((prompts ?? []) as JournalPromptRow[]).filter(
      (p) => p.category_id === cat.id,
    ),
  }));
}

// ── Chart categories ─────────────────────────────────────────────────────────

export async function getChartCategories(
  client: Client,
  includeInactive = false,
): Promise<ChartCategoryRow[]> {
  let q = client.from("chart_categories").select("*").order("sort_order");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(`chart_categories: ${error.message}`);
  return (data ?? []) as ChartCategoryRow[];
}

// ── Chart definitions (with trackable links) ──────────────────────────────────

export async function getChartDefinitions(
  client: Client,
  includeInactive = false,
): Promise<ChartDefinitionDetail[]> {
  let q = client.from("chart_definitions").select("*").order("sort_order");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data: charts, error: cErr } = await q;
  if (cErr) throw new Error(`chart_definitions: ${cErr.message}`);
  if (!charts?.length) return [];

  const chartIds = (charts as ChartDefinitionRow[]).map((c) => c.id);

  const [
    { data: links, error: lErr },
    trackables,
    { data: categories, error: catErr },
  ] = await Promise.all([
    client
      .from("chart_trackable_links")
      .select("*")
      .in("chart_id", chartIds)
      .order("sort_order"),
    getTrackableDetails(client, true),
    client.from("chart_categories").select("*").order("sort_order"),
  ]);

  if (lErr) throw new Error(`chart_trackable_links: ${lErr.message}`);
  if (catErr) throw new Error(`chart_categories: ${catErr.message}`);

  const trackableById = new Map(
    trackables.map((t) => [t.id, t]),
  );
  const categoryById = new Map(
    ((categories ?? []) as ChartCategoryRow[]).map((c) => [c.id, c]),
  );

  return (charts as ChartDefinitionRow[]).map((chart) => ({
    ...chart,
    links: ((links ?? []) as ChartTrackableLinkRow[])
      .filter((l) => l.chart_id === chart.id)
      .map((l) => ({
        ...l,
        trackable: trackableById.get(l.trackable_id)!,
      }))
      .filter((l) => l.trackable),
    category: chart.category_id
      ? (categoryById.get(chart.category_id) ?? null)
      : null,
  }));
}

// ── Media status type links ──────────────────────────────────────────────────

export async function getMediaStatusTypeLinks(
  client: Client,
): Promise<MediaStatusTypeLinkRow[]> {
  const { data, error } = await client
    .from("media_status_type_links")
    .select("*");
  if (error) throw new Error(`media_status_type_links: ${error.message}`);
  return (data ?? []) as MediaStatusTypeLinkRow[];
}

// ── Full reference data bundle ────────────────────────────────────────────────

export async function getReferenceData(client: Client): Promise<ReferenceData> {
  const [
    icons,
    trackableCategories,
    trackableLinks,
    trackables,
    tags,
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
    peopleCategories,
    prescriptions,
  ] = await Promise.all([
    getIconsRef(client),
    getTrackableCategories(client),
    getTrackableLinks(client),
    getTrackables(client),
    getTags(client),
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
    getPeopleCategories(client),
    getEveryPrescription(client),
  ]);

  return {
    icons,
    trackableCategories,
    trackableLinks,
    trackables,
    tags,
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
    peopleCategories,
    prescriptions,
  };
}

// ── Settings page bulk fetch ───────────────────────────────────────────────────

interface SettingsPageData {
  tags: TagRow[];
  intentions: IntentionRow[];
  providers: ProviderRow[];
  providerTypes: ProviderTypeRow[];
  infoGroups: InfoGroupRow[];
  itemLists: ItemListRow[];
  logSchemas: LogSchemaRow[];
  checklists: ChecklistRow[];
  /** Every info group's fields, active or not. */
  infoFieldTypes: InfoFieldTypeRow[];
  /** Every log's columns, active or not, and the options of select columns. */
  logSchemaFields: LogSchemaFieldRow[];
  logSchemaFieldOptions: LogSchemaFieldOptionRow[];
  personInfoGroupLinks: Array<{ person_id: number; info_group_id: number }>;
  personItemListLinks: Array<{ person_id: number; list_id: number }>;
  personLogLinks: Array<{ person_id: number; log_id: number }>;
  personChecklistLinks: Array<{ person_id: number; checklist_id: number }>;
}

export async function getSettingsPageData(
  client: Client,
): Promise<SettingsPageData> {
  const [
    tagsRes,
    intentionsRes,
    providersRes,
    providerTypesRes,
    infoGroupsRes,
    itemListsRes,
    logSchemasRes,
    checklistsRes,
    infoFieldTypesRes,
    logFieldsRes,
    logOptionsRes,
    pigLinks,
    pilLinks,
    plLinks,
    pclLinks,
  ] = await Promise.all([
    client.from("tags").select("*").order("tag_value"),
    client.from("intentions").select("*").order("id"),
    client.from("providers").select("*").order("provider_name"),
    client.from("provider_types").select("*").order("sort_order"),
    client.from("info_groups").select("*").order("sort_order"),
    client.from("item_lists").select("*").order("sort_order"),
    client.from("log_schemas").select("*").order("sort_order"),
    client.from("checklists").select("*").order("sort_order"),
    client.from("info_field_types").select("*").order("sort_order"),
    client.from("log_schema_fields").select("*").order("sort_order"),
    client.from("log_schema_field_options").select("*").order("sort_order"),
    client.from("person_info_group_links").select("person_id, info_group_id"),
    client.from("person_item_list_links").select("person_id, list_id"),
    client.from("person_log_links").select("person_id, log_id"),
    client.from("person_checklist_links").select("person_id, checklist_id"),
  ]);

  const check = (label: string, error: { message: string } | null) => {
    if (error)
      throw new Error(`getSettingsPageData(${label}): ${error.message}`);
  };
  check("tags", tagsRes.error);
  check("intentions", intentionsRes.error);
  check("providers", providersRes.error);
  check("providerTypes", providerTypesRes.error);
  check("infoGroups", infoGroupsRes.error);
  check("itemLists", itemListsRes.error);
  check("logSchemas", logSchemasRes.error);
  check("checklists", checklistsRes.error);
  check("infoFieldTypes", infoFieldTypesRes.error);
  check("logSchemaFields", logFieldsRes.error);
  check("logSchemaFieldOptions", logOptionsRes.error);
  check("pigLinks", pigLinks.error);
  check("pilLinks", pilLinks.error);
  check("plLinks", plLinks.error);
  check("pclLinks", pclLinks.error);

  return {
    tags: (tagsRes.data ?? []) as TagRow[],
    intentions: (intentionsRes.data ?? []) as IntentionRow[],
    providers: (providersRes.data ?? []) as ProviderRow[],
    providerTypes: (providerTypesRes.data ?? []) as ProviderTypeRow[],
    infoGroups: (infoGroupsRes.data ?? []) as InfoGroupRow[],
    itemLists: (itemListsRes.data ?? []) as ItemListRow[],
    logSchemas: (logSchemasRes.data ?? []) as LogSchemaRow[],
    checklists: (checklistsRes.data ?? []) as ChecklistRow[],
    infoFieldTypes: (infoFieldTypesRes.data ?? []) as InfoFieldTypeRow[],
    logSchemaFields: (logFieldsRes.data ?? []) as LogSchemaFieldRow[],
    logSchemaFieldOptions: (logOptionsRes.data ?? []) as LogSchemaFieldOptionRow[],
    personInfoGroupLinks: (pigLinks.data ?? []) as Array<{
      person_id: number;
      info_group_id: number;
    }>,
    personItemListLinks: (pilLinks.data ?? []) as Array<{
      person_id: number;
      list_id: number;
    }>,
    personLogLinks: (plLinks.data ?? []) as Array<{
      person_id: number;
      log_id: number;
    }>,
    personChecklistLinks: (pclLinks.data ?? []) as Array<{
      person_id: number;
      checklist_id: number;
    }>,
  };
}

// ── Medication reference data ─────────────────────────────────────────────────

export async function getMedications(client: Client): Promise<MedicationRow[]> {
  const { data, error } = await client
    .from("medications")
    .select("*")
    .order("medication_name");
  if (error) throw new Error(`getMedications: ${error.message}`);
  return (data ?? []) as MedicationRow[];
}
