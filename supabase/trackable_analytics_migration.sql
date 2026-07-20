-- ============================================================
-- MIGRATION: Trackable metrics + analytics chart system
--
-- Replaces:
--   habits table                 → daily_trackables (track_type = 'boolean')
--   daily_entries.mood/energy    → daily_numeric_entries
--   symptom_entries.pain/fog/fat → daily_numeric_entries
--   symptom_entries (whole table)→ dropped; crash/anxiety stay on entry_id directly
--   ess_entry_totals VIEW        → synced via trigger into daily_numeric_entries
--
-- Adds:
--   daily_trackables, daily_numeric_entries
--   chart_definitions, chart_trackable_links
--   ESS aggregate trigger
-- ============================================================


-- ── 1. Enums ─────────────────────────────────────────────────────────────────

CREATE TYPE track_type_enum  AS ENUM ('numeric', 'boolean', 'aggregate');
CREATE TYPE chart_type_enum  AS ENUM ('scatter', 'line', 'heatmap');
CREATE TYPE metric_role_enum AS ENUM ('x_axis', 'y_axis', 'series');


-- ── 2. New tables ─────────────────────────────────────────────────────────────

CREATE TABLE daily_trackables (
  id         SERIAL PRIMARY KEY,
  track_type track_type_enum NOT NULL,
  name       TEXT            NOT NULL,
  emoji      TEXT,
  color_hex  TEXT,
  sort_order SMALLINT        NOT NULL DEFAULT 0,
  is_active  BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE TABLE daily_numeric_entries (
  id           SERIAL PRIMARY KEY,
  entry_id     INTEGER NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  trackable_id INTEGER NOT NULL REFERENCES daily_trackables(id),
  metric_value SMALLINT NOT NULL,
  UNIQUE (entry_id, trackable_id)
);

CREATE TABLE chart_definitions (
  id         SERIAL PRIMARY KEY,
  title      TEXT           NOT NULL,
  chart_type chart_type_enum NOT NULL DEFAULT 'line',
  sort_order SMALLINT       NOT NULL DEFAULT 0,
  is_active  BOOLEAN        NOT NULL DEFAULT TRUE
);

CREATE TABLE chart_trackable_links (
  id           SERIAL PRIMARY KEY,
  chart_id     INTEGER          NOT NULL REFERENCES chart_definitions(id) ON DELETE CASCADE,
  trackable_id INTEGER          NOT NULL REFERENCES daily_trackables(id),
  metric_role  metric_role_enum NOT NULL DEFAULT 'series',
  sort_order   SMALLINT         NOT NULL DEFAULT 0,
  UNIQUE (chart_id, trackable_id)
);


-- ── 3. Add trackable_id to ess_question_types ─────────────────────────────────

ALTER TABLE ess_question_types
  ADD COLUMN trackable_id INTEGER REFERENCES daily_trackables(id);


-- ── 4. Seed daily_trackables ──────────────────────────────────────────────────

-- Boolean trackables (was: habits table)
INSERT INTO daily_trackables (track_type, name, emoji, color_hex, sort_order, is_active)
SELECT 'boolean'::track_type_enum, habit_name, emoji, NULL, sort_order, is_active
FROM habits
ORDER BY sort_order;

-- Numeric trackables (replaces hardcoded columns)
INSERT INTO daily_trackables (track_type, name, emoji, color_hex, sort_order, is_active) VALUES
  ('numeric'::track_type_enum, 'Mood',      '😊', '#CF9893', 10, TRUE),
  ('numeric'::track_type_enum, 'Energy',    '⚡', '#FCC4A9', 11, TRUE),
  ('numeric'::track_type_enum, 'Pain',      '🤕', '#CF9893', 12, TRUE),
  ('numeric'::track_type_enum, 'Brain Fog', '🌫️', '#b8aed4', 13, TRUE),
  ('numeric'::track_type_enum, 'Fatigue',   '😴', '#7aaec9', 14, TRUE);

-- Aggregate trackable for ESS
INSERT INTO daily_trackables (track_type, name, emoji, color_hex, sort_order, is_active) VALUES
  ('aggregate'::track_type_enum, 'ESS Score', '😴', '#9D7A82', 20, TRUE);


-- ── 5. Link ess_question_types to the ESS aggregate trackable ─────────────────

UPDATE ess_question_types
SET trackable_id = (
  SELECT id FROM daily_trackables
  WHERE name = 'ESS Score' AND track_type = 'aggregate'
);


-- ── 6. Migrate habit_entries: habit_id → trackable_id ────────────────────────

ALTER TABLE habit_entries ADD COLUMN trackable_id INTEGER;

UPDATE habit_entries he
SET trackable_id = dt.id
FROM habits h
JOIN daily_trackables dt
  ON dt.name = h.habit_name AND dt.track_type = 'boolean'
WHERE h.id = he.habit_id;

ALTER TABLE habit_entries ALTER COLUMN trackable_id SET NOT NULL;
ALTER TABLE habit_entries ADD CONSTRAINT habit_entries_trackable_id_fkey
  FOREIGN KEY (trackable_id) REFERENCES daily_trackables(id);
ALTER TABLE habit_entries DROP CONSTRAINT habit_entries_entry_id_habit_id_key;
ALTER TABLE habit_entries ADD CONSTRAINT habit_entries_entry_id_trackable_id_key
  UNIQUE (entry_id, trackable_id);
ALTER TABLE habit_entries DROP COLUMN habit_id;


-- ── 7. Migrate daily_numeric_entries: mood / energy ───────────────────────────

INSERT INTO daily_numeric_entries (entry_id, trackable_id, metric_value)
SELECT de.id, dt.id, de.mood
FROM daily_entries de
JOIN daily_trackables dt ON dt.name = 'Mood' AND dt.track_type = 'numeric'
WHERE de.mood IS NOT NULL
ON CONFLICT (entry_id, trackable_id) DO NOTHING;

INSERT INTO daily_numeric_entries (entry_id, trackable_id, metric_value)
SELECT de.id, dt.id, de.energy
FROM daily_entries de
JOIN daily_trackables dt ON dt.name = 'Energy' AND dt.track_type = 'numeric'
WHERE de.energy IS NOT NULL
ON CONFLICT (entry_id, trackable_id) DO NOTHING;


-- ── 8. Migrate pain / brain_fog / fatigue from symptom_entries ───────────────

INSERT INTO daily_numeric_entries (entry_id, trackable_id, metric_value)
SELECT se.entry_id, dt.id, se.pain_level
FROM symptom_entries se
JOIN daily_trackables dt ON dt.name = 'Pain' AND dt.track_type = 'numeric'
WHERE se.pain_level IS NOT NULL
ON CONFLICT (entry_id, trackable_id) DO NOTHING;

INSERT INTO daily_numeric_entries (entry_id, trackable_id, metric_value)
SELECT se.entry_id, dt.id, se.brain_fog_level
FROM symptom_entries se
JOIN daily_trackables dt ON dt.name = 'Brain Fog' AND dt.track_type = 'numeric'
WHERE se.brain_fog_level IS NOT NULL
ON CONFLICT (entry_id, trackable_id) DO NOTHING;

INSERT INTO daily_numeric_entries (entry_id, trackable_id, metric_value)
SELECT se.entry_id, dt.id, se.fatigue_level
FROM symptom_entries se
JOIN daily_trackables dt ON dt.name = 'Fatigue' AND dt.track_type = 'numeric'
WHERE se.fatigue_level IS NOT NULL
ON CONFLICT (entry_id, trackable_id) DO NOTHING;


-- ── 9. Migrate daily_symptom_entries: symptom_entry_id → entry_id ────────────

ALTER TABLE daily_symptom_entries ADD COLUMN entry_id INTEGER;

UPDATE daily_symptom_entries dse
SET entry_id = se.entry_id
FROM symptom_entries se
WHERE se.id = dse.symptom_entry_id;

-- Some entries may have no symptom_entries row (if created standalone) — clean those up
DELETE FROM daily_symptom_entries WHERE entry_id IS NULL;

ALTER TABLE daily_symptom_entries ALTER COLUMN entry_id SET NOT NULL;
ALTER TABLE daily_symptom_entries ADD CONSTRAINT daily_symptom_entries_entry_id_fkey
  FOREIGN KEY (entry_id) REFERENCES daily_entries(id) ON DELETE CASCADE;
ALTER TABLE daily_symptom_entries DROP COLUMN symptom_entry_id;
ALTER TABLE daily_symptom_entries DROP CONSTRAINT IF EXISTS daily_symptom_entries_symptom_entry_id_symptom_type_id_key;
ALTER TABLE daily_symptom_entries ADD CONSTRAINT daily_symptom_entries_entry_id_symptom_type_id_key
  UNIQUE (entry_id, symptom_type_id);


-- ── 10. Backfill ESS aggregates from existing data ────────────────────────────

INSERT INTO daily_numeric_entries (entry_id, trackable_id, metric_value)
SELECT
  ee.entry_id,
  dt.id,
  COALESCE(SUM(eat.answer_value), 0)
FROM ess_entries ee
LEFT JOIN ess_question_responses eqr ON eqr.ess_entry_id = ee.id
LEFT JOIN ess_answer_types eat ON eat.id = eqr.answer_type_id
JOIN daily_trackables dt ON dt.name = 'ESS Score' AND dt.track_type = 'aggregate'
GROUP BY ee.entry_id, dt.id
HAVING SUM(eat.answer_value) > 0
ON CONFLICT (entry_id, trackable_id) DO NOTHING;


-- ── 11. ESS aggregate trigger ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_ess_to_numeric()
RETURNS TRIGGER AS $$
DECLARE
  v_ess_entry_id  INTEGER;
  v_entry_id      INTEGER;
  v_trackable_id  INTEGER;
  v_total         INTEGER;
BEGIN
  v_ess_entry_id := COALESCE(NEW.ess_entry_id, OLD.ess_entry_id);

  SELECT ee.entry_id INTO v_entry_id
  FROM ess_entries ee WHERE ee.id = v_ess_entry_id;

  SELECT eqt.trackable_id INTO v_trackable_id
  FROM ess_question_types eqt
  WHERE eqt.id = COALESCE(NEW.question_type_id, OLD.question_type_id);

  IF v_entry_id IS NULL OR v_trackable_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(eat.answer_value), 0) INTO v_total
  FROM ess_question_responses eqr
  JOIN ess_answer_types eat ON eat.id = eqr.answer_type_id
  WHERE eqr.ess_entry_id = v_ess_entry_id;

  IF NOT EXISTS (
    SELECT 1 FROM ess_question_responses WHERE ess_entry_id = v_ess_entry_id
  ) THEN
    DELETE FROM daily_numeric_entries
    WHERE entry_id = v_entry_id AND trackable_id = v_trackable_id;
  ELSE
    INSERT INTO daily_numeric_entries (entry_id, trackable_id, metric_value)
    VALUES (v_entry_id, v_trackable_id, v_total)
    ON CONFLICT (entry_id, trackable_id)
    DO UPDATE SET metric_value = EXCLUDED.metric_value;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ess_sync_to_numeric
  AFTER INSERT OR UPDATE OR DELETE ON ess_question_responses
  FOR EACH ROW EXECUTE FUNCTION sync_ess_to_numeric();


-- ── 12. Drop old structures ───────────────────────────────────────────────────

DROP TABLE symptom_entries CASCADE;  -- cascades to nothing (daily_symptom_entries already migrated)
DROP TABLE habits;
DROP VIEW  IF EXISTS ess_entry_totals;
ALTER TABLE daily_entries DROP COLUMN mood;
ALTER TABLE daily_entries DROP COLUMN energy;


-- ── 13. Seed chart_definitions ────────────────────────────────────────────────

INSERT INTO chart_definitions (title, chart_type, sort_order, is_active) VALUES
  ('Mood vs Energy',  'scatter'::chart_type_enum, 1, TRUE),
  ('Symptom Trends',  'line'::chart_type_enum,    2, TRUE),
  ('ESS Trend',       'line'::chart_type_enum,    3, TRUE),
  ('Habits',          'heatmap'::chart_type_enum, 4, TRUE);

-- Mood vs Energy scatter: Energy on X axis, Mood on Y axis
INSERT INTO chart_trackable_links (chart_id, trackable_id, metric_role, sort_order)
SELECT cd.id, dt.id, 'x_axis'::metric_role_enum, 1
FROM chart_definitions cd, daily_trackables dt
WHERE cd.title = 'Mood vs Energy' AND dt.name = 'Energy';

INSERT INTO chart_trackable_links (chart_id, trackable_id, metric_role, sort_order)
SELECT cd.id, dt.id, 'y_axis'::metric_role_enum, 2
FROM chart_definitions cd, daily_trackables dt
WHERE cd.title = 'Mood vs Energy' AND dt.name = 'Mood';

-- Symptom Trends line: Pain, Brain Fog, Fatigue as series
INSERT INTO chart_trackable_links (chart_id, trackable_id, metric_role, sort_order)
SELECT cd.id, dt.id, 'series'::metric_role_enum, dt.sort_order
FROM chart_definitions cd, daily_trackables dt
WHERE cd.title = 'Symptom Trends' AND dt.name IN ('Pain', 'Brain Fog', 'Fatigue');

-- ESS Trend line: ESS Score as series
INSERT INTO chart_trackable_links (chart_id, trackable_id, metric_role, sort_order)
SELECT cd.id, dt.id, 'series'::metric_role_enum, 1
FROM chart_definitions cd, daily_trackables dt
WHERE cd.title = 'ESS Trend' AND dt.name = 'ESS Score';

-- Habits heatmap: intentionally empty — user configures in settings
