import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { createUploadUrl, inspectUploadedObject, createDownloadUrl, storageConfigured } from '../lib/object-storage.js';

const router = Router();
const rules = {
  product_image: { roles: ['seller'], types: ['image/jpeg','image/png','image/webp'], max: 5 * 1024 * 1024 },
  seller_credential: { roles: ['seller'], types: ['application/pdf','image/jpeg','image/png'], max: 10 * 1024 * 1024 },
  pharmacist_credential: { roles: ['pharmacist'], types: ['application/pdf','image/jpeg','image/png'], max: 10 * 1024 * 1024 }
};
const safeName = value => path.basename(String(value || 'upload')).replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,255) || 'upload';

router.use(requireAuth);

router.post('/presign', async (req,res,next) => {
  try {
    const purpose = String(req.body?.purpose || '');
    const rule = rules[purpose];
    if (!rule || !rule.roles.includes(req.user.role)) return res.status(403).json({ error: 'This upload purpose is not allowed for your account.' });
    if (!storageConfigured()) return res.status(503).json({ error: 'Private file storage is not configured.' });
    const contentType = String(req.body?.contentType || '').toLowerCase();
    const sizeBytes = Number(req.body?.sizeBytes);
    if (!rule.types.includes(contentType) || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > rule.max) {
      return res.status(400).json({ error: 'Unsupported file type or file size.' });
    }
    const id = randomUUID();
    const originalName = safeName(req.body?.fileName);
    const ext = path.extname(originalName).toLowerCase().slice(0,10);
    const key = `private/${purpose}/${req.user.id}/${id}${ext}`;
    const result = await pool.query(
      `INSERT INTO private_assets(id,owner_user_id,purpose,object_key,original_name,content_type,size_bytes)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,purpose,original_name,content_type,size_bytes,status,created_at`,
      [id,req.user.id,purpose,key,originalName,contentType,sizeBytes]
    );
    const uploadUrl = await createUploadUrl({ key, contentType, sizeBytes });
    res.status(201).json({ asset: result.rows[0], uploadUrl, method: 'PUT', expiresInSeconds: 300 });
  } catch (e) { next(e); }
});

router.post('/:id/complete', async (req,res,next) => {
  try {
    const asset = await pool.query('SELECT id,object_key,content_type,size_bytes,status FROM private_assets WHERE id=$1 AND owner_user_id=$2',[req.params.id,req.user.id]);
    if (!asset.rowCount) return res.status(404).json({ error: 'Upload record not found.' });
    if (asset.rows[0].status === 'uploaded') return res.json({ message: 'Upload already confirmed.' });
    const actual = await inspectUploadedObject(asset.rows[0].object_key);
    if (actual.sizeBytes !== Number(asset.rows[0].size_bytes) || actual.contentType !== asset.rows[0].content_type || actual.detectedContentType !== asset.rows[0].content_type) {
      await pool.query("UPDATE private_assets SET status='rejected' WHERE id=$1",[req.params.id]);
      return res.status(400).json({ error: 'Uploaded file metadata does not match the signed request.' });
    }
    await pool.query("UPDATE private_assets SET status='uploaded',uploaded_at=NOW() WHERE id=$1",[req.params.id]);
    res.json({ message: 'Private upload confirmed.' });
  } catch (e) { next(e); }
});

router.get('/:id/download', allowRoles('seller','pharmacist','super_admin'), async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT id,object_key,purpose FROM private_assets
       WHERE id=$1 AND status='uploaded'
         AND (owner_user_id=$2 OR $3='super_admin')`,
      [req.params.id,req.user.id,req.user.role]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Private file not found.' });
    const downloadUrl = await createDownloadUrl(result.rows[0].object_key);
    res.json({ downloadUrl, expiresInSeconds: 120 });
  } catch (e) { next(e); }
});

export default router;
