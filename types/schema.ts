/**
 * types/schema.ts
 *
 * One interface per database table, named <TableName>Row.
 * These are raw DB row shapes — not enriched/joined types.
 * Enriched types used by the DAL live in types/dal.ts.
 */

// ── People ────────────────────────────────────────────────────────────────────

// ── People ────────────────────────────────────────────────────────────────────

export interface PeopleCategoryRow {
  id:            number;
  category_name: string;
  is_assignable: boolean;   // true = people here can be assigned to tasks/appts/etc.
  sort_order?:   number;
  is_active:     boolean;
  created_at:    string;
}

export interface PersonRow {
  id:          number;
  person_name: string;
  birth_date:  string | null;
  is_self:     boolean;
  category_id: number | null;
  sort_order?: number;
  is_active:   boolean;
  created_at:  string;
}

export interface DiagnosisRow {
  id: number;
  person_id: number;
  diagnosis_name: string;
  diagnosed_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Trackables ────────────────────────────────────────────────────────────────
// What is tracked each day is data: a trackable's type decides how it is
// entered, which entries table holds its values, and how it charts.

/** track_type_enum. Each type maps to an input (see TrackableInput). */
export const TRACK_TYPES = [
  "boolean", "numeric", "combo", "time", "choice",
  "short_text", "long_text", "icon", "tags", "aggregate", "prescription",
] as const;
export type TrackType = typeof TRACK_TYPES[number];

export interface TrackableCategoryRow {
  id:            number;
  category_name: string;
  is_active:     boolean;
}

/** trackable_to_category: a trackable's place in a category (many-to-many). */
export interface TrackableToCategoryRow {
  id:           number;
  trackable_id: number;
  category_id:  number;
  sort_order:   number;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

export interface IconRow {
  id:         number;
  name:       string;
  tags:       string | null;  // space-separated search keywords
  svg_data:   string;
  sort_order: number;
  is_active:  boolean;
  created_at: string;
}

export interface DailyTrackableRow {
  id:                  number;
  track_type:          TrackType;
  name:                string;
  icon_id:             number | null;
  color_hex:           string | null;
  /** One level only (database-checked). */
  parent_trackable_id: number | null;
  is_active:           boolean;
}

/** Slider range for numeric and combo trackables (1:1). */
export interface TrackableRangeRow {
  id:           number;
  trackable_id: number;
  range_min:    number;
  range_max:    number;
  range_step:   number;
}

/** Choice option pool: the values only. */
export interface TrackableOptionRow {
  id:    number;
  value: string;
}

/** Which pool options a choice trackable offers, in order. */
export interface TrackableChoiceOptionRow {
  id:           number;
  trackable_id: number;
  option_id:    number;
  sort_order:   number;
  is_active:    boolean;
}

export interface TrackableAggregateQuestionRow {
  id:           number;
  trackable_id: number;
  question:     string;
  sort_order:   number;
  is_active:    boolean;
}

/** Aggregate answer pool (label + value unique together). */
export interface TrackableAggregateOptionRow {
  id:    number;
  value: number;
  label: string;
}

/** Which answers a question offers, in order. */
export interface TrackableAggregateQuestionOptionRow {
  id:          number;
  question_id: number;
  option_id:   number;
  sort_order:  number;
  is_active:   boolean;
}

/** Which prescription a `prescription` trackable is (taken = a boolean entry). */
export interface TrackablePrescriptionRow {
  id:              number;
  trackable_id:    number;
  prescription_id: number;
}

// ── Trackable entries (one table per kind of value) ───────────────────────────

/** A row = "yes" that day. */
export interface TrackableBooleanEntryRow {
  id:           number;
  entry_id:     number;
  trackable_id: number;
}

export interface TrackableNumericEntryRow {
  id:           number;
  entry_id:     number;
  trackable_id: number;
  value:        number;
}

/** A row = "yes" that day; value is optional (e.g. severity). */
export interface TrackableComboEntryRow {
  id:           number;
  entry_id:     number;
  trackable_id: number;
  value:        number | null;
}

/** A local timestamp (no time zone), "YYYY-MM-DDTHH:MM:SS". */
export interface TrackableTimeEntryRow {
  id:           number;
  entry_id:     number;
  trackable_id: number;
  value:        string;
}

/** short_text and long_text. */
export interface TrackableTextEntryRow {
  id:           number;
  entry_id:     number;
  trackable_id: number;
  value:        string;
}

export interface TrackableIconEntryRow {
  id:           number;
  entry_id:     number;
  trackable_id: number;
  icon_id:      number;
}

export interface TrackableTagEntryRow {
  id:           number;
  entry_id:     number;
  trackable_id: number;
  tag_id:       number;
}

export interface TrackableChoiceEntryRow {
  id:           number;
  entry_id:     number;
  trackable_id: number;
  option_id:    number;
}

export interface TrackableAggregateEntryRow {
  id:          number;
  entry_id:    number;
  question_id: number;
  option_id:   number;
}

// ── Placement: area → section → card → categories / components ───────────────

export const AREAS = ["HOME", "QUICKADD", "DAILY"] as const;
export type Area = typeof AREAS[number];

/** module_enum: components that can be placed in a card. */
export const MODULES = [
  "TASK_LIST", "TASK_QUICKADD", "TASK_ADD",
  "APPOINTMENT_QUICKLIST", "APPOINTMENT_ADD", "APPOINTMENT_LIST",
  "LAST_TIME",
  "NOW_PLAYING_LIST", "MEDIA_ADD", "MEDIA_LIST",
  "BRAIN_DUMP_ADD", "BRAIN_DUMP_LIST",
  "DAILY_JOURNAL", "WEEKLY_JOURNAL",
  "QUICK_LOG",
  "PRESCRIPTION_LIST", "PRESCRIPTION_ADD",
  "PEOPLE_LIST",
  "ANALYTICS_LIST",
] as const;
export type Module = typeof MODULES[number];

export interface SectionRow {
  id:         number;
  name:       string;
  area:       Area;
  sort_order: number;
  is_active:  boolean;
}

export interface SectionCardRow {
  id:         number;
  section_id: number;
  /** null = no card title (only category labels show). */
  title:      string | null;
  sort_order: number;
  is_active:  boolean;
}

export interface TrackableCategoryCardRow {
  id:                    number;
  trackable_category_id: number;
  card_id:               number;
  sort_order:            number;
}

export interface ComponentCardRow {
  id:         number;
  module:     Module;
  card_id:    number;
  sort_order: number;
}

// ── Reference / Type tables ───────────────────────────────────────────────────

export interface TagRow {
  id: number;
  tag_value: string;
  is_active: boolean;
  created_at: string;
}

export interface ProviderTypeRow {
  id: number;
  type_name: string;
  sort_order?: number;
  is_active: boolean;
}

export interface AppointmentTypeRow {
  id: number;
  type_name: string;
  sort_order?: number;
  is_active: boolean;
}

export interface MedicationTimingTypeRow {
  id: number;
  timing_name: string;
  dose_interval_days: number | null;
  sort_order?: number;
  is_active: boolean;
}

export interface TaskStatusRow {
  id: number;
  status_name: string;
  is_terminal: boolean;
  sort_order?: number;
  is_active: boolean;
}

export interface TaskPriorityRow {
  id: number;
  priority_name: string;
  sort_order?: number;
  is_active: boolean;
}

export interface MediaTypeRow {
  id: number;
  type_name: string;
  sort_order?: number;
  is_active: boolean;
}

export type MediaStatusType =
  | "planned"
  | "in_progress"
  | "completed"
  | "abandoned";

export interface MediaStatusRow {
  id: number;
  status_name: string;
  status_type: MediaStatusType;
  sort_order?: number;
  is_active: boolean;
}

export interface MediaStatusTypeLinkRow {
  id: number;
  status_id: number;
  media_type_id: number;
}

export interface MediaStatusEntryRow {
  id: number;
  media_entry_id: number;
  status_id: number;
  status_date: string;
  created_at: string;
}

export interface MediaGenreRow {
  id: number;
  genre_name: string;
  is_active: boolean;
}

export interface IntentionRow {
  id: number;
  value: string;
  is_active: boolean;
  created_at: string;
}

export interface JournalCategoryRow {
  id: number;
  category_name: string;
  sort_order?: number;
  is_active: boolean;
}

export interface JournalPromptRow {
  id: number;
  category_id: number;
  prompt_text: string;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
}

// ── Providers & Pharmacy ──────────────────────────────────────────────────────

export interface ProviderRow {
  id: number;
  provider_type_id: number;
  provider_name: string | null;
  practice_name: string | null;
  phone: string | null;
  address: string | null;
  portal_url: string | null;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PharmacyRow {
  id: number;
  pharmacy_name: string | null;
  phone: string | null;
  address: string | null;
  portal_url: string | null;
  updated_at: string;
}

// ── Medications & Prescriptions ───────────────────────────────────────────────

export interface MedicationRow {
  id: number;
  medication_name: string;
  generic_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PrescriptionRow {
  id: number;
  person_id: number;
  medication_id: number;
  alias: string | null;
  dose: string | null;
  timing_type_id: number | null;
  purpose: string | null;
  prescriber_id: number | null;
  start_date: string | null;
  discontinued_date: string | null;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionRefillRow {
  id: number;
  prescription_id: number;
  fill_date: string;
  days_supply: number | null;
  refill_due_date: string | null;
  notes: string | null;
  created_at: string;
}

// ── Daily entries ─────────────────────────────────────────────────────────────

export interface DailyEntryRow {
  id: number;
  entry_date: string;
  intention_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface BrainDumpRow {
  id: number;
  entry_id: number | null;
  dump_date: string;
  body_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalPromptResponseRow {
  id: number;
  prompt_id: number;
  entry_id: number | null;
  response_text: string | null;
  created_at: string;
  updated_at: string;
}

// ── Chart definitions ─────────────────────────────────────────────────────────

export type ChartType =
  | "scatter"
  | "line"
  | "heatmap"
  | "timeline"
  | "bar"
  | "chain";
export type MetricRole = "x_axis" | "y_axis" | "series";

export interface ChartDefinitionRow {
  id: number;
  title: string;
  chart_type: ChartType;
  sort_order?: number;
  is_active: boolean;
  category_id: number | null;
}

export interface ChartTrackableLinkRow {
  id: number;
  chart_id: number;
  trackable_id: number;
  metric_role: MetricRole;
  sort_order?: number;
}

export interface ChartCategoryRow {
  id: number;
  name: string;
  sort_order?: number;
  is_active: boolean;
}

// ── Last Time Tracker ─────────────────────────────────────────────────────────

export interface LastTimeMediaRow {
  id: number;
  type_id: number | null; // FK → media_types   (optional filter)
  genre_id: number | null; // FK → media_genres  (optional filter)
  status_id: number | null; // FK → media_statuses (optional filter)
  label: string; // required; can't auto-derive from multi-filter
  icon_id: number | null;
  sort_order?: number;
  is_active: boolean;
}

export interface LastTimeBooleanRow {
  id: number;
  trackable_id: number;
  icon_id: number | null;
  sort_order?: number;
  is_active: boolean;
}

export interface LastTimeCustomRow {
  id: number;
  custom_value: string;
  icon_id: number | null;
  sort_order?: number;
  is_active: boolean;
  last_date: string | null;
}

// ── Weekly journal ────────────────────────────────────────────────────────────

export interface WeeklyJournalCategoryRow {
  id:            number;
  category_name: string;
  sort_order?:   number;
  is_active:     boolean;
}

export interface WeeklyJournalPromptRow {
  id:          number;
  category_id: number;
  prompt_text: string;
  sort_order?: number;
  is_active:   boolean;
  created_at:  string;
}

export interface WeeklyJournalPromptResponseRow {
  id:              number;
  weekly_entry_id: number;
  prompt_id:       number;
  response_text:   string | null;
  created_at:      string;
  updated_at:      string;
}

// ── Weekly entries ────────────────────────────────────────────────────────────

export interface WeeklyEntryRow {
  id: number;
  week_start_date: string;
  week_end_date: string;
  reflection: string | null;
  wins: string | null;
  challenges: string | null;
  next_week_focus: string | null;
  body_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyIntentionRow {
  id: number;
  weekly_entry_id: number;
  intention_text: string;
  sort_order?: number;
  created_at: string;
}

// ── Appointments ──────────────────────────────────────────────────────────────

export interface AppointmentRow {
  id: number;
  appointment_date: string;
  appointment_time: string | null;
  person_id: number;
  provider_id: number | null;
  appointment_type_id: number | null;
  location: string | null;
  questions: string | null;
  notes: string | null;
  followup_for_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionChangeRow {
  id: number;
  appointment_id: number | null;  // nullable — changes can exist without an appointment
  prescription_id: number;
  field_changed: string;
  previous_value: string | null;
  new_value: string | null;
  change_notes: string | null;
  created_at: string;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface TaskRow {
  id: number;
  title: string;
  status_id: number;
  priority_id: number;
  due_date: string | null;
  due_time?: string | null;       // HH:MM:SS local time, optional alongside due_date
  person_id: number | null;
  body_md: string | null;
  completed_at: string | null;
  // Reminder (all optional — default null in DB)
  reminder_at?:          string | null;  // ISO timestamptz
  snoozed_until?:        string | null;  // ISO timestamptz; null = not snoozed
  reminder_last_sent?:   string | null;  // ISO timestamptz; stamped by Edge Function
  // Recurrence (null frequency = one-off)
  recurrence_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  recurrence_interval?:  number | null;  // default 1
  recurrence_days?:      string | null;  // e.g. 'MO,WE,FR' (weekly only)
  recurrence_end_date?:  string | null;  // ISO date
  created_at: string;
  updated_at: string;
}

export interface CalendarTokenRow {
  id:         number;
  token:      string;
  created_at: string;
}

export interface TaskTagEntryRow {
  id: number;
  task_id: number;
  tag_id: number;
}

// ── Media ─────────────────────────────────────────────────────────────────────

export interface MediaEntryRow {
  id: number;
  media_type_id: number;
  title: string;
  rating: number | null;
  platform: string | null;
  creator: string | null;
  notes: string | null;
  review: string | null;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface MediaGenreEntryRow {
  id: number;
  media_entry_id: number;
  genre_id: number;
}

export interface MediaNoteRow {
  id: number;
  media_entry_id: number;
  note_date: string;
  body_md: string;
  created_at: string;
  updated_at: string;
}

// ── Generic structured content ────────────────────────────────────────────────

export interface InfoGroupRow {
  id: number;
  group_title: string;
  sort_order?: number;
  is_active: boolean;
}

export interface InfoFieldTypeRow {
  id: number;
  group_id: number;
  field_label: string;
  field_type: string;
  sort_order?: number;
  is_active: boolean;
}

export interface InfoFieldValueRow {
  id: number;
  field_type_id: number;
  field_value: string | null;
  updated_at: string;
}

export interface ItemListRow {
  id: number;
  list_title: string;
  list_label: string | null;
  sort_order?: number;
  is_active: boolean;
}

export interface ItemListEntryRow {
  id: number;
  list_id: number;
  entry_text: string;
  entry_date: string | null;
  sort_order?: number;
  created_at: string;
}

export interface LogSchemaRow {
  id: number;
  log_title: string;
  sort_order?: number;
  is_active: boolean;
}

export interface LogSchemaFieldRow {
  id: number;
  log_id: number;
  field_label: string;
  field_key: string;
  field_type: string;
  sort_order?: number;
  is_active: boolean;
}

export interface LogSchemaFieldOptionRow {
  id: number;
  field_id: number;
  option_value: string;
  sort_order?: number;
  is_active: boolean;
}

export interface LogEntryRow {
  id: number;
  log_id: number;
  entry_date: string;
  created_at: string;
}

export interface LogEntryValueRow {
  id: number;
  log_entry_id: number;
  field_id: number;
  field_value: string | null;
}

export interface ChecklistRow {
  id: number;
  checklist_title: string;
  checklist_label: string | null;
  sort_order?: number;
  is_active: boolean;
}

export interface ChecklistItemRow {
  id:           number;
  checklist_id: number;
  person_id:    number;
  item_text:    string;
  is_checked:   boolean;
  sort_order?:  number;
  created_at:   string;
}
