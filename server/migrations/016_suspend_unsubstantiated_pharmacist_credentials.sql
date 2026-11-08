-- Earlier application approval recorded a review timestamp without an uploaded
-- credential document. Those profiles must re-submit evidence before clinical
-- access is enabled; never treat an application review as document verification.
UPDATE pharmacist_profiles
SET is_credential_active=FALSE,
    credential_verified_by=NULL,
    credential_verified_at=NULL
WHERE credential_asset_id IS NULL;
