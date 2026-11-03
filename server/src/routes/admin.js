import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth, allowRoles('admin'));

router.get('/products/pending', async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT p.id,p.name,p.description,p.price,p.stock,u.name AS seller_name,c.name AS category
       FROM products p JOIN users u ON u.id=p.seller_id JOIN categories c ON c.id=p.category_id
       WHERE p.status='pending' ORDER BY p.created_at ASC`
    );
    res.json({ products: result.rows });
  } catch(e){next(e);}
});

router.patch('/products/:id/approve', async (req,res,next) => {
  try {
    const status = req.body?.status === 'rejected' ? 'rejected' : 'approved';
    const result = await pool.query(
      `UPDATE products SET status=$1,reviewed_by=$2,reviewed_at=NOW()
       WHERE id=$3 AND status='pending' RETURNING id,status`,
      [status,req.user.id,req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({error:'Pending product not found.'});
    await pool.query('INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',
      [req.user.id,`product_${status}`,'product',req.params.id,JSON.stringify({status})]);
    res.json({ product: result.rows[0] });
  } catch(e){next(e);}
});

router.get('/users', async (req,res,next) => {
  try {
    const result = await pool.query('SELECT id,name,email,role,is_active,created_at FROM users ORDER BY created_at DESC LIMIT 500');
    res.json({users:result.rows});
  } catch(e){next(e);}
});

router.get('/orders', async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT o.id,o.order_number,o.total_amount,o.order_status,o.payment_status,o.created_at,
              u.name AS buyer_name,u.email AS buyer_email
       FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 500`
    );
    res.json({orders:result.rows});
  } catch(e){next(e);}
});

router.get('/tickets', async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT t.id,t.subject,t.message,t.status,t.created_at,u.name AS customer,u.email
       FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 500`
    );
    res.json({tickets:result.rows});
  } catch(e){next(e);}
});

router.patch('/tickets/:id', async (req,res,next) => {
  try {
    const allowed=['open','in_progress','resolved','closed'];
    const status=String(req.body?.status||'');
    if(!allowed.includes(status)) return res.status(400).json({error:'Invalid ticket status.'});
    const result=await pool.query('UPDATE support_tickets SET status=$1 WHERE id=$2 RETURNING id,status',[status,req.params.id]);
    if(!result.rowCount) return res.status(404).json({error:'Ticket not found.'});
    res.json({ticket:result.rows[0]});
  }catch(e){next(e);}
});
export default router;
