import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const router = Router();
// Only Super Admin may access platform-wide administration endpoints.
router.use(requireAuth, allowRoles('super_admin'));

async function audit(actorId, action, entityType, entityId, metadata = {}) {
  await pool.query(
    'INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',
    [actorId, action, entityType, entityId == null ? null : String(entityId), JSON.stringify(metadata)]
  );
}

router.get('/overview', async (req,res,next) => {
  try {
    const [users, editors, medicines, pendingProducts, orders, tickets] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role='editor' AND is_active=true"),
      pool.query('SELECT COUNT(*)::int AS count FROM medicines'),
      pool.query("SELECT COUNT(*)::int AS count FROM products WHERE status='pending'"),
      pool.query("SELECT COUNT(*)::int AS count FROM orders WHERE order_status NOT IN ('delivered','cancelled')"),
      pool.query("SELECT COUNT(*)::int AS count FROM support_tickets WHERE status IN ('open','in_progress')")
    ]);
    res.json({overview:{
      totalUsers:users.rows[0].count,activeEditors:editors.rows[0].count,
      medicines:medicines.rows[0].count,pendingProducts:pendingProducts.rows[0].count,
      activeOrders:orders.rows[0].count,openTickets:tickets.rows[0].count
    }});
  } catch(e){next(e);}
});

router.get('/users', async (req,res,next) => {
  try {
    const result=await pool.query('SELECT id,name,email,role,is_active,created_at FROM users ORDER BY created_at DESC LIMIT 500');
    res.json({users:result.rows});
  } catch(e){next(e);}
});

router.post('/editors', async (req,res,next) => {
  try {
    const name=String(req.body?.name||'').trim();
    const email=String(req.body?.email||'').trim().toLowerCase();
    const password=String(req.body?.password||'');
    if(name.length<2||name.length>80||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||password.length<12||password.length>72)
      return res.status(400).json({error:'नाम, valid email र 12–72 characters को password आवश्यक छ।'});
    const passwordHash=await bcrypt.hash(password,12);
    const result=await pool.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'editor') RETURNING id,name,email,role,is_active,created_at",
      [name,email,passwordHash]
    );
    await audit(req.user.id,'editor_created','user',result.rows[0].id,{email});
    res.status(201).json({user:result.rows[0]});
  } catch(e){
    if(e.code==='23505') return res.status(409).json({error:'यो email बाट account पहिल्यै छ।'});
    next(e);
  }
});

router.patch('/users/:id/status', async (req,res,next) => {
  try {
    const active=req.body?.isActive;
    if(typeof active!=='boolean') return res.status(400).json({error:'isActive true वा false हुनुपर्छ।'});
    if(String(req.params.id)===String(req.user.id)) return res.status(400).json({error:'आफ्नो Super Admin account आफैं disable गर्न मिल्दैन।'});
    const result=await pool.query(
      "UPDATE users SET is_active=$1,updated_at=NOW() WHERE id=$2 AND role='editor' RETURNING id,name,email,role,is_active,created_at",
      [active,req.params.id]
    );
    if(!result.rowCount) return res.status(404).json({error:'Editor account भेटिएन।'});
    await audit(req.user.id,active?'editor_activated':'editor_deactivated','user',req.params.id,{email:result.rows[0].email});
    res.json({user:result.rows[0]});
  } catch(e){next(e);}
});

router.get('/audit-logs', async (req,res,next) => {
  try {
    const limit=Math.min(Math.max(Number.parseInt(req.query.limit,10)||50,1),100);
    const result=await pool.query(
      `SELECT l.id,l.action,l.entity_type,l.entity_id,l.metadata,l.created_at,
              u.name AS actor_name,u.email AS actor_email
       FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_id
       ORDER BY l.created_at DESC LIMIT $1`,[limit]
    );
    res.json({logs:result.rows});
  } catch(e){next(e);}
});

router.get('/medicine-reports', async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT r.id,r.medicine_id,r.reporter_name,r.reporter_email,r.message,r.status,
              r.admin_note,r.created_at,r.updated_at,m.name AS medicine_name,m.nepali_name
       FROM medicine_reports r
       JOIN medicines m ON m.id=r.medicine_id
       ORDER BY CASE r.status WHEN 'new' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END,
                r.created_at DESC
       LIMIT 300`
    );
    res.json({ reports: result.rows });
  } catch (e) { next(e); }
});

router.patch('/medicine-reports/:id', async (req,res,next) => {
  try {
    const status = String(req.body?.status || '');
    const adminNote = String(req.body?.adminNote || '').trim();
    if (!['new','in_review','resolved'].includes(status))
      return res.status(400).json({ error: 'Invalid report status.' });
    if (adminNote.length > 1000)
      return res.status(400).json({ error: 'Admin note धेरै लामो भयो।' });
    const result = await pool.query(
      'UPDATE medicine_reports SET status=$1,admin_note=$2,updated_at=NOW() WHERE id=$3 RETURNING id,status,admin_note,updated_at',
      [status, adminNote || null, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Report भेटिएन।' });
    await audit(req.user.id, 'medicine_report_updated', 'medicine_report', req.params.id, { status });
    res.json({ report: result.rows[0] });
  } catch (e) { next(e); }
});

router.get('/products/pending', async (req,res,next) => {
  try {
    const result=await pool.query(
      `SELECT p.id,p.name,p.description,p.price,p.stock,u.name AS seller_name,c.name AS category
       FROM products p JOIN users u ON u.id=p.seller_id JOIN categories c ON c.id=p.category_id
       WHERE p.status='pending' ORDER BY p.created_at ASC`
    );
    res.json({products:result.rows});
  } catch(e){next(e);}
});

router.patch('/products/:id/approve', async (req,res,next) => {
  try {
    const status=req.body?.status==='rejected'?'rejected':'approved';
    const result=await pool.query(
      `UPDATE products SET status=$1,reviewed_by=$2,reviewed_at=NOW()
       WHERE id=$3 AND status='pending' RETURNING id,status`,
      [status,req.user.id,req.params.id]
    );
    if(!result.rowCount)return res.status(404).json({error:'Pending product not found.'});
    await audit(req.user.id,`product_${status}`,'product',req.params.id,{status});
    res.json({product:result.rows[0]});
  } catch(e){next(e);}
});

router.get('/orders', async (req,res,next) => {
  try {
    const result=await pool.query(
      `SELECT o.id,o.order_number,o.total_amount,o.order_status,o.payment_status,o.created_at,
              u.name AS buyer_name,u.email AS buyer_email
       FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 500`
    );
    res.json({orders:result.rows});
  } catch(e){next(e);}
});

router.get('/tickets', async (req,res,next) => {
  try {
    const result=await pool.query(
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
    if(!allowed.includes(status))return res.status(400).json({error:'Invalid ticket status.'});
    const result=await pool.query('UPDATE support_tickets SET status=$1 WHERE id=$2 RETURNING id,status',[status,req.params.id]);
    if(!result.rowCount)return res.status(404).json({error:'Ticket not found.'});
    await audit(req.user.id,'ticket_status_changed','support_ticket',req.params.id,{status});
    res.json({ticket:result.rows[0]});
  } catch(e){next(e);}
});
export default router;
