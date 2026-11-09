import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const router = Router();
const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

const productSchema = z.object({
  brandName: z.string().trim().min(1).max(200),
  genericName: z.string().trim().min(1).max(300),
  strength: z.string().trim().min(1).max(120),
  dosageForm: z.string().trim().min(1).max(120),
  route: z.string().trim().max(120).optional().default(''),
  manufacturer: z.string().trim().max(240).optional().default(''),
  countryOfOrigin: z.string().trim().max(120).optional().default(''),
  registrationNumber: z.string().trim().max(120).nullable().optional(),
  registrationStatus: z.enum(['registered', 'not_registered', 'unknown']).optional().default('unknown'),
  sourceRecordId: z.string().trim().max(200).nullable().optional(),
  sourceCheckedAt: z.string().datetime({ offset: true }).optional(),
  evidenceNotes: z.string().trim().max(2000).optional().default('')
});

const importSchema = z.object({
  sourceName: z.string().trim().min(2).max(160),
  sourceUrl: z.string().url().max(1000),
  sourcePublishedAt: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional().default(''),
  products: z.array(productSchema).min(1).max(200)
});

const reviewSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected']),
  notes: z.string().trim().max(2000).optional().default('')
});

function isOfficialDdaUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'dda.gov.np' || host.endsWith('.dda.gov.np');
  } catch {
    return false;
  }
}

function mapProduct(row) {
  return {
    id: row.id,
    brandName: row.brand_name,
    genericName: row.generic_name,
    strength: row.strength,
    dosageForm: row.dosage_form,
    route: row.route,
    manufacturer: row.manufacturer,
    countryOfOrigin: row.country_of_origin,
    registrationNumber: row.registration_number,
    registrationStatus: row.registration_status,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceRecordId: row.source_record_id,
    sourceCheckedAt: row.source_checked_at,
    evidenceNotes: row.evidence_notes,
    reviewStatus: row.review_status,
    reviewedAt: row.reviewed_at
  };
}

// Public search exposes only catalogue records explicitly approved by a reviewer.
// Pending and under-review records are never returned to public clients.
router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 120);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
    const { rows } = await pool.query(
      `SELECT * FROM medicine_catalogue_products
       WHERE review_status = 'approved'
         AND ($1 = '' OR brand_name ILIKE '%' || $1 || '%' OR generic_name ILIKE '%' || $1 || '%')
       ORDER BY brand_name, strength
       LIMIT $2`,
      [q, limit]
    );
    res.json({ items: rows.map(mapProduct) });
  } catch (error) {
    next(error);
  }
});

// Staff queue: Super Admin and Editors can inspect pending and reviewed records.
router.get('/review-queue', requireAuth, allowRoles('super_admin', 'editor'), async (req, res, next) => {
  try {
    const status = ['pending', 'under_review', 'approved', 'rejected'].includes(String(req.query.status))
      ? String(req.query.status) : 'pending';
    const { rows } = await pool.query(
      'SELECT * FROM medicine_catalogue_products WHERE review_status=$1 ORDER BY created_at ASC LIMIT 200',
      [status]
    );
    res.json({ items: rows.map(mapProduct) });
  } catch (error) {
    next(error);
  }
});

// Import is deliberately limited to staff and 200 records per request.
// All imported records remain pending; only traceable DDA evidence can support
// a registered claim. This endpoint never creates stock, prices or orders.
router.post('/import', requireAuth, allowRoles('super_admin', 'editor'), writeLimit, async (req, res, next) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Catalogue import details are invalid.', details: parsed.error.flatten() });
  }

  const data = parsed.data;
  const sourceIsDda = isOfficialDdaUrl(data.sourceUrl);
  for (const product of data.products) {
    if (product.registrationStatus === 'registered' &&
        (!sourceIsDda || !product.registrationNumber || !product.sourceRecordId)) {
      return res.status(400).json({
        error: 'A registered claim requires an official DDA source URL, registration number and source record ID.'
      });
    }
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const batch = await client.query(
      `INSERT INTO medicine_catalogue_import_batches
       (source_name, source_url, source_published_at, imported_by, records_seen, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [data.sourceName, data.sourceUrl, data.sourcePublishedAt || null, req.user.id, data.products.length, data.notes]
    );

    let inserted = 0;
    for (const product of data.products) {
      const result = await client.query(
        `INSERT INTO medicine_catalogue_products (
          brand_name, generic_name, strength, dosage_form, route, manufacturer,
          country_of_origin, registration_number, registration_status,
          source_name, source_url, source_record_id, source_checked_at, evidence_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13::timestamptz,NOW()),$14)
        ON CONFLICT DO NOTHING RETURNING id`,
        [
          product.brandName, product.genericName, product.strength, product.dosageForm,
          product.route, product.manufacturer, product.countryOfOrigin,
          product.registrationNumber || null,
          product.registrationStatus === 'registered' && sourceIsDda ? 'registered' : product.registrationStatus === 'not_registered' && sourceIsDda ? 'not_registered' : 'unknown',
          data.sourceName, data.sourceUrl, product.sourceRecordId || null,
          product.sourceCheckedAt || null, product.evidenceNotes
        ]
      );
      inserted += result.rowCount;
    }

    await client.query(
      'UPDATE medicine_catalogue_import_batches SET records_inserted=$2, records_rejected=$3 WHERE id=$1',
      [batch.rows[0].id, inserted, data.products.length - inserted]
    );
    await client.query(
      'INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',
      [req.user.id, 'medicine_catalogue_imported', 'medicine_catalogue_import_batch', String(batch.rows[0].id), JSON.stringify({ seen: data.products.length, inserted, duplicates: data.products.length - inserted })]
    );
    await client.query('COMMIT');
    res.status(201).json({
      batchId: batch.rows[0].id,
      recordsSeen: data.products.length,
      recordsInserted: inserted,
      duplicatesSkipped: data.products.length - inserted,
      reviewStatus: 'pending'
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client?.release();
  }
});

// Only a Super Admin can publish a catalogue record. An approved record must
// carry a DDA source, registration number and source record identifier.
// Clinical advice remains a separate pharmacist review workflow.
router.patch('/:id/review', requireAuth, allowRoles('super_admin'), writeLimit, async (req, res, next) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Review details are invalid.' });

  try {
    if (parsed.data.status === 'approved') {
      const existing = await pool.query(
        'SELECT source_url, registration_number, source_record_id, registration_status FROM medicine_catalogue_products WHERE id=$1',
        [req.params.id]
      );
      if (!existing.rowCount) return res.status(404).json({ error: 'Catalogue record not found.' });
      const record = existing.rows[0];
      if (!isOfficialDdaUrl(record.source_url) || !record.registration_number ||
          !record.source_record_id || record.registration_status !== 'registered') {
        return res.status(409).json({
          error: 'Cannot approve this record as DDA-registered without matching official DDA evidence.'
        });
      }
    }

    const { rows } = await pool.query(
      `UPDATE medicine_catalogue_products
       SET review_status=$2, reviewed_by=$3, reviewed_at=NOW(),
           evidence_notes=CASE WHEN $4='' THEN evidence_notes ELSE evidence_notes || E'\\n' || $4 END,
           updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, parsed.data.status, req.user.id, parsed.data.notes]
    );
    if (!rows.length) return res.status(404).json({ error: 'Catalogue record not found.' });

    await pool.query(
      'INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',
      [req.user.id, 'medicine_catalogue_reviewed', 'medicine_catalogue_product', String(req.params.id), JSON.stringify({ status: parsed.data.status })]
    );
    res.json({ item: mapProduct(rows[0]) });
  } catch (error) {
    next(error);
  }
});

export default router;
