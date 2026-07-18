/**
 * types/dal.ts
 *
 * Enriched types returned by DAL functions — joined and shaped
 * for what the UI actually needs. Components only import from here,
 * never directly from types/schema.ts.
 */

import type {
  HabitRow,
  TagRow,
  SymptomTypeRow,
  SymptomCategoryRow,
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
  SleepEventRow,
  SleepTimingEntryRow,
  SleepConsumptionEntryRow,
  SymptomEntryRow,
  CrashRow,
  AnxietyEntryRow,
  DailySymptomEntryRow,
  EssEntryRow,
  EssQuestionResponseRow,
  AppointmentRow,
  TaskRow,
  LastTimeLatestRow,
  MediaEntryRow,
  WeeklyEntryRow,
  WeeklyIntentionRow,
} from './schema';

// Re-export raw rows that components may need directly
export type {
  HabitRow,
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
  LastTimeLatestRow,
};

// ── Reference data bundle ─────────────────────────────────────────────────────
// Passed to components that need to render type lists (chips, dropdowns, etc.)

export interface ReferenceData {
  habits:              HabitRow[];
  tags:                TagRow[];
  symptomCategories:   SymptomCategoryWithTypes[];
  essQuestionTypes:    EssQuestionTypeRow[];
  essAnswerTypes:      EssAnswerTypeRow[];
  timingOptions:       TimingOptionRow[];
  timingCategories:    TimingCategoryRow[];
  consumptionTypes:    PreBedConsumptionTypeRow[];
  sleepEventTypes:     SleepEventTypeRow[];
  appointmentTypes:    AppointmentTypeRow[];
  providerTypes:       ProviderTypeRow[];
  medicationTimings:   MedicationTimingTypeRow[];
  taskStatuses:        TaskStatusRow[];
  taskPriorities:      TaskPriorityRow[];
  mediaTypes:          MediaTypeRow[];
  mediaStatuses:       MediaStatusRow[];
  mediaGenres:         MediaGenreRow[];
  journalCategories:   JournalCategoryWithPrompts[];
  people:              PersonRow[];
}

export interface SymptomCategoryWithTypes extends SymptomCategoryRow {
  types: SymptomTypeRow[];
}

export interface JournalCategoryWithPrompts extends JournalCategoryRow {
  prompts: JournalPromptRow[];
}

// ── Prescription (enriched) ───────────────────────────────────────────────────

export interface PrescriptionDetail extends PrescriptionRow {
  medication:   MedicationRow;
  timing_type:  MedicationTimingTypeRow | null;
  prescriber:   ProviderRow | null;
  latest_refill: PrescriptionRefillRow | null;
}

// ── Daily entry (enriched) ────────────────────────────────────────────────────

export interface DailyEntryDetail extends DailyEntryRow {
  intention:     IntentionRow | null;
  habit_ids:     number[];               // which habits were completed
  tag_ids:       number[];               // which tags are applied
  prescription_ids: number[];            // which prescriptions were taken
  brain_dump:    { id: number; body_md: string | null } | null;
}

// ── Sleep entry (enriched) ────────────────────────────────────────────────────

export interface SleepEntryDetail extends SleepEntryRow {
  nap:               NapRow | null;
  wake_events:       WakeEventRow | null;
  sleep_event_ids:   number[];           // which sleep_event_type_ids occurred
  timing_entries:    SleepTimingEntryRow[];
  consumption_ids:   number[];           // which consumption_type_ids
}

/** Previous day's sleep context — shown on today's page as "last night" */
export interface PriorSleepContext {
  today_pre_bed_activity: string | null;
  timing_entries:         SleepTimingEntryRow[];
  consumption_ids:        number[];
}

// ── Symptom entry (enriched) ──────────────────────────────────────────────────

export interface SymptomEntryDetail extends SymptomEntryRow {
  crash:         CrashRow | null;
  anxiety:       AnxietyEntryRow | null;
  symptom_entries: DailySymptomEntryRow[];  // which symptoms + optional severity
}

// ── ESS entry (enriched) ─────────────────────────────────────────────────────

export interface EssEntryDetail extends EssEntryRow {
  responses: EssQuestionResponseRow[];
  total:     number;
}

// ── Daily page data bundle ────────────────────────────────────────────────────
// Everything a daily page needs, fetched server-side and passed as props.

export interface DailyPageData {
  entry:           DailyEntryDetail;
  sleep:           SleepEntryDetail | null;
  priorSleep:      PriorSleepContext | null;
  symptoms:        SymptomEntryDetail | null;
  ess:             EssEntryDetail | null;
  prescriptions:   PrescriptionDetail[];  // active prescriptions for self
  reference:       ReferenceData;
}

// ── Appointment (enriched) ────────────────────────────────────────────────────

export interface AppointmentDetail extends AppointmentRow {
  person:            PersonRow;
  provider:          ProviderRow | null;
  appointment_type:  AppointmentTypeRow | null;
}

// ── Task (enriched) ───────────────────────────────────────────────────────────

export interface TaskDetail extends TaskRow {
  status:   TaskStatusRow;
  priority: TaskPriorityRow;
  person:   PersonRow | null;
  tag_ids:  number[];
}

// ── Media entry (enriched) ────────────────────────────────────────────────────

export interface MediaEntryDetail extends MediaEntryRow {
  media_type: MediaTypeRow;
  status:     MediaStatusRow | null;
  genre_ids:  number[];
}

// ── Weekly entry (enriched) ───────────────────────────────────────────────────

export interface WeeklyEntryDetail extends WeeklyEntryRow {
  intentions: WeeklyIntentionRow[];
}

// ── Week strip (hub page) ─────────────────────────────────────────────────────

export interface WeekDayData {
  date:       string;
  entry:      DailyEntryRow | null;
  habit_ids:  number[];
}

// ── Inserts / Updates ─────────────────────────────────────────────────────────
// Partial types for creating/updating records.

export type DailyEntryInsert = Omit<DailyEntryRow, 'id' | 'created_at' | 'updated_at'>;
export type DailyEntryUpdate = Partial<DailyEntryInsert>;

export type SleepEntryInsert = Omit<SleepEntryRow, 'id' | 'created_at' | 'updated_at'>;
export type SleepEntryUpdate = Partial<SleepEntryInsert>;

export type SymptomEntryInsert = Omit<SymptomEntryRow, 'id' | 'created_at' | 'updated_at'>;
export type SymptomEntryUpdate = Partial<SymptomEntryInsert>;

export type EssEntryInsert = Omit<EssEntryRow, 'id' | 'created_at' | 'updated_at'>;

export type PrescriptionInsert = Omit<PrescriptionRow, 'id' | 'created_at' | 'updated_at'>;
export type PrescriptionUpdate = Partial<PrescriptionInsert>;

export type AppointmentInsert = Omit<AppointmentRow, 'id' | 'created_at' | 'updated_at'>;
export type AppointmentUpdate = Partial<AppointmentInsert>;

export type TaskInsert = Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>;
export type TaskUpdate = Partial<TaskInsert>;

export type MediaEntryInsert = Omit<MediaEntryRow, 'id' | 'created_at' | 'updated_at'>;
export type MediaEntryUpdate = Partial<MediaEntryInsert>;

export type BrainDumpInsert = { entry_id?: number | null; dump_date: string; body_md?: string };
export type BrainDumpUpdate = Partial<BrainDumpInsert>;

export type CrashInsert = Omit<CrashRow, 'id'>;
export type CrashUpdate = Partial<Pick<CrashRow, 'timing' | 'severity'>>;

export type AnxietyEntryInsert = Omit<AnxietyEntryRow, 'id'>;
export type AnxietyEntryUpdate = Partial<Pick<AnxietyEntryRow, 'severity' | 'detail'>>;
