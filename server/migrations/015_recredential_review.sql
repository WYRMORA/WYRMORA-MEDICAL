-- Re-uploaded credentials must be independently reviewed before clinical access is restored.
ALTER TABLE pharmacist_profiles ALTER COLUMN credential_verified_by DROP NOT NULL;
ALTER TABLE pharmacist_profiles ALTER COLUMN credential_verified_at DROP NOT NULL;
