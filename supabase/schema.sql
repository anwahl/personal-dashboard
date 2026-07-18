-- ============================================================
-- Personal Dashboard — Postgres Schema v3
-- Fully normalized. All type/category data lives in the DB.
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


-- ============================================================
-- SECTION 1: PEOPLE
-- ============================================================

CREATE TABLE people (
  id          SERIAL PRIMARY KEY,
  person_name TEXT     NOT NULL,
  birth_date  DATE,
  is_self     BOOLEAN  NOT NULL DEFAULT FALSE,
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE diagnoses (
  id             SERIAL PRIMARY KEY,
  person_id      INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  diagnosis_name TEXT    NOT NULL,
  diagnosed_date DATE,
  notes          TEXT,
  sort_order     SMALLINT DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 2: REFERENCE / TYPE TABLES
-- ============================================================

-- ── Habits ───────────────────────────────────────────────────────────────────

CREATE TABLE habits (
  id         SERIAL PRIMARY KEY,
  habit_name TEXT     NOT NULL,
  emoji      TEXT,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tags ─────────────────────────────────────────────────────────────────────

CREATE TABLE tags (
  id         SERIAL PRIMARY KEY,
  tag_value  TEXT     UNIQUE NOT NULL,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Symptoms ─────────────────────────────────────────────────────────────────

CREATE TABLE symptom_categories (
  id            SERIAL PRIMARY KEY,
  category_name TEXT     NOT NULL,
  sort_order    SMALLINT DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE symptom_types (
  id           SERIAL PRIMARY KEY,
  category_id  INTEGER  NOT NULL REFERENCES symptom_categories(id),
  symptom_name TEXT     NOT NULL,
  sort_order   SMALLINT DEFAULT 0,
  is_active    BOOLEAN  NOT NULL DEFAULT TRUE
);

-- ── ESS ──────────────────────────────────────────────────────────────────────

CREATE TABLE ess_question_types (
  id             SERIAL PRIMARY KEY,
  question_label TEXT     NOT NULL,
  sort_order     SMALLINT DEFAULT 0,
  is_active      BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE ess_answer_types (
  id           SERIAL PRIMARY KEY,
  answer_label TEXT     NOT NULL,
  answer_value SMALLINT NOT NULL CHECK (answer_value BETWEEN 0 AND 3),
  sort_order   SMALLINT DEFAULT 0,
  is_active    BOOLEAN  NOT NULL DEFAULT TRUE
);

-- ── Sleep ─────────────────────────────────────────────────────────────────────

-- timing_options: morning | afternoon | evening | none | n/a
CREATE TABLE timing_options (
  id          SERIAL PRIMARY KEY,
  option_name TEXT     NOT NULL,
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN  NOT NULL DEFAULT TRUE
);

-- timing_categories: caffeine | exercise
CREATE TABLE timing_categories (
  id            SERIAL PRIMARY KEY,
  category_name TEXT     NOT NULL,
  sort_order    SMALLINT DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE
);

-- pre_bed_consumption_types: alcohol | cannabis | caffeine | heavy-meal | none
CREATE TABLE pre_bed_consumption_types (
  id         SERIAL PRIMARY KEY,
  type_name  TEXT     NOT NULL,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE
);

-- sleep_event_types: Hallucinations | Restless Legs | Night Joint Pain | Vivid Dreams | …
CREATE TABLE sleep_event_types (
  id         SERIAL PRIMARY KEY,
  type_name  TEXT     NOT NULL,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE
);

-- ── Providers & Appointments ──────────────────────────────────────────────────

CREATE TABLE provider_types (
  id         SERIAL PRIMARY KEY,
  type_name  TEXT     NOT NULL,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE appointment_types (
  id         SERIAL PRIMARY KEY,
  type_name  TEXT     NOT NULL,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE
);

-- ── Medications ───────────────────────────────────────────────────────────────

-- dose_interval_days: 1.0 = daily, 0.5 = twice daily, 7.0 = weekly, etc.
-- NOTE: "interval" is a PostgreSQL reserved word; using dose_interval_days.
CREATE TABLE medication_timing_types (
  id                 SERIAL PRIMARY KEY,
  timing_name        TEXT          NOT NULL,
  dose_interval_days NUMERIC(4, 1),
  sort_order         SMALLINT DEFAULT 0,
  is_active          BOOLEAN  NOT NULL DEFAULT TRUE
);

-- ── Tasks ─────────────────────────────────────────────────────────────────────

CREATE TABLE task_statuses (
  id          SERIAL PRIMARY KEY,
  status_name TEXT     NOT NULL,
  is_terminal BOOLEAN  NOT NULL DEFAULT FALSE,
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE task_priorities (
  id            SERIAL PRIMARY KEY,
  priority_name TEXT     NOT NULL,
  sort_order    SMALLINT DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE
);

-- ── Timeline ──────────────────────────────────────────────────────────────────

CREATE TABLE timeline_event_types (
  id         SERIAL PRIMARY KEY,
  type_name  TEXT     NOT NULL,
  color_hex  TEXT,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE
);

-- ── Media ─────────────────────────────────────────────────────────────────────

CREATE TABLE media_types (
  id         SERIAL PRIMARY KEY,
  type_name  TEXT     NOT NULL,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE media_statuses (
  id          SERIAL PRIMARY KEY,
  status_name TEXT     NOT NULL,
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE media_genres (
  id         SERIAL PRIMARY KEY,
  genre_name TEXT     UNIQUE NOT NULL,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE
);

-- ── Intentions ────────────────────────────────────────────────────────────────
-- Pool of intentions; one is randomly selected on daily entry creation.

CREATE TABLE intentions (
  id         SERIAL PRIMARY KEY,
  value      TEXT    NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Journal ───────────────────────────────────────────────────────────────────

CREATE TABLE journal_categories (
  id            SERIAL PRIMARY KEY,
  category_name TEXT     NOT NULL,
  sort_order    SMALLINT DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE
);

-- Prompts are randomly selected when creating extended journal entries.
CREATE TABLE journal_prompts (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES journal_categories(id),
  prompt_text TEXT    NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 3: PROVIDERS & PHARMACY
-- ============================================================

CREATE TABLE providers (
  id               SERIAL PRIMARY KEY,
  provider_type_id INTEGER  NOT NULL REFERENCES provider_types(id),
  provider_name    TEXT,
  practice_name    TEXT,
  phone            TEXT,
  address          TEXT,
  portal_url       TEXT,
  sort_order       SMALLINT DEFAULT 0,
  is_active        BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE pharmacy (
  id            SERIAL PRIMARY KEY,
  pharmacy_name TEXT,
  phone         TEXT,
  address       TEXT,
  portal_url    TEXT,
  sort_order    SMALLINT DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 4: MEDICATIONS & PRESCRIPTIONS
-- medications: the drug itself (name, generic name)
-- prescriptions: a person's specific prescription for a drug
-- ============================================================

CREATE TABLE medications (
  id              SERIAL PRIMARY KEY,
  medication_name TEXT    NOT NULL,
  generic_name    TEXT,
  sort_order      SMALLINT DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prescriptions (
  id                SERIAL PRIMARY KEY,
  person_id         INTEGER  NOT NULL REFERENCES people(id),
  medication_id     INTEGER  NOT NULL REFERENCES medications(id),
  alias             TEXT,              -- display name / nickname
  dose              TEXT,
  timing_type_id    INTEGER  REFERENCES medication_timing_types(id),
  purpose           TEXT,
  prescriber_id     INTEGER  REFERENCES providers(id),
  start_date        DATE,
  discontinued_date DATE,
  sort_order        SMALLINT DEFAULT 0,
  is_active         BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER prescriptions_updated_at
  BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE prescription_refills (
  id               SERIAL PRIMARY KEY,
  prescription_id  INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  fill_date        DATE    NOT NULL,
  days_supply      SMALLINT,
  refill_due_date  DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 5: DAILY ENTRIES
-- ============================================================

CREATE TABLE daily_entries (
  id           SERIAL PRIMARY KEY,
  entry_date   DATE     UNIQUE NOT NULL,
  icon         TEXT,
  mood         SMALLINT CHECK (mood BETWEEN 1 AND 10),
  energy       SMALLINT CHECK (energy BETWEEN 1 AND 10),
  word         TEXT,
  daily_emoji  TEXT,
  -- intention_id: randomly selected from intentions table on entry creation
  intention_id INTEGER  REFERENCES intentions(id),
  summary      TEXT,
  body_md      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_entries_entry_date ON daily_entries (entry_date DESC);

CREATE TRIGGER daily_entries_updated_at
  BEFORE UPDATE ON daily_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Junction tables ───────────────────────────────────────────────────────────

CREATE TABLE habit_entries (
  id       SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  habit_id INTEGER NOT NULL REFERENCES habits(id),
  UNIQUE (entry_id, habit_id)
);

CREATE TABLE tag_entries (
  id       SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id),
  UNIQUE (entry_id, tag_id)
);

-- Prescriptions taken on a given day
CREATE TABLE prescription_entries (
  id              SERIAL PRIMARY KEY,
  entry_id        INTEGER NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions(id),
  UNIQUE (entry_id, prescription_id)
);

-- ── Brain dumps ───────────────────────────────────────────────────────────────
-- entry_id is optional: set when created from a daily entry page,
-- null when created as a standalone brain dump.

CREATE TABLE brain_dumps (
  id         SERIAL PRIMARY KEY,
  entry_id   INTEGER REFERENCES daily_entries(id) ON DELETE SET NULL,
  dump_date  DATE    NOT NULL,
  body_md    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER brain_dumps_updated_at
  BEFORE UPDATE ON brain_dumps FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Journal prompt responses ──────────────────────────────────────────────────

CREATE TABLE journal_prompt_responses (
  id            SERIAL PRIMARY KEY,
  prompt_id     INTEGER NOT NULL REFERENCES journal_prompts(id),
  entry_id      INTEGER REFERENCES daily_entries(id) ON DELETE SET NULL,
  response_text TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER journal_prompt_responses_updated_at
  BEFORE UPDATE ON journal_prompt_responses FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- SECTION 6: SLEEP ENTRIES (1:1 with daily_entries)
-- "Prior night" context is fetched from the previous day's
-- sleep entry — no prior_* columns needed here.
-- Row existence = sleep was logged (no is_logged flag needed).
-- ============================================================

CREATE TABLE sleep_entries (
  id                  SERIAL PRIMARY KEY,
  entry_id            INTEGER UNIQUE NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  sleep_quality       SMALLINT CHECK (sleep_quality BETWEEN 1 AND 10),
  hours_slept         NUMERIC(4, 2),
  bedtime             TIME,
  sleep_latency_min   SMALLINT,
  wake_time           TIME,
  sleep_inertia_min   SMALLINT,
  osa_event_count     NUMERIC(4, 1),
  sleep_notes         TEXT,
  today_pre_bed_activity TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER sleep_entries_updated_at
  BEFORE UPDATE ON sleep_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row existence indicates nap occurred; was_refreshing qualifies it.
-- nap_count for days with multiple naps.
CREATE TABLE naps (
  id             SERIAL PRIMARY KEY,
  sleep_entry_id INTEGER NOT NULL REFERENCES sleep_entries(id) ON DELETE CASCADE,
  nap_count      SMALLINT DEFAULT 1,
  duration_min   SMALLINT,
  was_refreshing BOOLEAN  DEFAULT FALSE
);

-- Single row per daily sleep entry; count/detail describe all wake events.
CREATE TABLE wake_events (
  id             SERIAL PRIMARY KEY,
  sleep_entry_id INTEGER UNIQUE NOT NULL REFERENCES sleep_entries(id) ON DELETE CASCADE,
  event_count    SMALLINT DEFAULT 0,
  duration_min   SMALLINT DEFAULT 0,
  detail         TEXT
);

-- Boolean sleep events (hallucinations, restless legs, etc.)
-- Row existence = event occurred.
CREATE TABLE sleep_events (
  id             SERIAL PRIMARY KEY,
  sleep_entry_id INTEGER NOT NULL REFERENCES sleep_entries(id) ON DELETE CASCADE,
  event_type_id  INTEGER NOT NULL REFERENCES sleep_event_types(id),
  UNIQUE (sleep_entry_id, event_type_id)
);

-- Today's caffeine/exercise timing (readable by tomorrow as "prior" context)
CREATE TABLE sleep_timing_entries (
  id                 SERIAL PRIMARY KEY,
  sleep_entry_id     INTEGER NOT NULL REFERENCES sleep_entries(id) ON DELETE CASCADE,
  timing_category_id INTEGER NOT NULL REFERENCES timing_categories(id),
  timing_option_id   INTEGER NOT NULL REFERENCES timing_options(id),
  UNIQUE (sleep_entry_id, timing_category_id)
);

-- Today's pre-bed consumption (readable by tomorrow as "prior" context)
CREATE TABLE sleep_consumption_entries (
  id                  SERIAL PRIMARY KEY,
  sleep_entry_id      INTEGER NOT NULL REFERENCES sleep_entries(id) ON DELETE CASCADE,
  consumption_type_id INTEGER NOT NULL REFERENCES pre_bed_consumption_types(id),
  UNIQUE (sleep_entry_id, consumption_type_id)
);


-- ============================================================
-- SECTION 7: ESS ENTRIES (1:1 with daily_entries)
-- Total computed via view — frontend iterates ess_question_types,
-- no hardcoded question knowledge required.
-- ============================================================

CREATE TABLE ess_entries (
  id         SERIAL PRIMARY KEY,
  entry_id   INTEGER UNIQUE NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER ess_entries_updated_at
  BEFORE UPDATE ON ess_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE ess_question_responses (
  id               SERIAL PRIMARY KEY,
  ess_entry_id     INTEGER NOT NULL REFERENCES ess_entries(id) ON DELETE CASCADE,
  question_type_id INTEGER NOT NULL REFERENCES ess_question_types(id),
  answer_type_id   INTEGER NOT NULL REFERENCES ess_answer_types(id),
  UNIQUE (ess_entry_id, question_type_id)
);

CREATE VIEW ess_entry_totals AS
SELECT
  ee.id   AS ess_entry_id,
  ee.entry_id,
  COALESCE(SUM(at.answer_value), 0) AS total
FROM ess_entries ee
LEFT JOIN ess_question_responses eqr ON eqr.ess_entry_id = ee.id
LEFT JOIN ess_answer_types at ON at.id = eqr.answer_type_id
GROUP BY ee.id, ee.entry_id;


-- ============================================================
-- SECTION 8: SYMPTOM ENTRIES (1:1 with daily_entries)
-- Crash and anxiety each get their own table.
-- Row existence = symptoms were logged (no is_logged flag needed).
-- ============================================================

CREATE TABLE symptom_entries (
  id                SERIAL PRIMARY KEY,
  entry_id          INTEGER UNIQUE NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  pain_level        SMALLINT DEFAULT NULL CHECK (pain_level BETWEEN 0 AND 10),
  brain_fog_level   SMALLINT DEFAULT NULL CHECK (brain_fog_level BETWEEN 0 AND 10),
  fatigue_level     SMALLINT DEFAULT NULL CHECK (fatigue_level BETWEEN 0 AND 10),
  background_notes  TEXT,
  what_helped       TEXT,
  flag_for_provider BOOLEAN  DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER symptom_entries_updated_at
  BEFORE UPDATE ON symptom_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row existence = crash occurred that day.
CREATE TABLE crashes (
  id       SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  timing   TEXT,
  severity SMALLINT DEFAULT NULL CHECK (severity BETWEEN 0 AND 10),
  UNIQUE (entry_id)   -- one crash entry per day
);

-- Row existence = anxiety was notable that day.
CREATE TABLE anxiety_entries (
  id       SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  severity SMALLINT DEFAULT NULL CHECK (severity BETWEEN 0 AND 10),
  detail   TEXT,
  UNIQUE (entry_id)
);

-- Which symptom types were present; severity is optional (NULL = present but unrated)
CREATE TABLE daily_symptom_entries (
  id               SERIAL PRIMARY KEY,
  symptom_entry_id INTEGER  NOT NULL REFERENCES symptom_entries(id) ON DELETE CASCADE,
  symptom_type_id  INTEGER  NOT NULL REFERENCES symptom_types(id),
  severity         SMALLINT DEFAULT NULL CHECK (severity BETWEEN 0 AND 10),
  UNIQUE (symptom_entry_id, symptom_type_id)
);


-- ============================================================
-- SECTION 9: WEEKLY ENTRIES
-- ============================================================

CREATE TABLE weekly_entries (
  id              SERIAL PRIMARY KEY,
  week_start_date DATE UNIQUE NOT NULL,
  week_end_date   DATE        NOT NULL,
  reflection      TEXT,
  wins            TEXT,
  challenges      TEXT,
  next_week_focus TEXT,
  body_md         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER weekly_entries_updated_at
  BEFORE UPDATE ON weekly_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE weekly_intentions (
  id              SERIAL PRIMARY KEY,
  weekly_entry_id INTEGER  NOT NULL REFERENCES weekly_entries(id) ON DELETE CASCADE,
  intention_text  TEXT     NOT NULL,
  sort_order      SMALLINT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 10: APPOINTMENTS
-- ============================================================

CREATE TABLE appointments (
  id                  SERIAL PRIMARY KEY,
  appointment_date    DATE    NOT NULL,
  appointment_time    TIME,
  person_id           INTEGER NOT NULL REFERENCES people(id),
  provider_id         INTEGER REFERENCES providers(id),
  appointment_type_id INTEGER REFERENCES appointment_types(id),
  location            TEXT,
  questions           TEXT,
  notes               TEXT,
  followup_for_id     INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_date ON appointments (appointment_date DESC);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit log: one row per field changed per appointment.
-- Records what changed (field_changed), from what, to what.
CREATE TABLE prescription_changes (
  id              SERIAL PRIMARY KEY,
  appointment_id  INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions(id),
  field_changed   TEXT    NOT NULL,   -- e.g. 'dose', 'timing', 'discontinued'
  previous_value  TEXT,
  new_value       TEXT,
  change_notes    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 11: TASKS
-- ============================================================

CREATE TABLE tasks (
  id             SERIAL PRIMARY KEY,
  title          TEXT    NOT NULL,
  status_id      INTEGER NOT NULL REFERENCES task_statuses(id),
  priority_id    INTEGER NOT NULL REFERENCES task_priorities(id),
  due_date       DATE,
  scheduled_date DATE,
  person_id      INTEGER REFERENCES people(id),
  body_md        TEXT,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_due_date ON tasks (due_date ASC) WHERE due_date IS NOT NULL;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE task_tag_entries (
  id      SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id),
  UNIQUE (task_id, tag_id)
);


-- ============================================================
-- SECTION 12: TIMELINE EVENTS
-- ============================================================

CREATE TABLE timeline_events (
  id            SERIAL PRIMARY KEY,
  entry_id      INTEGER NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  event_type_id INTEGER REFERENCES timeline_event_types(id),
  event_title   TEXT    NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL,
  ended_at      TIMESTAMPTZ,
  group_name    TEXT,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_events_entry_id ON timeline_events (entry_id);


-- ============================================================
-- SECTION 13: MEDIA
-- ============================================================

CREATE TABLE media_entries (
  id            SERIAL PRIMARY KEY,
  media_type_id INTEGER NOT NULL REFERENCES media_types(id),
  title         TEXT    NOT NULL,
  status_id     INTEGER REFERENCES media_statuses(id),
  rating        SMALLINT CHECK (rating BETWEEN 1 AND 10),
  started_date  DATE,
  finished_date DATE,
  platform      TEXT,
  creator       TEXT,
  notes         TEXT,
  review        TEXT,
  sort_order    SMALLINT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER media_entries_updated_at
  BEFORE UPDATE ON media_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE media_genre_entries (
  id             SERIAL PRIMARY KEY,
  media_entry_id INTEGER NOT NULL REFERENCES media_entries(id) ON DELETE CASCADE,
  genre_id       INTEGER NOT NULL REFERENCES media_genres(id),
  UNIQUE (media_entry_id, genre_id)
);


-- ============================================================
-- SECTION 14: LAST TIME TRACKER
-- last_logged_date is never stored — always MAX(logged_date) via view.
-- ============================================================

CREATE TABLE last_time_activities (
  id            SERIAL PRIMARY KEY,
  activity_name TEXT     NOT NULL,
  emoji         TEXT,
  sort_order    SMALLINT DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE last_time_logs (
  id          SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES last_time_activities(id) ON DELETE CASCADE,
  logged_date DATE    NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_last_time_logs_activity ON last_time_logs (activity_id, logged_date DESC);

CREATE VIEW last_time_latest AS
SELECT
  a.id,
  a.activity_name,
  a.emoji,
  a.sort_order,
  a.is_active,
  MAX(l.logged_date) AS last_logged_date
FROM last_time_activities a
LEFT JOIN last_time_logs l ON l.activity_id = a.id
GROUP BY a.id, a.activity_name, a.emoji, a.sort_order, a.is_active;


-- ============================================================
-- SECTION 15: GENERIC STRUCTURED CONTENT
-- Info groups, lists, logs, and checklists with no hard-coded
-- entity reference. Junction tables handle assignment.
-- Pattern: add a new junction table to attach to a new entity.
-- ============================================================

-- ── Info groups ───────────────────────────────────────────────────────────────

CREATE TABLE info_groups (
  id          SERIAL PRIMARY KEY,
  group_title TEXT     NOT NULL,
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE info_field_types (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER  NOT NULL REFERENCES info_groups(id) ON DELETE CASCADE,
  field_label TEXT     NOT NULL,
  field_type  TEXT     NOT NULL DEFAULT 'text',  -- text | date | textarea
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE info_field_values (
  id            SERIAL PRIMARY KEY,
  field_type_id INTEGER UNIQUE NOT NULL REFERENCES info_field_types(id) ON DELETE CASCADE,
  field_value   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Item lists ────────────────────────────────────────────────────────────────

CREATE TABLE item_lists (
  id         SERIAL PRIMARY KEY,
  list_title TEXT     NOT NULL,
  list_label TEXT,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE item_list_entries (
  id         SERIAL PRIMARY KEY,
  list_id    INTEGER  NOT NULL REFERENCES item_lists(id) ON DELETE CASCADE,
  entry_text TEXT     NOT NULL,
  entry_date DATE,
  sort_order SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Structured logs ───────────────────────────────────────────────────────────
-- log_schemas defines the template; log_entries holds individual records.

CREATE TABLE log_schemas (
  id         SERIAL PRIMARY KEY,
  log_title  TEXT     NOT NULL,
  sort_order SMALLINT DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE log_schema_fields (
  id          SERIAL PRIMARY KEY,
  log_id      INTEGER  NOT NULL REFERENCES log_schemas(id) ON DELETE CASCADE,
  field_label TEXT     NOT NULL,
  field_key   TEXT     NOT NULL,
  field_type  TEXT     NOT NULL DEFAULT 'text',  -- text | select | textarea
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE log_schema_field_options (
  id            SERIAL PRIMARY KEY,
  field_id      INTEGER  NOT NULL REFERENCES log_schema_fields(id) ON DELETE CASCADE,
  option_value  TEXT     NOT NULL,
  sort_order    SMALLINT DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE log_entries (
  id         SERIAL PRIMARY KEY,
  log_id     INTEGER NOT NULL REFERENCES log_schemas(id) ON DELETE CASCADE,
  entry_date DATE    NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE log_entry_values (
  id           SERIAL PRIMARY KEY,
  log_entry_id INTEGER NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  field_id     INTEGER NOT NULL REFERENCES log_schema_fields(id),
  field_value  TEXT,
  UNIQUE (log_entry_id, field_id)
);

-- ── Checklists ────────────────────────────────────────────────────────────────

CREATE TABLE checklists (
  id              SERIAL PRIMARY KEY,
  checklist_title TEXT     NOT NULL,
  checklist_label TEXT,
  sort_order      SMALLINT DEFAULT 0,
  is_active       BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE checklist_items (
  id           SERIAL PRIMARY KEY,
  checklist_id INTEGER  NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  item_text    TEXT     NOT NULL,
  is_checked   BOOLEAN  NOT NULL DEFAULT FALSE,
  sort_order   SMALLINT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Junction tables: person → structured content ──────────────────────────────
-- Add analogous tables (e.g. appointment_info_groups) to attach to other entities.

CREATE TABLE person_info_group_links (
  id           SERIAL PRIMARY KEY,
  person_id    INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  info_group_id INTEGER NOT NULL REFERENCES info_groups(id) ON DELETE CASCADE,
  UNIQUE (person_id, info_group_id)
);

CREATE TABLE person_item_list_links (
  id        SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  list_id   INTEGER NOT NULL REFERENCES item_lists(id) ON DELETE CASCADE,
  UNIQUE (person_id, list_id)
);

CREATE TABLE person_log_links (
  id        SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  log_id    INTEGER NOT NULL REFERENCES log_schemas(id) ON DELETE CASCADE,
  UNIQUE (person_id, log_id)
);

CREATE TABLE person_checklist_links (
  id           SERIAL PRIMARY KEY,
  person_id    INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  UNIQUE (person_id, checklist_id)
);


-- ============================================================
-- SECTION 16: SEED DATA
-- ============================================================

INSERT INTO people (person_name, is_self, sort_order) VALUES
  ('Annie',   TRUE,  0),
  ('Ender',   FALSE, 1),
  ('Beatrix', FALSE, 2),
  ('Scott',   FALSE, 3);

INSERT INTO habits (habit_name, emoji, sort_order, is_active) VALUES
  ('Water',     '💧', 0, TRUE),
  ('Movement',  '🏃', 1, TRUE),
  ('Showered',  '🚿', 2, TRUE),
  ('Cleaned',   '🧹', 3, TRUE),
  ('Outside',   '🌿', 4, TRUE),
  ('Skin Care', '✨', 5, FALSE);

INSERT INTO tags (tag_value) VALUES
  ('aquatic-rehab'), ('pt'), ('therapy'), ('psychiatry'), ('gp-appt'),
  ('family-time'), ('date-night'), ('social'), ('outing'),
  ('bad-day'), ('good-day'), ('crash'), ('productive');

INSERT INTO symptom_categories (category_name, sort_order) VALUES
  ('Joint', 0), ('Location', 1), ('Autonomic', 2), ('GI', 3), ('Skin', 4);

INSERT INTO symptom_types (category_id, symptom_name, sort_order) VALUES
  (1,'joint-pain',0),(1,'stiffness',1),(1,'swelling',2),(1,'instability',3),(1,'locking',4),
  (2,'si-joint',0),(2,'hips',1),(2,'knees',2),(2,'ankles',3),(2,'shoulders',4),
  (2,'hands',5),(2,'wrists',6),(2,'neck',7),(2,'jaw',8),
  (3,'pots',0),(3,'tachycardia',1),(3,'presyncope',2),(3,'temperature-dysreg',3),(3,'sweating',4),(3,'pallor',5),
  (4,'nausea',0),(4,'vomiting',1),(4,'cramping',2),(4,'bloating',3),(4,'constipation',4),(4,'diarrhea',5),(4,'reflux',6),
  (5,'itching',0),(5,'rash',1),(5,'hives',2),(5,'flushing',3),(5,'bruising',4),(5,'slow-healing',5);

INSERT INTO sleep_event_types (type_name, sort_order) VALUES
  ('Hallucinations',  0),
  ('Restless Legs',   1),
  ('Night Joint Pain',2),
  ('Vivid Dreams',    3);

INSERT INTO ess_question_types (question_label, sort_order) VALUES
  ('Sitting and reading',                       0),
  ('Watching TV',                               1),
  ('Sitting inactive in a public place',        2),
  ('As a passenger in a car for an hour',       3),
  ('Lying down in the afternoon',               4),
  ('Sitting and talking to someone',            5),
  ('Sitting quietly after lunch (no alcohol)',  6),
  ('In a car, stopped in traffic',              7);

INSERT INTO ess_answer_types (answer_label, answer_value, sort_order) VALUES
  ('Never', 0, 0), ('Slight', 1, 1), ('Moderate', 2, 2), ('High', 3, 3);

INSERT INTO timing_options (option_name, sort_order) VALUES
  ('morning', 0), ('afternoon', 1), ('evening', 2), ('none', 3);

INSERT INTO timing_categories (category_name, sort_order) VALUES
  ('caffeine', 0), ('exercise', 1);

INSERT INTO pre_bed_consumption_types (type_name, sort_order) VALUES
  ('alcohol', 0), ('cannabis', 1), ('caffeine', 2), ('heavy-meal', 3), ('none', 4);

INSERT INTO provider_types (type_name, sort_order) VALUES
  ('therapy',0),('psychiatry',1),('gp',2),('sleep',3),('pt',4),('other',5);

INSERT INTO appointment_types (type_name, sort_order) VALUES
  ('Therapy',0),('Psychiatry',1),('GP',2),('Sleep',3),('School Meeting',4),('Other',5);

INSERT INTO medication_timing_types (timing_name, dose_interval_days, sort_order) VALUES
  ('Daily',             1.0, 0),
  ('Twice Daily',       0.5, 1),
  ('Every Other Day',   2.0, 2),
  ('Weekly',            7.0, 3),
  ('Every Ten Days',   10.0, 4),
  ('Biweekly',         14.0, 5),
  ('Monthly',          30.0, 6),
  ('As Needed',        NULL, 7);

INSERT INTO task_statuses (status_name, is_terminal, sort_order) VALUES
  ('todo', FALSE, 0), ('in-progress', FALSE, 1), ('waiting', FALSE, 2),
  ('done', TRUE, 3), ('cancelled', TRUE, 4);

INSERT INTO task_priorities (priority_name, sort_order) VALUES
  ('low', 0), ('normal', 1), ('high', 2);

INSERT INTO timeline_event_types (type_name, color_hex, sort_order) VALUES
  ('hobby', '#CF9893', 0), ('movement', '#7aab4a', 1), ('selfcare', '#9D7A82', 2),
  ('family', '#FCC4A9', 3), ('productive', '#8C9DB5', 4);

INSERT INTO media_types (type_name, sort_order) VALUES
  ('series', 0), ('movie', 1), ('book', 2), ('game', 3);

INSERT INTO media_statuses (status_name, sort_order) VALUES
  ('watching', 0), ('reading', 1), ('playing', 2), ('finished', 3),
  ('dropped', 4), ('want-to', 5), ('paused', 6);

INSERT INTO last_time_activities (activity_name, emoji, sort_order) VALUES
  ('Date Night',   '💏', 0),
  ('Family Night', '🥳', 1);

INSERT INTO journal_categories (category_name, sort_order) VALUES
  ('Memory Joggers', 0),
  ('Reflections',    1),
  ('Questions',      2),
  ('Gratitude',      3);
