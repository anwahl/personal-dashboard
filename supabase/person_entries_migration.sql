-- ============================================================
-- Migration: person-scoped entries for shared structures
--
-- The structure tables (info_groups, item_lists, log_schemas,
-- checklists) remain shared/reusable. This migration adds
-- person_id to the ENTRY/VALUE tables so each person's data
-- stays separate even when they share the same structure.
--
-- Run this in your Supabase SQL editor before deploying.
-- ============================================================

-- ── info_field_values ─────────────────────────────────────────────────────────
-- Was: UNIQUE (field_type_id) → one value per field, shared across all people
-- Now: UNIQUE (field_type_id, person_id) → one value per field PER person

ALTER TABLE info_field_values
  DROP CONSTRAINT IF EXISTS info_field_values_field_type_id_key;

ALTER TABLE info_field_values
  ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES people(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS info_field_values_per_person
  ON info_field_values (field_type_id, person_id);


-- ── item_list_entries ─────────────────────────────────────────────────────────
ALTER TABLE item_list_entries
  ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES people(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_item_list_entries_person
  ON item_list_entries (list_id, person_id, entry_date DESC);


-- ── log_entries ───────────────────────────────────────────────────────────────
ALTER TABLE log_entries
  ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES people(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_log_entries_person
  ON log_entries (log_id, person_id, entry_date DESC);


-- ── checklist_item_states ─────────────────────────────────────────────────────
-- checklist_items keeps the item definitions (text, sort_order) — shared.
-- This new table tracks each person's individual checked state.

CREATE TABLE IF NOT EXISTS checklist_item_states (
  id         SERIAL PRIMARY KEY,
  item_id    INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  person_id  INTEGER NOT NULL REFERENCES people(id)         ON DELETE CASCADE,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (item_id, person_id)
);
