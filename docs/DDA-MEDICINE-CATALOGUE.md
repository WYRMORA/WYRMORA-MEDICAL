# WYRMORA MEDICAL — DDA-verified medicine catalogue

## Objective

Build a Nepal-focused catalogue of 10,000+ **distinct branded product presentations** (brand + generic ingredient + strength + dosage form + manufacturer), not 10,000 invented generic names. A product count is not a clinical approval count.

## Source rules

1. DDA DAMS public Registered Drug Information is the primary source for Nepal registration claims:
   - Brand lookup: https://dams.dda.gov.np/manLogin/publicInfo1
   - API/generic lookup: https://dams.dda.gov.np/manLogin/publicInfo
2. The DDA public brand lookup was reported as showing an "Under Construction" notice during initial research. The API lookup exposes ingredient choices, but a complete result set has not yet been verified as retrievable. Therefore no bulk DDA product export is currently verified.
3. DDA's National List of Essential Medicines (NLEM), sixth revision (2021), is a source for essential generic medicines, **not** proof that a particular brand/product is registered:
   https://dda.gov.np/download/National%20List%20of%20Essential%20Medicines%20Nepal%2C%20Sixth%20revision%20%282021%29_21%20Dec.pdf
4. DDA medicine-registration guidance explains product licensing and evidence. It is not a live list of currently registered products:
   https://www.dda.gov.np/download/Medicine%20registration%20guidance.pdf
5. Do not scrape or copy a commercial drug index and relabel it as DDA-verified. Third-party data can be used only as a discovery lead, with each product independently checked against an official record before the registration status is marked registered.

## Record identity and fields

One row represents one product presentation:
- brand_name
- generic_name (active ingredient; retain combination ingredients exactly)
- strength (verbatim, including units and concentration)
- dosage_form (tablet, capsule, oral solution, suspension, injection, topical cream, etc.)
- route
- manufacturer
- country_of_origin
- registration_number (only if present in evidence)
- registration_status: registered / not_registered / unknown
- source_name, source_url, source_record_id, source_checked_at
- evidence_notes
- review_status: pending / under_review / approved / rejected

A different strength, dosage form, release type, manufacturer or combination is a separate product presentation. Do not infer a brand, strength, manufacturer, registration number, current registration validity, prescription category, price, or availability.

## Verification workflow

- Keep all imports pending by default.
- Set registration_status=registered only when the official DDA record or a DDA-issued document clearly identifies the same brand, ingredient, strength and dosage form.
- If a record is only found in NLEM, record it as an ingredient/essential-medicine lead; do not create a DDA-registered branded product from it.
- Preserve the exact evidence URL and retrieval date for every row.
- Conflicting, expired, incomplete or ambiguous evidence remains unknown and is routed for human DDA/pharmacist review.
- Clinical content (indications, dose, contraindications, interactions, adverse effects) is a separate pharmacist-reviewed layer. A registration match does not clinically validate patient-facing text.
- Do not populate price, stock, pharmacy, seller or order fields from medicine-registration evidence.

## Initial source assessment (2026-11-08)

- DDA Registered Drug Information brand page: initial research found an "Under Construction" notice; its current bulk-export availability still needs rechecking.
- DDA API/generic page: exposes a list of API choices; a complete official product-result export still needs access/technical verification.
- DDA NLEM sixth revision (2021): official PDF available; useful as a generic/essential-medicine baseline only.
- Consequently, a verified 10,000+ product count cannot honestly be claimed yet. The catalogue should grow only as traceable records are acquired and checked.

## Import template

Use `data/medicine-catalogue/dda-products-template.csv`. Leave unknown fields blank; never fill blanks by guessing. The template is not itself a verified catalogue.

## Database and implementation status

Migration `017_medicine_catalogue_products.sql` creates a normalized product-presentation table separate from the existing educational `medicines` table, plus import-batch provenance. Product records are pending by default. Migration 017 is included in the repository migration runner; its application to the production database must be verified from the production deployment/migration logs before importing production data.

The Super Admin browser console now includes a **Medicine Catalogue** tab. It supports JSON batch import (maximum 200 rows) and a pending-review queue. The backend exposes `/api/medicine-catalogue` endpoints for approved public search, staff review queue, transactional import and Super Admin approval.

## API workflow

- `GET /api/medicine-catalogue?q=<term>&limit=30` returns only records whose catalogue review status is `approved`.
- `GET /api/medicine-catalogue/review-queue?status=pending` requires a Super Admin or Editor session.
- `POST /api/medicine-catalogue/import` requires a Super Admin or Editor session and accepts at most 200 product presentations per batch. Each row must include brand, generic ingredient, strength and dosage form, and the batch must include a source name and URL.
- `PATCH /api/medicine-catalogue/:id/review` requires a Super Admin session. Approval is blocked unless the record has a DDA-hosted source URL, a registration number, a source record ID and `registration_status=registered`.

Imports are transactional, duplicate product identities are skipped, and every batch/review action is audited. Non-DDA sources cannot assert a DDA registration status. Imported rows remain pending until reviewed. This workflow verifies traceability and catalogue data only; it does not replace independent DDA confirmation, pharmacist clinical review or legal approval. The application checks that the source URL uses a DDA domain; a human reviewer must still verify that the cited DDA record actually matches the product.

Example request body for a batch (use only values copied from a traceable source; do not infer missing fields):

```json
{
  "sourceName": "Official source name",
  "sourceUrl": "https://dams.dda.gov.np/...",
  "products": [
    {
      "brandName": "Exact brand as recorded",
      "genericName": "Exact active ingredient",
      "strength": "Exact strength",
      "dosageForm": "Exact dosage form",
      "registrationStatus": "unknown",
      "evidenceNotes": "Evidence checked; pending independent review."
    }
  ]
}
```

The Super Admin import/review screen is implemented. A verified bulk DDA export and a populated 10,000+ DDA-verified product catalogue are **not** yet available. Do not claim catalogue completeness until source access, record-level evidence and independent review are complete.
