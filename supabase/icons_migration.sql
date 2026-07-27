-- ============================================================
-- MIGRATION: Icons system
--
-- Creates the icons table (name, tags, svg_data) and adds
-- icon_id FK columns to all tables that previously used a
-- free-text emoji column for visual identification.
--
-- Old emoji columns are kept as nullable TEXT so existing data
-- is preserved; UI falls back to emoji if icon_id is null.
--
-- Affected tables:
--   daily_trackables, last_time_activities, last_time_media,
--   last_time_boolean, last_time_custom, daily_entries
--
-- After running: reload Supabase schema cache
--   (Settings → API → Reload Schema Cache)
-- ============================================================

-- ── Icons table ───────────────────────────────────────────────────────────────

CREATE TABLE icons (
  id         SERIAL  PRIMARY KEY,
  name       TEXT    NOT NULL,
  tags       TEXT,                   -- space-separated search keywords
  svg_data   TEXT    NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Add icon_id FK columns ────────────────────────────────────────────────────

ALTER TABLE daily_trackables
  ADD COLUMN icon_id INTEGER REFERENCES icons(id) ON DELETE SET NULL;

ALTER TABLE last_time_activities
  ADD COLUMN icon_id INTEGER REFERENCES icons(id) ON DELETE SET NULL;

ALTER TABLE last_time_media
  ADD COLUMN icon_id INTEGER REFERENCES icons(id) ON DELETE SET NULL;

ALTER TABLE last_time_boolean
  ADD COLUMN icon_id INTEGER REFERENCES icons(id) ON DELETE SET NULL;

ALTER TABLE last_time_custom
  ADD COLUMN icon_id INTEGER REFERENCES icons(id) ON DELETE SET NULL;

-- daily_entries: icon_id replaces daily_emoji conceptually.
-- daily_emoji column is kept for backward compat; icon_id takes precedence in UI.
-- The legacy icon TEXT column is left untouched (old Obsidian artifact, not used).
ALTER TABLE daily_entries
  ADD COLUMN icon_id INTEGER REFERENCES icons(id) ON DELETE SET NULL;

-- ── Recreate last_time_latest view to include icon_id ─────────────────────────

DROP VIEW IF EXISTS last_time_latest;

CREATE VIEW last_time_latest AS
SELECT
  a.id,
  a.activity_name,
  a.emoji,
  a.icon_id,
  a.sort_order,
  a.is_active,
  MAX(l.logged_date) AS last_logged_date
FROM last_time_activities a
LEFT JOIN last_time_logs l ON l.activity_id = a.id
GROUP BY a.id, a.activity_name, a.emoji, a.icon_id, a.sort_order, a.is_active;
