import { Router } from 'express';
import { pool } from '../db.js';
import { config } from '../config.js';
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100);
    const category = req.query.category ? Number(req.query.category) : null;
    const values = [config.enableTestOrderWorkflow];
    let where = "p.status='approved' AND p.is_active=true AND (p.is_test=false OR $1::boolean=true)";
    if (q) { values.push(`%${q}%`); where += ` AND (p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`; }
    if (category && Number.isInteger(category)) { values.push(category); where += ` AND p.category_id=$${values.length}`; }
    const result = await pool.query(
      `SELECT p.id,p.name,p.description,p.price,p.stock,p.image_url,p.is_test,c.name AS category,
              u.name AS seller_name
       FROM products p JOIN categories c ON c.id=p.category_id
       JOIN users u ON u.id=p.seller_id
       WHERE ${where} ORDER BY p.created_at DESC LIMIT 100`, values
    );
    res.json({ products: result.rows });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.id,p.name,p.description,p.price,p.stock,p.image_url,p.is_test,c.name AS category,
              u.name AS seller_name
       FROM products p JOIN categories c ON c.id=p.category_id
       JOIN users u ON u.id=p.seller_id
       WHERE p.id=$1 AND p.status='approved' AND p.is_active=true
         AND (p.is_test=false OR $2::boolean=true)`,
      [req.params.id, config.enableTestOrderWorkflow]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: result.rows[0] });
  } catch (err) { next(err); }
});
export default router;
