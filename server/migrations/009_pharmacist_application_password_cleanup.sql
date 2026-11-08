-- Rejected applications may be resubmitted; approved/rejected applications no longer retain a duplicate password hash.
ALTER TABLE pharmacist_applications ALTER COLUMN password_hash DROP NOT NULL;

DROP INDEX IF EXISTS pharmacist_applications_email_unique;
DROP INDEX IF EXISTS pharmacist_applications_registration_unique;

CREATE UNIQUE INDEX IF NOT EXISTS pharmacist_applications_email_active_unique
  ON pharmacist_applications(LOWER(email))
  WHERE status <> 'rejected';

CREATE UNIQUE INDEX IF NOT EXISTS pharmacist_applications_registration_active_unique
  ON pharmacist_applications(LOWER(registration_number))
  WHERE status <> 'rejected';

UPDATE pharmacist_applications
SET password_hash = NULL
WHERE status IN ('approved','rejected') AND password_hash IS NOT NULL;
