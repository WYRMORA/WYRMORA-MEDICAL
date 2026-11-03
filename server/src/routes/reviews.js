import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = Router();

router.get('/products/:id/reviews', async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT r.id,r.rating,r.comment,r.created_at,u.name AS reviewer
       FROM reviews r JOIN users u ON u.id=r.user_id
       WHERE r.product_id=$1 ORDER BY r.created_at DESC LIMIT 100`,[req.params.id]
    );
    res.json({reviews:result.rows});
  } catch(e){next(e);}
});

router.post('/products/:id/reviews', requireAuth, allowRoles('customer'), async (req,res,next) => {
  try {
    const rating=Number(req.body?.rating);
    const comment=String(req.body?.comment||'').trim();
    if(!Number.isInteger(rating)||rating<1||rating>5||comment.length>2000)
      return res.status(400).json({error:'Rating must be 1–5 and comment must be under 2000 characters.'});
    const purchased=await pool.query(
      `SELECT 1 FROM order_items oi JOIN orders o ON o.id=oi.order_id
       WHERE o.user_id=$1 AND oi.product_id=$2 AND o.order_status<>'cancelled' LIMIT 1`,
      [req.user.id,req.params.id]
    );
    if(!purchased.rowCount) return res.status(403).json({error:'You can review a product only after ordering it.'});
    const result=await pool.query(
      `INSERT INTO reviews(product_id,user_id,rating,comment) VALUES($1,$2,$3,$4)
       ON CONFLICT(product_id,user_id) DO UPDATE SET rating=EXCLUDED.rating,comment=EXCLUDED.comment
       RETURNING id,product_id,rating,comment,created_at`,
      [req.params.id,req.user.id,rating,comment]
    );
    res.status(201).json({review:result.rows[0]});
  } catch(e){next(e);}
});
export default router;
