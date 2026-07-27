-- Migration: add sort_order to journal_prompts
-- Run once in the Supabase SQL editor.
--
-- Even though prompts are selected randomly for daily journal entries,
-- sort_order controls display order in Settings for easier management.

ALTER TABLE journal_prompts
  ADD COLUMN IF NOT EXISTS sort_order SMALLINT DEFAULT 0;

-- Initialize sort_order within each category based on existing id order
UPDATE journal_prompts jp
SET sort_order = sub.rn
FROM (
  SELECT id,
    (ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY id) - 1) AS rn
  FROM journal_prompts
) sub
WHERE jp.id = sub.id;
