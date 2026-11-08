# WYRMORA MEDICAL — Nepali medicine information platform

A responsive React + Express + PostgreSQL Progressive Web App for educational medicine information in Nepali. The repository also contains marketplace APIs, but this is not a licensed pharmacy or a live medicine-commerce service.

## Included

- Nepali medicine directory, search, categories and medicine detail information.
- Medicine source, price provenance and clinical-verification status fields.
- Customer login, pharmacist application/review workflow and Super Admin console.
- Seller, product, cart, order, support and audit-log API foundations.
- PWA manifest, app icon and service worker.
- Automated server tests and frontend production build.

Medicine content is educational. The seeded catalogue is not a verified national database or medical advice. Prices remain unconfirmed unless independently checked. A qualified pharmacist must review medicine information before clinical reliance.

## Local setup

Requirements: Node.js 20+, npm 10+, Docker Desktop (or PostgreSQL 15+).

1. Copy `.env.example` to `.env` and configure PostgreSQL plus a unique `JWT_SECRET` of at least 32 characters.
2. Start local PostgreSQL: `docker compose up -d`.
3. Install API dependencies: `npm install --prefix server`.
4. Install frontend dependencies: `npm install --prefix client`.
5. Apply database migrations: `npm run migrate --prefix server`.
6. Start the API in one terminal: `npm run dev --prefix server`.
7. Start the frontend in another terminal: `npm run dev --prefix client`.
8. Open `http://localhost:5173`; API health is `http://localhost:4000/api/health`.

For a local first-time Super Admin, set a one-time `ADMIN_BOOTSTRAP_TOKEN` in the server environment, open Admin → First-time Super Admin Setup, and submit that token with the account details. After successful bootstrap, remove the token from the environment. The bootstrap endpoint refuses to create another Super Admin once one exists.

## Admin and medicine content

Sign in to Admin using a Super Admin or Editor account. Medicine create/update endpoints require the authenticated HttpOnly session cookie and an allowed staff role; there is no `MEDICINE_ADMIN_KEY` or `x-admin-key` workflow.

- `GET /api/medicines` — public catalogue; optional `?q=...&category=...`
- `POST /api/medicines` — create/update medicine; authenticated Super Admin or Editor
- `PATCH /api/medicines/:id/verification` — set pending/under-review state; clinical verification cannot be self-attested by an administrator
- `GET /api/health` — API health check

Only enter a medicine price after confirming the exact brand, ingredient, strength, dosage form, pack size, seller and current MRP/retail basis. Record the source and confirmation date. A price-source confirmation is not a clinical review.

## Pharmacist workflow

Applicants can submit their qualification and registration details. A Super Admin must independently verify credentials against the relevant official issuing authority before approving an account. Credential documents are not uploaded through this app; arrange secure document review separately. Approved pharmacists can submit clinical reviews with notes and references. A Super Admin makes the final publication decision.

The app does not automatically query the Nepal Pharmacy Council register. Never approve a credential based only on an applicant's statement.

## Clinical, legal and commercial launch gates

This is software, **not a licensed pharmacy, clinical decision-support system, medical device, or verified national medicine database**. Before public clinical reliance, have qualified reviewers check each record, local brand/strength/pack details, prescription status, warnings and Nepali translation.

Before accepting orders, payments, pharmacy listings, sponsored placement or medicine delivery in Nepal:

- Obtain current legal advice and all applicable company, pharmacy, DDA and local permissions.
- Verify partner pharmacies/suppliers and retain licence evidence.
- Implement prescription verification and licensed dispensing where required.
- Sign partner contracts and define recalls, complaints, delivery, returns and refunds.
- Obtain payment-provider merchant approval and implement server-verified payment webhooks.
- Publish privacy policy, terms, consent and retention notices; define breach response.
- Complete security review, encrypted backups and a tested restore procedure.

Payment gateway credentials and live payment processing are not included. Cart and checkout APIs are disabled by default (`ENABLE_MARKETPLACE_ORDERS=false`). Keep this flag false until legal/pharmacy approvals, verified suppliers and a server-verified merchant payment integration are in place. Do not store patient health histories until privacy, consent, retention and security controls have been reviewed.

## Production deployment

- Frontend: Vercel with Root Directory `client`.
- API/database: Render; the Blueprint installs dependencies from `server/package.json` and runs all SQL migrations before startup.
- Set `NODE_ENV=production`, `COOKIE_SECURE=true`, exact `CLIENT_ORIGIN`, and unique production secrets in the provider's secret manager.
- Use managed PostgreSQL with encrypted backups and test restore. The included free Render database is for testing only and expires after 30 days; do not store important production data there.
- Run `npm test --prefix server` and `npm run build --prefix client` before releases.

See [DEPLOY-VERCEL-RENDER.md](./DEPLOY-VERCEL-RENDER.md) and [the database backup/recovery runbook](./docs/DATABASE-BACKUP-RECOVERY.md).
