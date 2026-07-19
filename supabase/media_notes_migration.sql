-- ── media_notes ──────────────────────────────────────────────────────────────
-- Run this in your Supabase SQL editor to add media note-keeping.
-- Matches the "Additional Notes" pattern from Obsidian:
-- each media entry gets a timestamped list of markdown-friendly notes.

CREATE TABLE media_notes (
  id             SERIAL PRIMARY KEY,
  media_entry_id INTEGER NOT NULL REFERENCES media_entries(id) ON DELETE CASCADE,
  note_date      DATE    NOT NULL DEFAULT CURRENT_DATE,
  body_md        TEXT    NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_notes_entry ON media_notes (media_entry_id, note_date DESC);

CREATE TRIGGER media_notes_updated_at
  BEFORE UPDATE ON media_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
