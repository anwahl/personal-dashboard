-- ============================================================
-- MIGRATION: Media status refactor
--
-- Changes:
--   media_statuses  → add status_type ENUM column
--   media_status_type_links (new) → type-specific status applicability
--   media_status_entries    (new) → status history log per entry
--   media_entries           → drop status_id, started_date, finished_date
-- ============================================================

-- 1. Enum
CREATE TYPE media_status_type_enum AS ENUM ('planned', 'in_progress', 'completed', 'abandoned');

-- 2. Add status_type to media_statuses
ALTER TABLE media_statuses
  ADD COLUMN status_type media_status_type_enum NOT NULL DEFAULT 'in_progress';

UPDATE media_statuses SET status_type = 'in_progress' WHERE status_name IN ('watching', 'reading', 'playing', 'paused');
UPDATE media_statuses SET status_type = 'completed'   WHERE status_name = 'finished';
UPDATE media_statuses SET status_type = 'abandoned'   WHERE status_name = 'dropped';
UPDATE media_statuses SET status_type = 'planned'     WHERE status_name = 'want-to';

-- 3. Type-specific status links
--    Only type-specific in-progress statuses need links; universal ones (finished, dropped, etc.) need none.
--    If the ILIKE matches nothing, the INSERT silently inserts zero rows — that's fine.

CREATE TABLE media_status_type_links (
  id             SERIAL PRIMARY KEY,
  status_id      INTEGER NOT NULL REFERENCES media_statuses(id) ON DELETE CASCADE,
  media_type_id  INTEGER NOT NULL REFERENCES media_types(id)    ON DELETE CASCADE,
  UNIQUE (status_id, media_type_id)
);

-- 'watching' → video-adjacent types
INSERT INTO media_status_type_links (status_id, media_type_id)
SELECT ms.id, mt.id
FROM media_statuses ms
CROSS JOIN media_types mt
WHERE ms.status_name = 'watching'
  AND mt.type_name ILIKE ANY(ARRAY['%series%','%movie%','%film%','%show%','%documentary%','%anime%','%video%']);

-- 'reading' → text-adjacent types
INSERT INTO media_status_type_links (status_id, media_type_id)
SELECT ms.id, mt.id
FROM media_statuses ms
CROSS JOIN media_types mt
WHERE ms.status_name = 'reading'
  AND mt.type_name ILIKE ANY(ARRAY['%book%','%comic%','%manga%','%novel%','%graphic%']);

-- 'playing' → game types
INSERT INTO media_status_type_links (status_id, media_type_id)
SELECT ms.id, mt.id
FROM media_statuses ms
CROSS JOIN media_types mt
WHERE ms.status_name = 'playing'
  AND mt.type_name ILIKE ANY(ARRAY['%game%']);

-- 4. Status history table
CREATE TABLE media_status_entries (
  id              SERIAL PRIMARY KEY,
  media_entry_id  INTEGER NOT NULL REFERENCES media_entries(id) ON DELETE CASCADE,
  status_id       INTEGER NOT NULL REFERENCES media_statuses(id),
  status_date     DATE    NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX media_status_entries_entry_idx ON media_status_entries(media_entry_id, status_date DESC);

-- 5. Migrate existing status data
INSERT INTO media_status_entries (media_entry_id, status_id, status_date)
SELECT
  me.id,
  me.status_id,
  COALESCE(me.finished_date::date, me.started_date::date, me.created_at::date)
FROM media_entries me
WHERE me.status_id IS NOT NULL;

-- 6. Drop old columns
ALTER TABLE media_entries
  DROP COLUMN IF EXISTS status_id,
  DROP COLUMN IF EXISTS started_date,
  DROP COLUMN IF EXISTS finished_date;
