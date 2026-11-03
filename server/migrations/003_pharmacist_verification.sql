
ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS verified_by TEXT;

ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS pharmacist_registration TEXT;

ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'medicines_verification_status_check'
  ) THEN
    ALTER TABLE medicines
    ADD CONSTRAINT medicines_verification_status_check
    CHECK (verification_status IN ('pending', 'under_review', 'verified'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS medicines_verification_status_idx
ON medicines(verification_status);
