import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { config } from '../config.js';
const router = Router();
router.use(requireAuth, allowRoles('customer'));
router.use((req, res, next) => {
  if (!config.enableMarketplaceOrders) {
    return res.status(403).json({ error: 'Marketplace checkout is disabled until required legal, pharmacy and payment approvals are complete.' });
  }
  next();
});

router.post('/', async (req, res, next) => {
  let client;
  let transactionOpen = false;
  try {
    const shippingAddress = String(req.body?.shippingAddress || '').trim();
    if (shippingAddress.length < 10 || shippingAddress.length > 500) {
      return res.status(400).json({ error: 'Enter a complete delivery address.' });
    }
    client = await pool.connect();
    await client.query('BEGIN');
    transactionOpen = true;
    const cart = await client.query(
      `SELECT ci.product_id,ci.quantity,p.name,p.price,p.stock,p.seller_id,p.is_test
       FROM cart_items ci JOIN products p ON p.id=ci.product_id
       LEFT JOIN sellers s ON s.user_id=p.seller_id
       WHERE ci.user_id=$1 AND p.status='approved' AND p.is_active=true
         AND (p.is_test=false OR $2::boolean=true)
         AND (p.is_test=true OR s.verification_status='verified')
       ORDER BY p.id FOR UPDATE OF p`,
      [req.user.id, config.enableTestOrderWorkflow]
    );
    if (!cart.rowCount) {
      await client.query('ROLLBACK'); transactionOpen = false;
      return res.status(400).json({ error: 'Your cart has no eligible products. Remove unavailable items and try again.' });
    }
    const testFlags = new Set(cart.rows.map(item => item.is_test));
    if (testFlags.size !== 1) {
      await client.query('ROLLBACK'); transactionOpen = false;
      return res.status(409).json({ error: 'Test-only and regular products cannot be combined in one order.' });
    }
    const isTestOrder = cart.rows[0].is_test === true;
    if (isTestOrder && !config.enableTestOrderWorkflow) {
      await client.query('ROLLBACK'); transactionOpen = false;
      return res.status(403).json({ error: 'Test order workflow is disabled.' });
    }
    for (const item of cart.rows) {
      if (item.stock < item.quantity) {
        await client.query('ROLLBACK'); transactionOpen = false;
        return res.status(409).json({ error: `Insufficient stock for ${item.name}.` });
      }
    }
    const total = cart.rows.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const order = await client.query(
      `INSERT INTO orders(user_id,total_amount,shipping_address,payment_status,order_status,is_test)
       VALUES($1,$2,$3,'unpaid','pending',$4)
       RETURNING id,order_number,total_amount,order_status,created_at,is_test`,
      [req.user.id, total, shippingAddress, isTestOrder]
    );
    for (const item of cart.rows) {
      await client.query(
        `INSERT INTO order_items(order_id,product_id,seller_id,product_name,unit_price,quantity)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [order.rows[0].id,item.product_id,item.seller_id,item.name,item.price,item.quantity]
      );
      await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [item.quantity,item.product_id]);
    }
    await client.query(
      'INSERT INTO order_status_history(order_id,actor_id,from_status,to_status,note) VALUES($1,$2,NULL,$3,$4)',
      [order.rows[0].id, req.user.id, 'pending', isTestOrder ? 'TEST ONLY order placed; no payment or fulfillment' : 'Order placed']
    );
    await client.query('DELETE FROM cart_items WHERE user_id=$1', [req.user.id]);
    await client.query('COMMIT');
    transactionOpen = false;
    res.status(201).json({
      order: order.rows[0],
      payment: { status: 'unpaid', message: 'Payment provider is not configured. No money was charged.' }
    });
  } catch (e) {
    if (transactionOpen && client) await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally { client?.release(); }
});

router.get('/mine', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.id,o.order_number,o.total_amount,o.order_status,o.payment_status,o.created_at,o.is_test,
       COALESCE(json_agg(json_build_object('name',oi.product_name,'quantity',oi.quantity,'price',oi.unit_price))
       FILTER (WHERE oi.id IS NOT NULL),'[]') AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
       WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (e) { next(e); }
});
export default router;
