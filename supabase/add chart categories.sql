-- Chart categories: drive tab grouping on the Analytics page.
-- User-managed via Settings → Charts. Analytics page auto-tabs by category.

CREATE TABLE chart_categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT     NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active  BOOLEAN  NOT NULL DEFAULT TRUE
);

ALTER TABLE chart_definitions
  ADD COLUMN category_id INTEGER REFERENCES chart_categories(id) ON DELETE SET NULL;

-- Seed initial categories
INSERT INTO chart_categories (name, sort_order) VALUES
  ('Health', 1),
  ('Sleep',  2),
  ('Other',  99);

-- Default all existing charts to 'Health'
UPDATE chart_definitions
SET category_id = (SELECT id FROM chart_categories WHERE name = 'Health' LIMIT 1);
