/**
 * types/dal.ts
 *
 * Enriched types returned by DAL functions — joined and shaped
 * for what the UI actually needs. Components only import from here,
 * never directly from types/schema.ts.
 */

import type {
  DailyTrackableRow,
  DailyNumericEntryRow,
  TagRow,
  SymptomCategoryRow,
  SymptomTypeRow,
  EssQuestionTypeRow,
  EssAnswerTypeRow,
  TimingOptionRow,
  TimingCategoryRow,
  PreBedConsumptionTypeRow,
  SleepEventTypeRow,
  AppointmentTypeRow,
  ProviderTypeRow,
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
  ProviderRow,
  MedicationRow,
  PrescriptionRow,
  PrescriptionRefillRow,
  DailyEntryRow,
  SleepEntryRow,
  NapRow,
  WakeEventRow,
  SleepTimingEntryRow,
  CrashRow,
  AnxietyEntryRow,
  DailySymptomEntryRow,
  EssEntryRow,
  EssQuestionResponseRow,
  AppointmentRow,
  TaskRow,
  MediaEntryRow,
  WeeklyEntryRow,
  WeeklyIntentionRow,
  ChartCategoryRow,
  ChartDefinitionRow,
  ChartTrackableLinkRow,
  IconRow,
  CalendarTokenRow,
} from "./schema";

// Re-export raw rows that components may need directly
export type {
  IconRow,
  CalendarTokenRow,
  ChartCategoryRow,
  DailyTrackableRow,
  DailyNumericEntryRow,
  TagRow,
  EssQuestionTypeRow,
  EssAnswerTypeRow,
  TimingOptionRow,
  TimingCategoryRow,
  PreBedConsumptionTypeRow,
  SleepEventTypeRow,
  IntentionRow,
  PersonRow,
  ProviderRow,
  MedicationRow,
  PrescriptionRow,
  TaskStatusRow,
  TaskPriorityRow,
  ChartDefinitionRow,
  ChartTrackableLinkRow,
};

// ── Reference data bundle ─────────────────────────────────────────────────────

export interface ReferenceData {
  icons: IconRow[];
  trackableCategories: import('./schema').TrackableCategoryRow[];
  trackables: DailyTrackableRow[]; // replaces habits
  tags: TagRow[];
  symptomCategories: SymptomCategoryWithTypes[];
  essQuestionTypes: EssQuestionTypeRow[];
  essAnswerTypes: EssAnswerTypeRow[];
  timingOptions: TimingOptionRow[];
  timingCategories: TimingCategoryRow[];
  consumptionTypes: PreBedConsumptionTypeRow[];
  sleepEventTypes: SleepEventTypeRow[];
  appointmentTypes: AppointmentTypeRow[];
  providerTypes: ProviderTypeRow[];
  medicationTimings: MedicationTimingTypeRow[];
  taskStatuses: TaskStatusRow[];
  taskPriorities: TaskPriorityRow[];
  mediaTypes: MediaTypeRow[];
  mediaStatuses: MediaStatusRow[];
  mediaGenres: MediaGenreRow[];
  journalCategories: JournalCategoryWithPrompts[];
  people: PersonRow[];
}

export interface SymptomCategoryWithTypes extends SymptomCategoryRow {
  types: SymptomTypeRow[];
}

export interface JournalCategoryWithPrompts extends JournalCategoryRow {
  prompts: JournalPromptRow[];
}

// ── Prescription (enriched) ───────────────────────────────────────────────────

export interface PrescriptionDetail extends PrescriptionRow {
  medication: MedicationRow;
  timing_type: MedicationTimingTypeRow | null;
  prescriber: ProviderRow | null;
  latest_refill: PrescriptionRefillRow | null;
}

// ── Daily entry (enriched) ────────────────────────────────────────────────────

export interface DailyEntryDetail extends DailyEntryRow {
  intention: IntentionRow | null;
  checked_trackable_ids: number[]; // boolean trackables done today (was habit_ids)
  tag_ids: number[];
  prescription_ids: number[];
  numeric_entries: DailyNumericEntryRow[]; // replaces mood/energy columns
  brain_dump: { id: number; body_md: string | null } | null;
}

// ── Sleep entry (enriched) ────────────────────────────────────────────────────

export interface SleepEntryDetail extends SleepEntryRow {
  nap: NapRow | null;
  wake_events: WakeEventRow | null;
  sleep_event_ids: number[];
  timing_entries: SleepTimingEntryRow[];
  consumption_ids: number[];
}

export interface PriorSleepContext {
  today_pre_bed_activity: string | null;
  timing_entries: SleepTimingEntryRow[];
  consumption_ids: number[];
}

// ── Symptom data (enriched) ───────────────────────────────────────────────────
// symptom_entries is removed; crash/anxiety/symptom_types are fetched directly.

export interface DailySymptomData {
  crash: CrashRow | null;
  anxiety: AnxietyEntryRow | null;
  symptom_entries: DailySymptomEntryRow[]; // direct FK to daily_entries now
}

// ── ESS entry (enriched) ─────────────────────────────────────────────────────

export interface EssEntryDetail extends EssEntryRow {
  responses: EssQuestionResponseRow[];
  total: number;
}

// ── Daily page data bundle ────────────────────────────────────────────────────

export interface DailyPageData {
  entry: DailyEntryDetail;
  sleep: SleepEntryDetail | null;
  priorSleep: PriorSleepContext | null;
  symptoms: DailySymptomData | null;
  ess: EssEntryDetail | null;
  prescriptions: PrescriptionDetail[];
  reference: ReferenceData;
}

// ── Appointment (enriched) ────────────────────────────────────────────────────

export interface AppointmentDetail extends AppointmentRow {
  person: PersonRow;
  provider: ProviderRow | null;
  appointment_type: AppointmentTypeRow | null;
}

// ── Task (enriched) ───────────────────────────────────────────────────────────

export interface TaskDetail extends TaskRow {
  status: TaskStatusRow;
  priority: TaskPriorityRow;
  person: PersonRow | null;
  tag_ids: number[];
}

// ── Media entry (enriched) ────────────────────────────────────────────────────

export interface MediaEntryDetail extends MediaEntryRow {
  media_type: MediaTypeRow;
  current_status: MediaStatusRow | null; // derived from latest media_status_entries row
  latest_status_date: string | null;
  genre_ids: number[];
}

// ── People page data ─────────────────────────────────────────────────────────

export interface InfoFieldTypeWithValue {
  id: number;
  group_id: number;
  field_label: string;
  field_type: string;
  sort_order?: number;
  is_active: boolean;
  value: string | null;
  value_id: number | null;
}

export interface InfoGroupWithFields {
  id: number;
  group_title: string;
  sort_order?: number;
  is_active: boolean;
  fields: InfoFieldTypeWithValue[];
}

export interface ItemListWithEntries {
  id: number;
  list_title: string;
  list_label: string | null;
  sort_order?: number;
  is_active: boolean;
  entries: import("./schema").ItemListEntryRow[];
}

export interface LogSchemaFieldWithOptions {
  id: number;
  log_id: number;
  field_label: string;
  field_key: string;
  field_type: string;
  sort_order?: number;
  is_active: boolean;
  options: import("./schema").LogSchemaFieldOptionRow[];
}

export interface LogEntryWithValues {
  id: number;
  log_id: number;
  entry_date: string;
  created_at: string;
  values: Record<number, string>;
}

export interface LogWithSchemaAndEntries {
  id: number;
  log_title: string;
  sort_order?: number;
  is_active: boolean;
  fields: LogSchemaFieldWithOptions[];
  entries: LogEntryWithValues[];
}

export interface ChecklistWithItems {
  id: number;
  checklist_title: string;
  checklist_label: string | null;
  sort_order?: number;
  is_active: boolean;
  items: import("./schema").ChecklistItemRow[];
}

export interface PersonPageData {
  person: import("./schema").PersonRow;
  diagnoses: import("./schema").DiagnosisRow[];
  infoGroups: InfoGroupWithFields[];
  itemLists: ItemListWithEntries[];
  logs: LogWithSchemaAndEntries[];
  checklists: ChecklistWithItems[];
  prescriptions: PrescriptionDetail[];
}

// ── People settings structure ─────────────────────────────────────────────────

/** Represents a person's linked structure IDs, used by PeopleStructureSettings. */
export interface PersonLinks {
  person: import("./schema").PersonRow;
  infoGroupIds: number[];
  listIds: number[];
  logIds: number[];
  checklistIds: number[];
}

// ── Weekly entry (enriched) ───────────────────────────────────────────────────

export interface WeeklyEntryDetail extends WeeklyEntryRow {
  intentions: WeeklyIntentionRow[];
}

// ── Week strip (hub page) ─────────────────────────────────────────────────────

export interface WeekDayData {
  date: string;
  entry: DailyEntryRow | null;
  checked_trackable_ids: number[]; // was habit_ids
}

// ── Chart definitions (enriched) ──────────────────────────────────────────────

export interface ChartTrackableLinkDetail extends ChartTrackableLinkRow {
  trackable: DailyTrackableRow;
}

export interface ChartDefinitionDetail extends ChartDefinitionRow {
  links: ChartTrackableLinkDetail[];
  category: ChartCategoryRow | null;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/** One data point for a trend/scatter chart: date + values keyed by trackable_id. */
export interface TrackingDataPoint {
  date: string;
  values: Record<number, number>; // trackable_id → metric_value
}

// ── Last Time Tracker (enriched) ─────────────────────────────────────────────

export type LastTimeCategory = "media" | "boolean" | "custom";

export interface LastTimeEntry {
  id: number; // source row id
  category: LastTimeCategory;
  emoji: string | null;
  icon_id: number | null;
  label: string; // derived or custom label
  last_date: string | null; // ISO date, null = never
  days_ago: number | null; // null = never logged
  sort_order?: number;
  is_active: boolean;
  // Only set for 'custom' items (enables quick "log today" update)
  custom_id?: number;
}

// ── Inserts / Updates ─────────────────────────────────────────────────────────

export type DailyEntryInsert = Omit<
  DailyEntryRow,
  "id" | "created_at" | "updated_at"
>;
export type DailyEntryUpdate = Partial<DailyEntryInsert>;

export type SleepEntryInsert = Omit<
  SleepEntryRow,
  "id" | "created_at" | "updated_at"
>;
export type SleepEntryUpdate = Partial<SleepEntryInsert>;

export type CrashInsert = Omit<CrashRow, "id">;
export type CrashUpdate = Partial<Pick<CrashRow, "timing" | "severity">>;

export type AnxietyEntryInsert = Omit<AnxietyEntryRow, "id">;
export type AnxietyEntryUpdate = Partial<
  Pick<AnxietyEntryRow, "severity" | "detail">
>;

export type PrescriptionInsert = Omit<
  PrescriptionRow,
  "id" | "created_at" | "updated_at"
>;
export type PrescriptionUpdate = Partial<PrescriptionInsert>;

export type AppointmentInsert = Omit<
  AppointmentRow,
  "id" | "created_at" | "updated_at"
>;
export type AppointmentUpdate = Partial<AppointmentInsert>;

export type TaskInsert = Omit<TaskRow, "id" | "created_at" | "updated_at">;
export type TaskUpdate = Partial<TaskInsert>;

export type MediaEntryInsert = Omit<
  MediaEntryRow,
  "id" | "created_at" | "updated_at"
>;
export type MediaEntryUpdate = Partial<MediaEntryInsert>;

export type BrainDumpInsert = {
  entry_id?: number | null;
  dump_date: string;
  body_md?: string;
};
export type BrainDumpUpdate = Partial<BrainDumpInsert>;

export {
  type LastTimeBooleanRow,
  type LastTimeMediaRow,
  type LastTimeCustomRow,
  type LastTimeLatestRow,
} from "./schema";

// ── Weekly journal ─────────────────────────────────────────────────────────────

export interface WeeklyJournalCategoryWithPrompts {
  id:            number;
  category_name: string;
  sort_order?:   number;
  is_active:     boolean;
  prompts:       import('./schema').WeeklyJournalPromptRow[];
}

export interface WeeklyJournalResponseDetail {
  id:            number;
  prompt_id:     number;
  prompt_text:   string;
  category_id:   number;
  category_name: string;
  response_text: string | null;
}
