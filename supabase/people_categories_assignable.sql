-- ============================================================
-- MIGRATION: people_categories.is_assignable
--
-- Marks which categories of people can be assigned to
-- administrative items (tasks, appointments, prescriptions, etc.)
-- Default TRUE so existing categories remain assignable.
--
-- After running: reload Supabase schema cache.
-- ============================================================

ALTER TABLE people_categories
  ADD COLUMN is_assignable BOOLEAN NOT NULL DEFAULT TRUE;

-- Both existing seeded categories (Family, Friends) remain assignable
-- (already covered by DEFAULT TRUE)
