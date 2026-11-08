# WYRMORA MEDICAL — Vercel + Render deployment

This repository uses Vercel for the Vite frontend, Render for the Express API, and Render PostgreSQL for the database.

## Safety and launch status

The public site is an educational medicine information directory, not a licensed pharmacy or a clinically verified national medicine database. Do not activate medicine sales, prescription fulfilment, pharmacy promotion or payments until the applicable Nepal permissions, licensed pharmacy/supplier workflows and merchant approval are in place.

The current Render Blueprint uses the free web/database tier for testing. Free PostgreSQL expires after 30 days and is not suitable for business-critical production data. Review current provider costs and database expiry before relying on it.

## Repository layout

The repository root contains `render.yaml`, `package.json`, `client/` and `server/`. The Vercel project must use `client` as its Root Directory.

## Render API and database

1. Connect the GitHub repository to Render.
2. Review the `wyrmora-medical-api` service and `wyrmora-medical-db` database Blueprint settings and costs before applying.
3. The API build command must install the backend package from `server/package.json` and run all SQL migrations:
   `npm install --prefix server && npm run migrate --prefix server`.
4. The start command is `npm start --prefix server`.
5. Keep `NODE_ENV=production`, `COOKIE_SECURE=true`, the exact production `CLIENT_ORIGIN`, and a unique `JWT_SECRET` of at least 32 characters.
6. Test `https://wyrmora-medical-api.onrender.com/api/health`; expected JSON is `{"status":"ok","service":"wyrmora-api"}`.

The initial Super Admin bootstrap uses `ADMIN_BOOTSTRAP_TOKEN` only once. After a Super Admin account has been created, remove that token from the Render environment. The API will refuse bootstrap if a Super Admin already exists. Never share environment secrets in chat, screenshots or GitHub.

If Render assigns a different API hostname, update the destination in `client/vercel.json` before deploying the frontend.

## Vercel frontend

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `client`.
3. Framework: Vite; Build command: `npm run build`; Output directory: `dist`; Install command: `npm install`.
4. Deploy. `client/vercel.json` proxies `/api/*` to the Render API so browser requests remain same-origin.

If the production domain differs from `https://wyrmora-medical.vercel.app`, update Render's `CLIENT_ORIGIN` to the exact origin (no trailing slash) and redeploy the API.

## Verification

- Open the Vercel production URL and search for Paracetamol.
- Test `https://YOUR-VERCEL-DOMAIN/api/health`.
- Sign in to Admin using the existing Super Admin account.
- Test pharmacist application, credential review and clinical-review workflow with non-production/test records only.
- Check Render logs for migration, database and CORS/origin errors. A page rendering from a local fallback does not prove that the database is connected.

Medicine create/update endpoints use the authenticated Super Admin/Editor session cookie; there is no shared `MEDICINE_ADMIN_KEY` or `x-admin-key` workflow.

## Operations and remaining launch requirements

- Keep secrets only in Render's environment settings and rotate them if exposed.
- Configure [scheduled off-site backups](./docs/AUTOMATED-BACKUPS.md), enforce bucket encryption/retention, and perform a restore test before storing business-critical data.
- Publish privacy policy, terms, consent and retention notices before collecting personal information beyond the minimum account data.
- Complete security review, monitoring and incident-response procedures.
- Obtain qualified pharmacist review for medicine content and verify pharmacist credentials against the relevant official issuing authority. The app does not automate Nepal Pharmacy Council registry checks.
- Obtain required legal/pharmacy permissions and merchant approval before any medicine sales, payment or fulfilment.

This codebase cannot register a pharmacy, grant DDA approval, verify live medicine prices, configure a payment merchant account or create external provider accounts on the user's behalf.
