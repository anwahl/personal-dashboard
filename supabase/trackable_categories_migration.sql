-- Migration: trackable categories for boolean (habit) trackables
-- Run once in the Supabase SQL editor.
--
-- Adds a category layer to boolean trackables so the daily card can
-- group habits instead of showing one flat list.

CREATE TABLE trackable_categories (
  id            SERIAL PRIMARY KEY,
  category_name TEXT     NOT NULL,
  sort_order    SMALLINT DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE
);

ALTER TABLE daily_trackables
  ADD COLUMN category_id INTEGER REFERENCES trackable_categories(id) ON DELETE SET NULL;

-- Existing trackables keep category_id = NULL (shown as uncategorized on daily card).
