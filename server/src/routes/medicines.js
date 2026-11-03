import { Router } from 'express';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
const router = Router();
const adminWriteLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const schema = z.object({
  id:z.string().trim().min(2).max(90).regex(/^[a-z0-9-]+$/i).optional(),
  name:z.string().trim().min(2).max(160), nepali:z.string().trim().min(1).max(160),
  category:z.string().trim().min(2).max(100), forms:z.string().max(240).optional().default(''),
  use:z.string().trim().min(5).max(3000), symptoms:z.string().max(3000).optional().default(''),
  caution:z.string().trim().min(5).max(4000), side:z.string().max(3000).optional().default(''),
  prescription:z.string().max(240).optional().default('फार्मासिस्टसँग पुष्टि गर्नुहोस्'),
  price:z.number().nonnegative().max(10000000).nullable().optional(),
  priceNote:z.string().max(500).optional().default('मूल्य पुष्टि हुन बाँकी'),
  source:z.string().trim().min(3).max(1000)
});
const map = r => ({id:r.id,name:r.name,nepali:r.nepali_name,category:r.category,forms:r.forms,use:r.use_description,symptoms:r.symptoms,caution:r.caution,side:r.side_effects,prescription:r.prescription_status,price:r.price_npr===null?null:Number(r.price_npr),priceNote:r.price_note,source:r.source,priceVerified:r.price_verified,priceUpdatedAt:r.price_updated_at});
router.get('/',async(req,res,next)=>{try{
 const q=String(req.query.q||'').trim().slice(0,100); const category=String(req.query.category||'').trim().slice(0,100);
 const {rows}=await pool.query(`SELECT * FROM medicines WHERE ($1='' OR name ILIKE '%'||$1||'%' OR nepali_name ILIKE '%'||$1||'%' OR category ILIKE '%'||$1||'%') AND ($2='' OR category=$2) ORDER BY name LIMIT 200`,[q,category]);
 res.json({items:rows.map(map)});
}catch(e){next(e)}});
router.post('/',adminWriteLimit,async(req,res,next)=>{try{
 const secret=process.env.MEDICINE_ADMIN_KEY;
 const supplied=req.get('x-admin-key')||'';
 const a=Buffer.from(String(secret||'')); const b=Buffer.from(String(supplied));
 const keyMatches=Boolean(secret&&supplied&&a.length===b.length&&timingSafeEqual(a,b));
 if(!keyMatches) return res.status(403).json({error:'Admin key गलत छ वा server मा MEDICINE_ADMIN_KEY सेट गरिएको छैन।'});
 const parsed=schema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:'औषधिको विवरण जाँच गर्नुहोस्।',details:parsed.error.flatten()});
 const d=parsed.data; const id=d.id||d.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const priceVerified=Boolean(d.price!==null&&d.price!==undefined&&d.priceNote&&/pharmacy|फार्मेसी|फार्मेसीबाट|supplier|mrp/i.test(d.priceNote));
 const {rows}=await pool.query(`INSERT INTO medicines(id,name,nepali_name,category,forms,use_description,symptoms,caution,side_effects,prescription_status,price_npr,price_note,source,price_verified,price_updated_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CASE WHEN $11::numeric IS NULL THEN NULL ELSE NOW() END)
 ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,nepali_name=EXCLUDED.nepali_name,category=EXCLUDED.category,forms=EXCLUDED.forms,use_description=EXCLUDED.use_description,symptoms=EXCLUDED.symptoms,caution=EXCLUDED.caution,side_effects=EXCLUDED.side_effects,prescription_status=EXCLUDED.prescription_status,price_npr=EXCLUDED.price_npr,price_note=EXCLUDED.price_note,source=EXCLUDED.source,price_verified=EXCLUDED.price_verified,price_updated_at=CASE WHEN EXCLUDED.price_npr IS NULL THEN NULL ELSE NOW() END,updated_at=NOW() RETURNING *`,[id,d.name,d.nepali,d.category,d.forms,d.use,d.symptoms,d.caution,d.side,d.prescription,d.price??null,d.priceNote,d.source,priceVerified]);
 res.status(201).json({item:map(rows[0])});
}catch(e){next(e)}});
export default router;
