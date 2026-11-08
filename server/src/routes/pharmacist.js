import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { emailSchema, passwordSchema } from '../lib/validation.js';

const router = Router();
const applicationLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 3, standardHeaders: 'draft-7', legacyHeaders: false });
const reviewLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

const applicationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().max(30).optional().default(''),
  qualification: z.string().trim().min(2).max(160),
  registrationNumber: z.string().trim().min(2).max(100),
  issuingAuthority: z.string().trim().min(2).max(160).default('Nepal Pharmacy Council')
});

router.post('/applications', applicationLimit, async (req,res,next) => {
  try {
    const parsed = applicationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'आवेदनका सबै आवश्यक विवरण ठीकसँग भर्नुहोस्।', details: parsed.error.flatten() });
    const d = parsed.data;
    const passwordHash = await bcrypt.hash(d.password, 12);
    const result = await pool.query(
      `INSERT INTO pharmacist_applications(full_name,email,password_hash,phone,qualification,registration_number,issuing_authority)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,full_name,email,qualification,registration_number,status,created_at`,
      [d.name,d.email,passwordHash,d.phone,d.qualification,d.registrationNumber,d.issuingAuthority]
    );
    res.status(201).json({ application: result.rows[0], message: 'आवेदन प्राप्त भयो। Credential जाँचपछि मात्र Pharmacist account सक्रिय हुनेछ।' });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'यो email वा registration number बाट आवेदन पहिल्यै दर्ता छ।' });
    next(e);
  }
});

router.use(requireAuth, allowRoles('pharmacist'));
router.use(async (req,res,next) => {
  try {
    const result = await pool.query(
      'SELECT is_credential_active FROM pharmacist_profiles WHERE user_id=$1',
      [req.user.id]
    );
    if (!result.rowCount || !result.rows[0].is_credential_active) {
      return res.status(403).json({ error: 'Pharmacist credential सक्रिय छैन। Super Admin सँग सम्पर्क गर्नुहोस्।' });
    }
    next();
  } catch (e) { next(e); }
});

router.get('/medicines', async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT m.id,m.name,m.nepali_name,m.category,m.forms,m.use_description,m.symptoms,
              m.caution,m.side_effects,m.prescription_status,m.source,m.verification_status,
              (SELECT r.recommendation FROM medicine_reviews r
               WHERE r.medicine_id=m.id ORDER BY r.reviewed_at DESC LIMIT 1) AS latest_recommendation
       FROM medicines m
       WHERE m.verification_status <> 'verified'
       ORDER BY CASE m.verification_status WHEN 'under_review' THEN 0 ELSE 1 END, m.name`
    );
    res.json({ medicines: result.rows });
  } catch (e) { next(e); }
});

const reviewSchema = z.object({
  recommendation: z.enum(['approved','changes_requested']),
  clinicalNotes: z.string().trim().min(30).max(4000),
  sources: z.string().trim().min(10).max(2000)
});

router.post('/medicines/:id/reviews', reviewLimit, async (req,res,next) => {
  const client = await pool.connect();
  let open = false;
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Review note कम्तीमा ३० अक्षर र source कम्तीमा १० अक्षर हुनुपर्छ।' });
    const d = parsed.data;
    await client.query('BEGIN'); open = true;
    const medicine = await client.query('SELECT id,verification_status FROM medicines WHERE id=$1 FOR UPDATE',[req.params.id]);
    if (!medicine.rowCount) {
      await client.query('ROLLBACK'); open = false;
      return res.status(404).json({ error: 'औषधि भेटिएन।' });
    }
    if (medicine.rows[0].verification_status === 'verified') {
      await client.query('ROLLBACK'); open = false;
      return res.status(409).json({ error: 'यो औषधि पहिले नै प्रकाशित रूपमा Verified छ। परिवर्तन आवश्यक भए Super Admin लाई report गर्नुहोस्।' });
    }
    const inserted = await client.query(
      `INSERT INTO medicine_reviews(medicine_id,pharmacist_id,recommendation,clinical_notes,sources)
       VALUES($1,$2,$3,$4,$5) RETURNING id,medicine_id,recommendation,clinical_notes,sources,reviewed_at`,
      [req.params.id,req.user.id,d.recommendation,d.clinicalNotes,d.sources]
    );
    await client.query(
      'UPDATE medicines SET verification_status=$1,verification_notes=$2,updated_at=NOW() WHERE id=$3',
      [d.recommendation === 'approved' ? 'under_review' : 'pending',d.clinicalNotes,req.params.id]
    );
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,'pharmacist_medicine_reviewed','medicine',$2,$3)`,
      [req.user.id,req.params.id,JSON.stringify({ recommendation:d.recommendation, reviewId:inserted.rows[0].id })]
    );
    await client.query('COMMIT'); open = false;
    res.status(201).json({ review: inserted.rows[0], message: 'Clinical review सुरक्षित भयो। प्रकाशित गर्ने अन्तिम निर्णय Super Admin ले गर्नेछ।' });
  } catch (e) {
    if (open) await client.query('ROLLBACK');
    next(e);
  } finally { client.release(); }
});

export default router;
