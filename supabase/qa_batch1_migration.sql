-- ============================================================
-- MIGRATION: QA batch 1 — people categories + task due time
--
-- 1. people_categories — new lookup table; seeded with Family + Friends
-- 2. people.category_id — FK to people_categories; existing rows backfilled
--    to "Family"; nullable in DB, required in UI
-- 3. tasks.due_time — optional TIME column alongside due_date; neither
--    depends on the other; existing rows unaffected
--
-- After running: reload Supabase schema cache.
-- ============================================================

-- ── People categories ─────────────────────────────────────────────────────────

CREATE TABLE people_categories (
  id            SERIAL   PRIMARY KEY,
  category_name TEXT     NOT NULL,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO people_categories (category_name, sort_order) VALUES
  ('Family',  0),
  ('Friends', 1);

-- Add category_id to people; nullable so existing rows are valid
ALTER TABLE people
  ADD COLUMN category_id INTEGER REFERENCES people_categories(id) ON DELETE SET NULL;

-- Backfill existing people to "Family" (the first seeded category)
UPDATE people
SET category_id = (
  SELECT id FROM people_categories WHERE category_name = 'Family' LIMIT 1
)
WHERE category_id IS NULL;

-- ── Task due time ─────────────────────────────────────────────────────────────
-- Optional time-of-day for a task's due date.
-- Stored as TIME (no timezone) — interpreted as local time in the UI.
-- Nullable: a due_date can exist without a due_time and vice versa.

ALTER TABLE tasks
  ADD COLUMN due_time TIME;
