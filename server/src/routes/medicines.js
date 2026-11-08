
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const router = Router();

const adminWriteLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

const reportLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'एक घण्टामा बढीमा ५ वटा report मात्र पठाउन सकिन्छ।' }
});

const reportSchema = z.object({
  reporterName: z.string().trim().max(100).optional().default(''),
  email: z.string().trim().max(254).email().or(z.literal('')).optional().default(''),
  message: z.string().trim().min(15).max(2000)
});

const schema = z.object({
  id: z.string().trim().min(2).max(90).regex(/^[a-z0-9-]+$/i).optional(),
  name: z.string().trim().min(2).max(160),
  nepali: z.string().trim().min(1).max(160),
  category: z.string().trim().min(2).max(100),
  forms: z.string().max(240).optional().default(''),
  use: z.string().trim().min(5).max(3000),
  symptoms: z.string().max(3000).optional().default(''),
  caution: z.string().trim().min(5).max(4000),
  side: z.string().max(3000).optional().default(''),
  prescription: z.string().max(240).optional().default('फार्मासिस्टसँग पुष्टि गर्नुहोस्'),
  price: z.number().nonnegative().max(10000000).nullable().optional(),
  priceNote: z.string().max(500).optional().default('मूल्य पुष्टि हुन बाँकी'),
  source: z.string().trim().min(3).max(1000)
});


const verificationSchema = z.object({
  status: z.enum(['pending', 'under_review']),
  notes: z.string().trim().max(2000).optional().default('')
});

const map = r => ({
  id: r.id,
  name: r.name,
  nepali: r.nepali_name,
  category: r.category,
  forms: r.forms,
  use: r.use_description,
  symptoms: r.symptoms,
  caution: r.caution,
  side: r.side_effects,
  prescription: r.prescription_status,
  price: r.price_npr === null ? null : Number(r.price_npr),
  priceNote: r.price_note,
  source: r.source,
  priceVerified: r.price_verified,
  priceUpdatedAt: r.price_updated_at,
  verificationStatus: r.verification_status,
  verifiedBy: r.verified_by,
  verifiedAt: r.verified_at
});

// GET: Medicine list
router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();

    const { rows } = await pool.query(
      `SELECT * FROM medicines
       WHERE (
         $1 = ''
         OR name ILIKE '%' || $1 || '%'
         OR nepali_name ILIKE '%' || $1 || '%'
         OR category ILIKE '%' || $1 || '%'
       )
       AND ($2 = '' OR category = $2)
       ORDER BY name
       LIMIT 200`,
      [q, category]
    );

    res.json({ items: rows.map(map) });
  } catch (e) {
    next(e);
  }
});

// POST: Report a possible medicine information issue (public, rate-limited).
router.post('/:id/reports', reportLimit, async (req,res,next) => {
  try {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Report विवरण जाँच गर्नुहोस्। कम्तीमा १५ अक्षरको सन्देश आवश्यक छ।' });
    }

    const medicine = await pool.query('SELECT id FROM medicines WHERE id=$1', [req.params.id]);
    if (!medicine.rowCount) return res.status(404).json({ error: 'औषधि भेटिएन।' });

    const { reporterName, email, message } = parsed.data;
    const result = await pool.query(
      'INSERT INTO medicine_reports(medicine_id,reporter_name,reporter_email,message) VALUES($1,$2,$3,$4) RETURNING id,created_at',
      [req.params.id, reporterName || null, email || null, message]
    );
    res.status(201).json({ report: result.rows[0], message: 'तपाईंको report प्राप्त भयो। धन्यवाद।' });
  } catch (e) {
    next(e);
  }
});

// POST: Add or update medicine
router.post('/', requireAuth, allowRoles('super_admin','editor'), adminWriteLimit, async (req,res,next) => {
  try {

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'औषधिको विवरण जाँच गर्नुहोस्।',
        details: parsed.error.flatten()
      });
    }

    const d = parsed.data;

    const id = d.id || d.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // A free-text note is not proof of a current pharmacy price check.
    // Keep prices unverified until a dedicated source-and-review workflow exists.
    const priceVerified = false;

    const { rows } = await pool.query(
      `INSERT INTO medicines (
        id, name, nepali_name, category, forms,
        use_description, symptoms, caution, side_effects,
        prescription_status, price_npr, price_note, source,
        price_verified, price_updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        CASE WHEN $11::numeric IS NULL THEN NULL ELSE NOW() END
      )
      ON CONFLICT(id) DO UPDATE SET
        name = EXCLUDED.name,
        nepali_name = EXCLUDED.nepali_name,
        category = EXCLUDED.category,
        forms = EXCLUDED.forms,
        use_description = EXCLUDED.use_description,
        symptoms = EXCLUDED.symptoms,
        caution = EXCLUDED.caution,
        side_effects = EXCLUDED.side_effects,
        prescription_status = EXCLUDED.prescription_status,
        price_npr = EXCLUDED.price_npr,
        price_note = EXCLUDED.price_note,
        source = EXCLUDED.source,
        price_verified = EXCLUDED.price_verified,
        price_updated_at = CASE
          WHEN EXCLUDED.price_npr IS NULL THEN NULL
          ELSE NOW()
        END,
        verification_status = 'pending',
        verified_by = NULL,
        pharmacist_registration = NULL,
        verified_at = NULL,
        verification_notes = NULL,
        updated_at = NOW()
      RETURNING *`,
      [
        id, d.name, d.nepali, d.category, d.forms,
        d.use, d.symptoms, d.caution, d.side,
        d.prescription, d.price ?? null, d.priceNote,
        d.source, priceVerified
      ]
    );

    await pool.query('INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)', [req.user.id, d.id ? 'medicine_updated' : 'medicine_created', 'medicine', id, JSON.stringify({ name: d.name })]);
    res.status(201).json({ item: map(rows[0]) });
  } catch (e) {
    next(e);
  }
});

// PATCH: Pharmacist verification
router.patch('/:id/verification', requireAuth, allowRoles('super_admin','editor'), adminWriteLimit, async (req,res,next) => {
  try {
    // Do not allow an administrator to self-attest a clinical review.
    // A dedicated pharmacist identity and credential-verification workflow
    // must exist before any record can be marked clinically verified.
    if (req.body?.status === 'verified') {
      return res.status(403).json({
        error: 'Pharmacist verification is temporarily locked until qualified reviewer accounts and credential checks are implemented.'
      });
    }

    const parsed = verificationSchema.safeParse(req.body);

    if (!parsed.success) {
      const problems = parsed.error.issues
        .map(issue => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');

      return res.status(400).json({
        error: `Verification विवरण जाँच गर्नुहोस्: ${problems}`
      });
    }

    const d = parsed.data;

    const { rows } = await pool.query(
      `UPDATE medicines
       SET verification_status = $2,
           verified_by = NULL,
           pharmacist_registration = NULL,
           verified_at = NULL,
           verification_notes = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, d.status, d.notes]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'औषधि भेटिएन।'
      });
    }

    await pool.query('INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)', [req.user.id, 'medicine_verification_updated', 'medicine', req.params.id, JSON.stringify({ status: d.status })]);
    res.json({ item: map(rows[0]) });
  } catch (e) {
    next(e);
  }
});

export default router;
