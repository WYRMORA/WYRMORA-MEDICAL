-- 017: source-traceable Nepal medicine product catalogue.
-- A catalogue product is distinct from a generic medicine information article.
-- Never set DDA registration_status='registered' without an official DDA record.

CREATE TABLE IF NOT EXISTS medicine_catalogue_products (
  id BIGSERIAL PRIMARY KEY,
  brand_name TEXT NOT NULL,
  generic_name TEXT NOT NULL,
  strength TEXT NOT NULL,
  dosage_form TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT '',
  manufacturer TEXT NOT NULL DEFAULT '',
  country_of_origin TEXT NOT NULL DEFAULT '',
  registration_number TEXT,
  registration_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (registration_status IN ('registered','not_registered','unknown')),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_record_id TEXT,
  source_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_notes TEXT NOT NULL DEFAULT '',
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','under_review','approved','rejected')),
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (length(trim(brand_name)) > 0),
  CHECK (length(trim(generic_name)) > 0),
  CHECK (length(trim(strength)) > 0),
  CHECK (length(trim(dosage_form)) > 0),
  CHECK (length(trim(source_name)) > 0),
  CHECK (source_url ~* '^https?://')
);

-- Prevent duplicate imports of the same branded presentation while allowing
-- the same brand to exist in different strengths, forms or manufacturers.
CREATE UNIQUE INDEX IF NOT EXISTS medicine_catalogue_product_identity_idx
ON medicine_catalogue_products (
  lower(brand_name),
  lower(generic_name),
  lower(strength),
  lower(dosage_form),
  lower(manufacturer)
);

CREATE INDEX IF NOT EXISTS medicine_catalogue_generic_idx
ON medicine_catalogue_products USING gin (to_tsvector('simple', generic_name));

CREATE INDEX IF NOT EXISTS medicine_catalogue_brand_idx
ON medicine_catalogue_products USING gin (to_tsvector('simple', brand_name));

CREATE INDEX IF NOT EXISTS medicine_catalogue_review_status_idx
ON medicine_catalogue_products(review_status, registration_status);

CREATE TABLE IF NOT EXISTS medicine_catalogue_import_batches (
  id BIGSERIAL PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_published_at DATE,
  imported_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  records_seen INTEGER NOT NULL DEFAULT 0 CHECK (records_seen >= 0),
  records_inserted INTEGER NOT NULL DEFAULT 0 CHECK (records_inserted >= 0),
  records_updated INTEGER NOT NULL DEFAULT 0 CHECK (records_updated >= 0),
  records_rejected INTEGER NOT NULL DEFAULT 0 CHECK (records_rejected >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_url ~* '^https?://')
);

