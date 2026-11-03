import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth, allowRoles('customer'));

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ci.product_id,ci.quantity,p.name,p.price,p.stock,p.image_url
       FROM cart_items ci JOIN products p ON p.id=ci.product_id
       WHERE ci.user_id=$1 ORDER BY ci.created_at DESC`, [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (e) { next(e); }
});

router.post('/items', async (req, res, next) => {
  try {
    const productId = Number(req.body?.productId);
    const quantity = Number(req.body?.quantity ?? 1);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: 'Invalid product or quantity.' });
    }
    const product = await pool.query("SELECT id,stock FROM products WHERE id=$1 AND status='approved' AND is_active=true", [productId]);
    if (!product.rowCount || product.rows[0].stock < quantity) return res.status(409).json({ error: 'Product unavailable or insufficient stock.' });
    await pool.query(
      `INSERT INTO cart_items(user_id,product_id,quantity) VALUES($1,$2,$3)
       ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=LEAST(cart_items.quantity + EXCLUDED.quantity,99)`,
      [req.user.id, productId, quantity]
    );
    res.status(201).json({ message: 'Added to cart.' });
  } catch (e) { next(e); }
});

router.delete('/items/:productId', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2', [req.user.id, req.params.productId]);
    res.status(204).end();
  } catch (e) { next(e); }
});
export default router;
