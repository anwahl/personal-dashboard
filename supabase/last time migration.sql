-- ============================================================
-- MIGRATION: Last Time Tracker tables (Option A schema)
--
-- last_time_media uses three optional FK columns (type/genre/status)
-- so a single item can combine filters: "Last horror game I finished"
-- = type_id=game, genre_id=horror, status_id=finished
-- At least one must be non-NULL (enforced by check constraint).
--
-- last_time_boolean — derives date from habit_entries
-- last_time_custom  — manual last_date, user-updated
-- ============================================================

-- Clean up from any previous attempt
DROP TABLE IF EXISTS last_time_media    CASCADE;
DROP TABLE IF EXISTS last_time_boolean  CASCADE;
DROP TABLE IF EXISTS last_time_custom   CASCADE;
DROP TYPE  IF EXISTS last_time_media_flag_enum CASCADE;

CREATE TABLE last_time_media (
  id         SERIAL  PRIMARY KEY,
  type_id    INTEGER REFERENCES media_types(id)    ON DELETE SET NULL,
  genre_id   INTEGER REFERENCES media_genres(id)   ON DELETE SET NULL,
  status_id  INTEGER REFERENCES media_statuses(id) ON DELETE SET NULL,
  label      TEXT    NOT NULL,
  emoji      TEXT,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE,
  CONSTRAINT last_time_media_has_filter
    CHECK (type_id IS NOT NULL OR genre_id IS NOT NULL OR status_id IS NOT NULL)
);

CREATE TABLE last_time_boolean (
  id            SERIAL  PRIMARY KEY,
  trackable_id  INTEGER NOT NULL REFERENCES daily_trackables(id) ON DELETE CASCADE,
  emoji         TEXT,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE last_time_custom (
  id            SERIAL  PRIMARY KEY,
  custom_value  TEXT    NOT NULL,
  emoji         TEXT,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     BOOLEAN  NOT NULL DEFAULT TRUE,
  last_date     DATE
);
