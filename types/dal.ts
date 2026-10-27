/**
 * types/dal.ts
 *
 * Enriched types returned by DAL functions — joined and shaped
 * for what the UI actually needs. Components only import from here,
 * never directly from types/schema.ts.
 */

import type {
  DailyTrackableRow,
  TrackableCategoryRow,
  TrackableToCategoryRow,
  TrackableRangeRow,
  TrackableChoiceOptionRow,
  TrackableAggregateQuestionRow,
  TrackableAggregateQuestionOptionRow,
  SectionRow,
  SectionCardRow,
  Module,
  LastTimeMediaRow,
  LastTimeBooleanRow,
  LastTimeCustomRow,
  TagRow,
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
  PeopleCategoryRow,
  ProviderRow,
  MedicationRow,
  PrescriptionRow,
  PrescriptionRefillRow,
  DailyEntryRow,
  AppointmentRow,
  TaskRow,
  MediaEntryRow,
  ChartCategoryRow,
  ChartDefinitionRow,
  ChartTrackableLinkRow,
  IconRow,
} from "./schema";

// Re-export raw rows that components may need directly
export type {
  IconRow,
  PeopleCategoryRow,
  ChartCategoryRow,
  TrackableCategoryRow,
  TagRow,
  IntentionRow,
  PersonRow,
  ProviderRow,
  MedicationRow,
  PrescriptionRow,
  TaskStatusRow,
  TaskPriorityRow,
};

// ── Trackables (enriched) ─────────────────────────────────────────────────────

/** A choice trackable's option: the bridge row plus the pool value. */
export interface ChoiceOptionDetail extends TrackableChoiceOptionRow {
  value: string;
}

/** An aggregate question's answer: the bridge row plus the pool label/value. */
interface AggregateOptionDetail extends TrackableAggregateQuestionOptionRow {
  value: number;
  label: string;
}

export interface AggregateQuestionDetail extends TrackableAggregateQuestionRow {
  options: AggregateOptionDetail[];   // by sort_order
}

/** A trackable with its type-specific settings. */
export interface TrackableDetail extends DailyTrackableRow {
  /** numeric / combo only. */
  range:          TrackableRangeRow | null;
  /** choice only; by sort_order, inactive included. */
  choice_options: ChoiceOptionDetail[];
  /** aggregate only; by sort_order, inactive included. */
  questions:      AggregateQuestionDetail[];
  /** prescription only: the linked prescription's id, or null if unset. */
  prescription_id: number | null;
}

/** Everything entered on one day, keyed by trackable id. A key that is
 *  missing = nothing entered. */
export interface DayValues {
  boolean:   number[];                       // trackable ids marked yes (boolean and prescription)
  numeric:   Record<number, number>;
  combo:     Record<number, number | null>;  // key present = yes; value optional
  time:      Record<number, string>;         // "YYYY-MM-DDTHH:MM"
  text:      Record<number, string>;         // short_text and long_text
  icon:      Record<number, number>;         // icon id
  tags:      Record<number, number[]>;       // tag ids
  choice:    Record<number, number>;         // pool option id
  aggregate: Record<number, number>;         // question id → pool option id
}

/** What drawing trackable categories needs (the daily page has it all in
 *  ReferenceData; Home and Quick add load just this). */
export interface TrackableRefs {
  trackables:    TrackableDetail[];
  /** Named like ReferenceData's, so ReferenceData can be passed as is. */
  trackableLinks:      TrackableToCategoryRow[];
  trackableCategories: TrackableCategoryRow[];
  icons:         IconRow[];
  tags:          TagRow[];
  prescriptions: PrescriptionDetail[];
}

// ── Placement (enriched) ──────────────────────────────────────────────────────

/** One thing in a card: a trackable category or a component. `placement_id`
 *  is the row in trackable_category_cards / component_cards. */
export type CardItem =
  | { kind: "category"; placement_id: number; sort_order: number; category_id: number }
  | { kind: "module";   placement_id: number; sort_order: number; module: Module };

export interface CardDetail extends SectionCardRow {
  items: CardItem[];   // by sort_order
}

export interface SectionDetail extends SectionRow {
  cards: CardDetail[]; // by sort_order
}

// ── Reference data bundle ─────────────────────────────────────────────────────

export interface ReferenceData {
  icons: IconRow[];
  trackableCategories: TrackableCategoryRow[];
  /** Which categories each trackable is in, with its order there. */
  trackableLinks: TrackableToCategoryRow[];
  trackables: TrackableDetail[];
  tags: TagRow[];
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
  peopleCategories: PeopleCategoryRow[];
  /** Every prescription (prescription trackables show theirs). */
  prescriptions: PrescriptionDetail[];
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
  values: DayValues;
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

// ── Chart definitions (enriched) ──────────────────────────────────────────────

export interface ChartTrackableLinkDetail extends ChartTrackableLinkRow {
  trackable: TrackableDetail;
}

export interface ChartDefinitionDetail extends ChartDefinitionRow {
  links: ChartTrackableLinkDetail[];
  category: ChartCategoryRow | null;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/** One data point for a trend/scatter chart: date + values keyed by trackable_id. */
export interface TrackingDataPoint {
  date: string;
  values: Record<number, number>; // trackable_id → value (yes = 1)
}

// ── Last Time Tracker (enriched) ─────────────────────────────────────────────

export type LastTimeCategory = "media" | "boolean" | "custom";

export interface LastTimeEntry {
  id: number; // source row id
  category: LastTimeCategory;
  icon_id: number | null;
  label: string; // derived or custom label
  last_date: string | null; // ISO date, null = never
  days_ago: number | null; // null = never logged
  sort_order?: number;
  is_active: boolean;
  // Only set for 'custom' items (enables quick "log today" update)
  custom_id?: number;
}

/** Every Last Time item, by kind, for the settings list. */
export interface LastTimeSettingsItems {
  media:   LastTimeMediaRow[];
  boolean: LastTimeBooleanRow[];
  custom:  LastTimeCustomRow[];
}

// ── Inserts / Updates ─────────────────────────────────────────────────────────

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

export {
  type LastTimeBooleanRow,
  type LastTimeMediaRow,
  type LastTimeCustomRow,
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
