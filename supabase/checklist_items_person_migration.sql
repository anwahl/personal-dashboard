-- Migration: make checklist_items per-person
-- Run once in the Supabase SQL editor.
--
-- Previously checklist_items were a shared template;
-- person-level checked state was tracked in checklist_item_states.
-- This migration adds person_id to checklist_items so items are fully
-- per-person (mirroring item_list_entries), making checklist_item_states
-- redundant.

-- 1. Add person_id column (nullable for now during backfill)
ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES people(id) ON DELETE CASCADE;

-- 2. Backfill: if an item has checklist_item_states rows, assign it to
--    the first person who has a state record for it.
UPDATE checklist_items ci
SET person_id = (
  SELECT cis.person_id
  FROM   checklist_item_states cis
  WHERE  cis.item_id = ci.id
  ORDER  BY cis.person_id
  LIMIT  1
)
WHERE  ci.person_id IS NULL
AND    EXISTS (SELECT 1 FROM checklist_item_states WHERE item_id = ci.id);

-- 3. For items still without a person_id (no state records), assign to
--    the first person linked to that checklist.
UPDATE checklist_items ci
SET person_id = (
  SELECT pcl.person_id
  FROM   person_checklist_links pcl
  WHERE  pcl.checklist_id = ci.checklist_id
  ORDER  BY pcl.person_id
  LIMIT  1
)
WHERE ci.person_id IS NULL;

-- 4. Delete any items that still have no person_id
--    (orphaned items with no linked persons).
DELETE FROM checklist_items WHERE person_id IS NULL;

-- 5. Enforce NOT NULL now that backfill is complete
ALTER TABLE checklist_items ALTER COLUMN person_id SET NOT NULL;

-- 6. Drop checklist_item_states — no longer needed; is_checked on the
--    per-person checklist_items row is the source of truth.
DROP TABLE IF EXISTS checklist_item_states;
