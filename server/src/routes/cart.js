import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { config } from '../config.js';
const router = Router();
router.use(requireAuth, allowRoles('customer'));

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ci.product_id,ci.quantity,p.name,p.price,p.stock,p.image_url,p.is_test
       FROM cart_items ci JOIN products p ON p.id=ci.product_id
       LEFT JOIN sellers s ON s.user_id=p.seller_id
       WHERE ci.user_id=$1 AND p.status='approved' AND p.is_active=true
         AND (p.is_test=true OR s.verification_status='verified')
         AND (p.is_test=false OR $2::boolean=true)
       ORDER BY ci.created_at DESC`, [req.user.id, config.enableTestOrderWorkflow]
    );
    res.json({ items: result.rows });
  } catch (e) { next(e); }
});

router.post('/items', (req,res,next) => config.enableMarketplaceOrders ? next() : res.status(403).json({ error: 'Marketplace checkout is disabled until required legal, pharmacy and payment approvals are complete.' }), async (req, res, next) => {
  let client;
  let transactionOpen = false;
  try {
    const productId = Number(req.body?.productId);
    const quantity = Number(req.body?.quantity ?? 1);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: 'Invalid product or quantity.' });
    }
    client = await pool.connect();
    await client.query('BEGIN');
    transactionOpen = true;
    const product = await client.query(
      `SELECT p.id,p.stock FROM products p LEFT JOIN sellers s ON s.user_id=p.seller_id
       WHERE p.id=$1 AND p.status='approved' AND p.is_active=true
         AND (p.is_test=true OR s.verification_status='verified')
         AND (p.is_test=false OR $2::boolean=true) FOR UPDATE OF p`,
      [productId, config.enableTestOrderWorkflow]
    );
    if (!product.rowCount) {
      await client.query('ROLLBACK'); transactionOpen = false;
      return res.status(404).json({ error: 'Product unavailable.' });
    }
    const existing = await client.query(
      'SELECT quantity FROM cart_items WHERE user_id=$1 AND product_id=$2',
      [req.user.id, productId]
    );
    const nextQuantity = Number(existing.rows[0]?.quantity || 0) + quantity;
    if (nextQuantity > 99 || nextQuantity > product.rows[0].stock) {
      await client.query('ROLLBACK'); transactionOpen = false;
      return res.status(409).json({ error: 'Requested cart quantity exceeds available stock.' });
    }
    await client.query(
      `INSERT INTO cart_items(user_id,product_id,quantity) VALUES($1,$2,$3)
       ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity`,
      [req.user.id, productId, nextQuantity]
    );
    await client.query('COMMIT'); transactionOpen = false;
    res.status(201).json({ message: 'Added to cart.', quantity: nextQuantity });
  } catch (e) {
    if (transactionOpen && client) await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally { client?.release(); }
});

router.delete('/items/:productId', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2', [req.user.id, req.params.productId]);
    res.status(204).end();
  } catch (e) { next(e); }
});
export default router;
