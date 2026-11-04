# WYRMORA MEDICAL — Database Backup & Recovery Runbook

This runbook is deliberately operational: it does not connect to, modify, or export the production database by itself. A backup is not complete until the dump exists in protected storage and a restore has been tested against a separate, empty database.

## 1. Check the actual Render database plan first

1. Open the Render Dashboard and select the PostgreSQL database used by `wyrmora-medical-api`.
2. On its **Info** page, confirm the database name, region, status, and compute plan. Do not infer the live plan from `render.yaml`; an existing manually-created database can differ from the Blueprint.
3. If it is on Render's **Free** plan, treat it as temporary/test infrastructure:
   - Render Free Postgres expires 30 days after creation and has no managed backups or point-in-time recovery.
   - Before using it for production or storing important user/order data, move to a suitable paid managed database plan and confirm backup/recovery features in the dashboard.
   - Do not wait until the expiry warning. Export the data first before any upgrade, replacement, or deletion.
4. Paid Render Postgres supports managed point-in-time recovery; the recovery window depends on the workspace plan. Check the current Render Recovery page for the exact window.

Official references:
- https://render.com/docs/free
- https://render.com/docs/postgresql-backups

## 2. Make a manual logical backup (Windows PowerShell)

Use this for an immediate export when the database is reachable. It requires PostgreSQL client tools (`pg_dump`) installed on your computer and the database's **External Database URL** from Render.

1. In Render Dashboard → PostgreSQL database → **Info**, copy the **External Database URL**. Keep it private. Never paste it into GitHub, source code, screenshots, chat, or a shared document.
2. Open PowerShell on your own computer in a private folder that is not inside the Git repository.
3. Run the following commands. PowerShell prompts for the URL as a secure input; it is not echoed as normal text.

```powershell
$secureUrl = Read-Host "Paste the Render External Database URL" -AsSecureString
$env:DATABASE_URL = [System.Net.NetworkCredential]::new("", $secureUrl).Password
$backupFile = Join-Path (Get-Location) ("wyrmora-medical-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".dump")

pg_dump --dbname="$env:DATABASE_URL" --format=custom --no-owner --no-acl --file="$backupFile"

if ($LASTEXITCODE -ne 0) {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  throw "Backup failed. Do not treat this as a valid backup."
}

Get-Item $backupFile | Select-Object Name, Length, LastWriteTime
Get-FileHash $backupFile -Algorithm SHA256
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Variable secureUrl
```

4. Confirm the dump file exists and has a non-zero size. Keep the SHA-256 hash with the backup record.
5. Encrypt the backup before storing or transferring it. Keep at least one copy in a separate, access-controlled location (not only on the same computer). Restrict access because the database may contain personal information.
6. Repeat on a schedule appropriate to the data (at minimum daily once real users/orders exist), and before major migrations or risky deployments.

If `pg_dump` is not recognized, install PostgreSQL command-line tools matching the server's major PostgreSQL version, reopen PowerShell, and retry. Do not switch to copying the live database directory.

## 3. Verify the backup by restoring to a separate database

A successful export command alone does not prove recoverability. Test using a separate local PostgreSQL instance/database or a newly provisioned temporary database.

For a local PostgreSQL test database named `wyrmora_restore_test`:

```powershell
createdb wyrmora_restore_test
pg_restore --dbname="postgresql://LOCAL_USER:LOCAL_PASSWORD@localhost:5432/wyrmora_restore_test" --no-owner --no-acl --exit-on-error "PATH_TO_BACKUP.dump"
```

Replace the local placeholders only on your own machine. Never use the production URL as the restore target. Do not add `--clean` or `--create` for this test. Inspect the restored schema and expected tables/record counts, then run the application tests against this isolated database if a test configuration is available. Remove the temporary test database only after verification.

## 4. Recovery principles

- Prefer Render point-in-time recovery for a paid Render database when recovering from accidental changes; Render creates a separate recovery instance. Validate it before changing the API's `DATABASE_URL`.
- For a logical dump, restore into a new, empty database first. Verify data before any production cutover.
- Never test restore commands against the live production database.
- Never delete the old database until the recovered database is validated and all services are confirmed to use the replacement.
- Record backup timestamp, database identifier, file size, SHA-256, storage location, and the last successful restore-test date. Do not record database URLs or passwords.

## 5. Current project limitation

The repository's `render.yaml` is a free/test Blueprint and explicitly defines a Free Postgres database. This does not prove that the already-existing Render database is Free; verify its actual plan in the dashboard. The repository does not currently automate backups or upload database dumps to off-site storage. Do not claim that automated backups are active until they are configured and verified at the provider.

**Launch gate:** do not treat WYRMORA MEDICAL as production-ready for real patient accounts, orders, or other important data until the live database plan, backup schedule, protected off-site retention, and a successful restore test are confirmed.
