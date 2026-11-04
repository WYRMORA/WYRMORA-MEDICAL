import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { productSchema } from '../lib/validation.js';
const router = Router();
router.use(requireAuth);

router.post('/profile', async (req, res, next) => {
  try {
    const businessName = String(req.body?.businessName || '').trim();
    const description = String(req.body?.description || '').trim();
    if (businessName.length < 2 || businessName.length > 120) return res.status(400).json({ error: 'Business name must be 2–120 characters.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO sellers(user_id,business_name,description)
        VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET business_name=EXCLUDED.business_name,description=EXCLUDED.description`,
        [req.user.id,businessName,description]);
      await client.query("UPDATE users SET role='seller' WHERE id=$1 AND role='customer'", [req.user.id]);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    res.status(201).json({ message: 'Seller profile saved. Super Admin verification is required before listing products.' });
  } catch (e) { next(e); }
});

router.get('/products', allowRoles('seller','admin','super_admin'), async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id,name,price,stock,status,created_at FROM products WHERE seller_id=$1 ORDER BY created_at DESC',[req.user.id]);
    res.json({ products: result.rows });
  } catch (e) { next(e); }
});

router.post('/products', allowRoles('seller'), async (req, res, next) => {
  try {
    const verification = await pool.query('SELECT verification_status FROM sellers WHERE user_id=$1',[req.user.id]);
    if (!verification.rowCount || verification.rows[0].verification_status !== 'verified') {
      return res.status(403).json({ error: 'Seller verification is required before submitting products.' });
    }
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid product details.', details: parsed.error.flatten() });
    const { name,description,categoryId,price,stock } = parsed.data;
    const category = await pool.query('SELECT id FROM categories WHERE id=$1 AND is_active=true',[categoryId]);
    if (!category.rowCount) return res.status(400).json({ error: 'Choose a valid category.' });
    const result = await pool.query(
      `INSERT INTO products(seller_id,category_id,name,description,price,stock,status)
       VALUES($1,$2,$3,$4,$5,$6,'pending') RETURNING id,name,price,stock,status`,
      [req.user.id,categoryId,name,description,price,stock]
    );
    res.status(201).json({ product: result.rows[0], message: 'Listing submitted for review.' });
  } catch (e) { next(e); }
});

router.get('/orders', allowRoles('seller','admin','super_admin'), async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT o.id,o.order_number,o.order_status,o.payment_status,o.created_at,o.is_test,
              oi.product_name,oi.quantity,oi.unit_price,u.name AS buyer_name
       FROM order_items oi JOIN orders o ON o.id=oi.order_id
       JOIN users u ON u.id=o.user_id
       WHERE oi.seller_id=$1 ORDER BY o.created_at DESC LIMIT 200`,
      [req.user.id]
    );
    res.json({orders:result.rows});
  } catch(e){next(e);}
});
export default router;
