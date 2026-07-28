-- ============================================================
-- MIGRATION: Task reminders + recurrence + iCal token
--
-- Adds reminder scheduling and recurrence to tasks, plus a
-- calendar_tokens table whose single row holds the secret used
-- to authenticate the public iCal feed URL.
--
-- Recurrence is stored as discrete columns (not raw RRULE) so
-- the app can build UI controls naturally. The API route converts
-- them to an RRULE string when generating the .ics feed.
--
-- After running: reload Supabase schema cache.
-- ============================================================

-- ── Reminder + recurrence columns on tasks ────────────────────────────────────

ALTER TABLE tasks
  -- When to fire the reminder (null = no reminder)
  ADD COLUMN reminder_at          TIMESTAMPTZ,

  -- Recurrence: null frequency = one-off reminder
  ADD COLUMN recurrence_frequency TEXT
    CHECK (recurrence_frequency IN ('daily','weekly','monthly','yearly')),
  ADD COLUMN recurrence_interval  SMALLINT DEFAULT 1
    CHECK (recurrence_interval > 0),

  -- Comma-separated iCal weekday codes for weekly recurrence (e.g. 'MO,WE,FR')
  -- NULL for non-weekly rules
  ADD COLUMN recurrence_days      TEXT,

  -- Optional recurrence end; NULL = recurs indefinitely
  ADD COLUMN recurrence_end_date  DATE,

  -- Set by the UI when the user snoozes a fired reminder
  ADD COLUMN snoozed_until        TIMESTAMPTZ,

  -- Stamped by the notification Edge Function to prevent double-sends
  ADD COLUMN reminder_last_sent   TIMESTAMPTZ;

-- Index makes the Edge Function's "find due reminders" query fast
CREATE INDEX idx_tasks_reminder_at
  ON tasks (reminder_at ASC)
  WHERE reminder_at IS NOT NULL;

-- ── Calendar tokens ───────────────────────────────────────────────────────────
-- Single-row table. The token is embedded in the iCal subscription URL.
-- Regenerating the token invalidates all existing subscriptions.

CREATE TABLE calendar_tokens (
  id         SERIAL PRIMARY KEY,
  token      TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with one token so the Settings page can display the URL immediately
INSERT INTO calendar_tokens DEFAULT VALUES;
