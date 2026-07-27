/**
 * types/schema.ts
 *
 * One interface per database table, named <TableName>Row.
 * These are raw DB row shapes — not enriched/joined types.
 * Enriched types used by the DAL live in types/dal.ts.
 */

// ── People ────────────────────────────────────────────────────────────────────

export interface PersonRow {
  id: number;
  person_name: string;
  birth_date: string | null;
  is_self: boolean;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
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

// ── Daily trackables ──────────────────────────────────────────────────────────
// Replaces the former `habits` table.
// track_type: 'boolean' = habit-style done/not-done
//             'numeric' = severity/quality slider (0-10)
//             'aggregate' = computed from another source (e.g. ESS survey total)

export type TrackType = "boolean" | "numeric" | "aggregate";

export interface TrackableCategoryRow {
  id:            number;
  category_name: string;
  sort_order?:   number;
  is_active:     boolean;
}

export interface DailyTrackableRow {
  id:          number;
  track_type:  TrackType;
  name:        string;
  emoji:       string | null;
  color_hex:   string | null;
  category_id: number | null;
  sort_order?: number;
  is_active:   boolean;
}

export interface DailyNumericEntryRow {
  id: number;
  entry_id: number;
  trackable_id: number;
  metric_value: number;
}

// ── Reference / Type tables ───────────────────────────────────────────────────

export interface TagRow {
  id: number;
  tag_value: string;
  is_active: boolean;
  created_at: string;
}

export interface SymptomCategoryRow {
  id: number;
  category_name: string;
  sort_order?: number;
  is_active: boolean;
}

export interface SymptomTypeRow {
  id: number;
  category_id: number;
  symptom_name: string;
  sort_order?: number;
  is_active: boolean;
}

export interface EssQuestionTypeRow {
  id: number;
  question_label: string;
  sort_order?: number;
  is_active: boolean;
  trackable_id: number | null; // FK → daily_trackables (the aggregate trackable)
}

export interface EssAnswerTypeRow {
  id: number;
  answer_label: string;
  answer_value: number;
  sort_order?: number;
  is_active: boolean;
}

export interface TimingOptionRow {
  id: number;
  option_name: string;
  sort_order?: number;
  is_active: boolean;
}

export interface TimingCategoryRow {
  id: number;
  category_name: string;
  sort_order?: number;
  is_active: boolean;
}

export interface PreBedConsumptionTypeRow {
  id: number;
  type_name: string;
  sort_order?: number;
  is_active: boolean;
}

export interface SleepEventTypeRow {
  id: number;
  type_name: string;
  sort_order?: number;
  is_active: boolean;
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

export interface TimelineEventTypeRow {
  id: number;
  type_name: string;
  color_hex: string | null;
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
  icon: string | null;
  word: string | null;
  daily_emoji: string | null;
  intention_id: number | null;
  summary: string | null;
  body_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitEntryRow {
  id: number;
  entry_id: number;
  trackable_id: number; // FK → daily_trackables (track_type = 'boolean')
}

export interface TagEntryRow {
  id: number;
  entry_id: number;
  tag_id: number;
}

export interface PrescriptionEntryRow {
  id: number;
  entry_id: number;
  prescription_id: number;
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

// ── Sleep ─────────────────────────────────────────────────────────────────────

export interface SleepEntryRow {
  id: number;
  entry_id: number;
  sleep_quality: number | null;
  hours_slept: number | null;
  bedtime: string | null;
  sleep_latency_min: number | null;
  wake_time: string | null;
  sleep_inertia_min: number | null;
  osa_event_count: number | null;
  sleep_notes: string | null;
  today_pre_bed_activity: string | null;
  created_at: string;
  updated_at: string;
}

export interface NapRow {
  id: number;
  sleep_entry_id: number;
  nap_count: number;
  duration_min: number | null;
  was_refreshing: boolean;
}

export interface WakeEventRow {
  id: number;
  sleep_entry_id: number;
  event_count: number;
  duration_min: number;
  detail: string | null;
}

export interface SleepEventRow {
  id: number;
  sleep_entry_id: number;
  event_type_id: number;
}

export interface SleepTimingEntryRow {
  id: number;
  sleep_entry_id: number;
  timing_category_id: number;
  timing_option_id: number;
}

export interface SleepConsumptionEntryRow {
  id: number;
  sleep_entry_id: number;
  consumption_type_id: number;
}

// ── ESS ───────────────────────────────────────────────────────────────────────

export interface EssEntryRow {
  id: number;
  entry_id: number;
  created_at: string;
  updated_at: string;
}

export interface EssQuestionResponseRow {
  id: number;
  ess_entry_id: number;
  question_type_id: number;
  answer_type_id: number;
}

// ── Symptoms ──────────────────────────────────────────────────────────────────
// symptom_entries table is removed. Crash and anxiety remain on entry_id directly.

export interface CrashRow {
  id: number;
  entry_id: number;
  timing: string | null;
  severity: number | null;
}

export interface AnxietyEntryRow {
  id: number;
  entry_id: number;
  severity: number | null;
  detail: string | null;
}

export interface DailySymptomEntryRow {
  id: number;
  entry_id: number; // FK → daily_entries (direct, no longer via symptom_entries)
  symptom_type_id: number;
  severity: number | null;
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
  emoji: string | null;
  sort_order?: number;
  is_active: boolean;
}

export interface LastTimeBooleanRow {
  id: number;
  trackable_id: number;
  emoji: string | null;
  sort_order?: number;
  is_active: boolean;
}

export interface LastTimeCustomRow {
  id: number;
  custom_value: string;
  emoji: string | null;
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
  scheduled_date: string | null;
  person_id: number | null;
  body_md: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTagEntryRow {
  id: number;
  task_id: number;
  tag_id: number;
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export interface TimelineEventRow {
  id: number;
  entry_id: number;
  event_type_id: number | null;
  event_title: string;
  started_at: string;
  ended_at: string | null;
  group_name: string | null;
  description: string | null;
  created_at: string;
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

// ── Last time ─────────────────────────────────────────────────────────────────

export interface LastTimeActivityRow {
  id: number;
  activity_name: string;
  emoji: string | null;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
}

export interface LastTimeLogRow {
  id: number;
  activity_id: number;
  logged_date: string;
  notes: string | null;
  created_at: string;
}

export interface LastTimeLatestRow {
  id: number;
  activity_name: string;
  emoji: string | null;
  sort_order?: number;
  is_active: boolean;
  last_logged_date: string | null;
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
