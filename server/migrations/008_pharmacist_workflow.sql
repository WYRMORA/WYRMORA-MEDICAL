-- Pharmacist application, credential review, and clinical medicine review workflow.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer','seller','admin','super_admin','editor','pharmacist'));

CREATE TABLE IF NOT EXISTS pharmacist_applications (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(30) NOT NULL DEFAULT '',
  qualification VARCHAR(160) NOT NULL,
  registration_number VARCHAR(100) NOT NULL,
  issuing_authority VARCHAR(160) NOT NULL DEFAULT 'Nepal Pharmacy Council',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  review_notes VARCHAR(2000),
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacist_applications_email_unique
  ON pharmacist_applications(LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS pharmacist_applications_registration_unique
  ON pharmacist_applications(LOWER(registration_number));
CREATE INDEX IF NOT EXISTS pharmacist_applications_status_idx
  ON pharmacist_applications(status, created_at);

CREATE TABLE IF NOT EXISTS pharmacist_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  qualification VARCHAR(160) NOT NULL,
  registration_number VARCHAR(100) NOT NULL UNIQUE,
  issuing_authority VARCHAR(160) NOT NULL,
  credential_verified_by BIGINT NOT NULL REFERENCES users(id),
  credential_verified_at TIMESTAMPTZ NOT NULL,
  is_credential_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicine_reviews (
  id BIGSERIAL PRIMARY KEY,
  medicine_id TEXT NOT NULL REFERENCES medicines(id),
  pharmacist_id BIGINT NOT NULL REFERENCES users(id),
  recommendation VARCHAR(24) NOT NULL CHECK (recommendation IN ('approved','changes_requested')),
  clinical_notes VARCHAR(4000) NOT NULL,
  sources TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS medicine_reviews_medicine_idx
  ON medicine_reviews(medicine_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS medicine_reviews_pharmacist_idx
  ON medicine_reviews(pharmacist_id, reviewed_at DESC);
