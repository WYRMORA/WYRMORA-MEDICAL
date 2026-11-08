# Automated off-site PostgreSQL backups

The GitHub Actions workflow `.github/workflows/database-backup.yml` is scheduled daily at 18:15 UTC (23:45 Nepal time) and can also be started manually from Actions.

## Required repository secrets

Configure these under GitHub → Settings → Secrets and variables → Actions → Repository secrets:

- `WYRMORA_DATABASE_URL`: PostgreSQL connection URL with SSL enabled where required.
- `BACKUP_S3_BUCKET`: dedicated private backup bucket (do not reuse a public website bucket).
- `BACKUP_S3_ENDPOINT`: S3-compatible endpoint, e.g. the provider's account endpoint.
- `BACKUP_S3_ACCESS_KEY_ID`: restricted key that can only write/list the backup prefix as required.
- `BACKUP_S3_SECRET_ACCESS_KEY`: corresponding secret.

Until all five secrets exist, the scheduled workflow deliberately skips the backup and reports a GitHub Actions notice. This means backups are NOT active merely because this workflow is merged.

## Bucket safeguards required before activation

1. Keep the bucket private and block public access.
2. Enable provider-side encryption at rest and TLS-only access.
3. Configure a lifecycle rule for `database-backups/` (suggested initial retention: 30 daily backups); align retention with privacy/legal requirements.
4. Use a dedicated least-privilege key and rotate it.
5. Keep the backup bucket separate from application uploads where possible.

The workflow creates a PostgreSQL custom-format dump, checks that it is non-empty, prints its SHA-256 checksum, restores it into an isolated PostgreSQL 16 service container with `pg_restore --exit-on-error`, uploads it to `database-backups/` only after restore succeeds, and deletes its temporary local copy. It does not print the database URL or access keys.

## Verification

- Open Actions → WYRMORA database backup and confirm a completed run.
- Confirm the object exists in the private bucket and record its SHA-256 checksum.
- Download a copy to a protected environment and run:
  `npm run backup:verify --prefix server -- <backup-file>`
- Perform a periodic application-level restore test on an isolated database. A successful upload alone is not proof of recoverability.

Do not configure production secrets in chat or commit them to the repository. The workflow does not change production data, schema, or payment settings.
