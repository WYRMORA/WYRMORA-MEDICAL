-- Keep test listings and test orders explicitly distinguishable from commercial activity.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS products_test_public_idx
  ON products(is_test, status, is_active);

INSERT INTO categories(name, slug, is_active)
VALUES ('TEST ONLY', 'test-only', TRUE)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = TRUE;

-- Existing seller profiles remain pending unless already verified.
-- No seller is automatically verified by this migration.
