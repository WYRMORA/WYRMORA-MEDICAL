# PostgreSQL backup and restore verification

Run on a trusted server with PostgreSQL client tools (`pg_dump`, `pg_restore`) installed and a DATABASE_URL account that can read the application database and create/drop a temporary database for restore verification.

## Create a backup

```sh
npm run backup --prefix server
```

Set `BACKUP_DIR` to a protected mounted volume. Backups contain customer, order and credential-related data: encrypt the volume, restrict access, apply retention, and never commit dump files.

## Verify a backup by restoring it

```sh
npm run backup:verify --prefix server -- /secure/backups/wyrmora-example.dump
```

The verifier creates a uniquely named temporary database on the same PostgreSQL server, restores the archive with `pg_restore --exit-on-error`, checks that public tables exist, and drops the temporary database in a finally block. Run this only with an account permitted to create/drop databases. Do not point DATABASE_URL at production unless that account is approved for this operation; the application database itself is not modified, but a temporary sibling database is created and removed.

## Recovery objectives

Set and document RPO/RTO with the operator. Keep encrypted off-site copies and test restore on a schedule. A successful archive creation is not proof of recoverability; record restore-verification output and periodically test application-level consistency after restore.
