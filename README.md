# WYRMORA MEDICAL — Nepali medicine information platform

A responsive, installable Progressive Web App (PWA) for patients to explore medicine information in Nepali, backed by a React + Express + PostgreSQL application. This project extends the existing WYRMORA React/Node/PostgreSQL foundation.

## What is included

- Patient-facing medicine directory with Nepali explanations, categories and search.
- Medicine detail pages: common uses, situations, dosage forms, precautions, possible side effects and prescription-status note.
- Transparent price display: unknown prices remain “मूल्य पुष्टि हुँदैछ”; no invented retail prices are seeded.
- Price/source fields and update timestamps in PostgreSQL.
- Medicine content admin panel protected by a server-side `MEDICINE_ADMIN_KEY`.
- Responsive desktop/mobile interface and PWA manifest/icon for installable app experience.
- Six initial educational medicine records: paracetamol, cetirizine, ibuprofen, ORS, omeprazole and amoxicillin.
- Existing WYRMORA marketplace backend, auth, seller/buyer/admin routes, cart/orders and security middleware retained.

## Local setup (Windows / macOS / Linux)

Requirements: Node.js 20+, npm 10+, Docker Desktop (or PostgreSQL 15+).

1. Extract the ZIP. Open a terminal in `WYRMORA-fullstack`.
2. Copy `.env.example` to `.env`.
3. Set unique random secrets in `.env`:
   - `JWT_SECRET`: at least 32 random characters.
   - `MEDICINE_ADMIN_KEY`: a separate long random secret. Never commit this value or expose it in frontend code.
4. Start PostgreSQL: `docker compose up -d`
5. Install dependencies: `npm install`
6. Apply schema and initial medicine catalogue: `npm run db:migrate`
7. Start app and API: `npm run dev`
8. Open `http://localhost:5173`; API health is `http://localhost:4000/api/health`.

The medicine catalogue can display the six bundled sample records without needing an admin login. The API reads the PostgreSQL catalogue after migration; the frontend contains a local read-only fallback for first preview if the API/database is unavailable.

## Add or update medicine information

Open the app and select **Admin**. Enter the `MEDICINE_ADMIN_KEY` from the server environment and complete the medicine form. The API validates fields and stores the record in PostgreSQL. Price should only be entered after confirming the exact brand, strength, pack size, seller and current MRP/retail price. Put the source and confirmation context in “मूल्य स्रोत/प्याकेट विवरण”. The UI badge only indicates price-source confirmation; it is not a clinical review badge. Do not mark medicine content as clinically reviewed without qualified review.

API:

- `GET /api/medicines` — public catalogue; optional `?q=...&category=...`
- `POST /api/medicines` — create/update medicine; requires `x-admin-key` header
- `GET /api/health` — health check

Example POST body:

```json
{
  "id": "example-medicine-500",
  "name": "Example Medicine",
  "nepali": "उदाहरण औषधि",
  "category": "उदाहरण",
  "forms": "ट्याब्लेट",
  "use": "Verified, plain-language use description.",
  "symptoms": "Relevant approved indication summary.",
  "caution": "Important contraindications and precautions.",
  "side": "Known possible adverse effects.",
  "prescription": "Prescription status confirmed against local requirements",
  "price": null,
  "priceNote": "फार्मेसीबाट मूल्य पुष्टि हुन बाँकी",
  "source": "Named authoritative source, version/date and reviewer"
}
```

## Important clinical, legal and commercial launch gates

This is a software product and starter catalogue, **not a licensed pharmacy, clinical decision support system, medical device, or verified national medicine database**. Seed entries are general educational summaries and intentionally have no prices or verification badge. A qualified pharmacist/clinician must review each medicine record, local brand/strength/pack details, prescription status, warnings and Nepali translation before public clinical reliance. Add citations, review identity and review date to each record as part of the production content workflow.

Before accepting orders, payments, pharmacy listings, sponsored placement or medicine delivery in Nepal:

- Obtain legal advice and required business/pharmacy permissions; verify each participating pharmacy and supplier.
- Confirm the current Department of Drug Administration (DDA) requirements and applicable Drug Act/Rules, advertising, prescription, e-commerce, consumer protection, tax and privacy requirements.
- Do not offer prescription-only medicines for direct sale without the legally required prescription review and licensed dispensing workflow.
- Do not recommend a dose or tell users to start/stop/change treatment. The patient UI deliberately avoids personalised dosage instructions.
- Add pharmacy inventory integration, pharmacist review workflow, audit trail, complaint/recall process, order fulfilment, returns/refunds and customer support before commercial sales.
- Obtain payment-provider merchant approval and implement server-verified payment webhooks before taking money. No payment credentials or live gateway are included.
- Configure HTTPS, production secrets, managed PostgreSQL, backups, monitoring, privacy policy, terms, incident response and security review.

## Existing marketplace foundation

The previous WYRMORA marketplace modules remain in the source tree (buyer/seller/admin roles, product, cart, order, review and support APIs). The current public UI is the WYRMORA Medical patient experience. Marketplace/payment modules are not presented as a live pharmacy checkout and must not be used to sell medicines until the above legal and operational gates are completed.

## Production deployment checklist

- Deploy the client and API behind HTTPS; set `COOKIE_SECURE=true` and exact `CLIENT_ORIGIN`.
- Set strong unique secrets in the deployment secret manager; rotate them if exposed.
- Provision managed PostgreSQL, run migrations as a release step, enable encrypted backups and test restore. Follow [the database backup and recovery runbook](./docs/DATABASE-BACKUP-RECOVERY.md).
- Restrict admin API access, use MFA/SSO or a hardened admin identity system, rate-limit writes and add audit logs.
- Add clinical review metadata, price provenance and a repeatable review/expiry process.
- Run `npm test`, `npm run build`, dependency audit, database-backed integration tests, accessibility checks and penetration testing.

## Commands

- `npm run dev` — API + Vite development servers
- `npm run build` — production frontend build
- `npm start` — API server
- `npm run db:migrate` — database migrations
- `npm test` — server tests

## Vercel + Render deployment

See [DEPLOY-VERCEL-RENDER.md](./DEPLOY-VERCEL-RENDER.md), `render.yaml`, and `client/vercel.json`.
