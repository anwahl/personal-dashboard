-- Migration: weekly journal categories, prompts, and responses
-- Run once in the Supabase SQL editor.
--
-- Adds a category+prompt system to weekly entries, mirroring the daily
-- journal structure. The existing weekly_entries flat columns (reflection,
-- wins, etc.) are kept as-is for any legacy data.

-- ── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE weekly_journal_categories (
  id            SERIAL PRIMARY KEY,
  category_name TEXT     NOT NULL,
  sort_order    SMALLINT DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE weekly_journal_prompts (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER  NOT NULL REFERENCES weekly_journal_categories(id) ON DELETE CASCADE,
  prompt_text TEXT     NOT NULL,
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE weekly_journal_prompt_responses (
  id              SERIAL PRIMARY KEY,
  weekly_entry_id INTEGER NOT NULL REFERENCES weekly_entries(id) ON DELETE CASCADE,
  prompt_id       INTEGER NOT NULL REFERENCES weekly_journal_prompts(id) ON DELETE CASCADE,
  response_text   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (weekly_entry_id, prompt_id)
);

CREATE TRIGGER weekly_journal_responses_updated_at
  BEFORE UPDATE ON weekly_journal_prompt_responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Seed default categories ───────────────────────────────────────────────────

INSERT INTO weekly_journal_categories (category_name, sort_order) VALUES
  ('Highlights',               0),
  ('Challenges',               1),
  ('Gratitude',                2),
  ('Intentions for Next Week', 3);

-- ── Seed default prompts ──────────────────────────────────────────────────────

INSERT INTO weekly_journal_prompts (category_id, prompt_text, sort_order)
SELECT c.id, p.prompt_text, p.sort_order
FROM (VALUES
  ('Highlights',               'What went well this week?',                    0),
  ('Highlights',               'What am I proud of this week?',                1),
  ('Challenges',               'What was difficult this week?',                0),
  ('Challenges',               'What would I do differently?',                 1),
  ('Gratitude',                'What am I grateful for this week?',            0),
  ('Gratitude',                'Who helped me or made a difference this week?', 1),
  ('Intentions for Next Week', 'What is my main focus for next week?',         0),
  ('Intentions for Next Week', 'What do I want to let go of going into next week?', 1)
) AS p(cat_name, prompt_text, sort_order)
JOIN weekly_journal_categories c ON c.category_name = p.cat_name;
