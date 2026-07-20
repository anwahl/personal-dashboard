-- ============================================================
-- MIGRATION: Last Time Tracker tables
--
-- Three source types:
--   last_time_media   — derives last date from media_status_entries
--   last_time_boolean — derives last date from habit_entries
--   last_time_custom  — manual last_date, user-updated
-- ============================================================

CREATE TYPE last_time_media_flag_enum AS ENUM ('type', 'genre', 'status');

CREATE TABLE last_time_media (
  id               SERIAL PRIMARY KEY,
  last_time_flag   last_time_media_flag_enum NOT NULL,
  flag_value       INTEGER NOT NULL,   -- FK target depends on flag:
                                        --   type   → media_types.id
                                        --   genre  → media_genres.id
                                        --   status → media_statuses.id
  emoji            TEXT,
  label            TEXT,               -- optional override; otherwise derived from referenced table
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  is_active        BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE last_time_boolean (
  id            SERIAL PRIMARY KEY,
  trackable_id  INTEGER NOT NULL REFERENCES daily_trackables(id) ON DELETE CASCADE,
  emoji         TEXT,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE last_time_custom (
  id            SERIAL PRIMARY KEY,
  custom_value  TEXT     NOT NULL,
  emoji         TEXT,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE,
  last_date     DATE
);
