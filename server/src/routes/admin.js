import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { config } from '../config.js';
import { emailSchema } from '../lib/validation.js';

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
    if(name.length<2||name.length>80||!emailSchema.safeParse(email).success||password.length<12||password.length>72)
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
      `SELECT p.id,p.name,p.description,p.price,p.stock,u.name AS seller_name,c.name AS category,
              p.is_test,COALESCE(s.verification_status,'missing') AS seller_verification
       FROM products p JOIN users u ON u.id=p.seller_id JOIN categories c ON c.id=p.category_id
       LEFT JOIN sellers s ON s.user_id=p.seller_id
       WHERE p.status='pending' ORDER BY p.created_at ASC`
    );
    res.json({products:result.rows});
  } catch(e){next(e);}
});

router.patch('/products/:id/approve', async (req,res,next) => {
  try {
    const status=req.body?.status==='rejected'?'rejected':'approved';
    const product = await pool.query(
      `SELECT p.id,p.is_test,COALESCE(s.verification_status,'missing') AS seller_verification
       FROM products p LEFT JOIN sellers s ON s.user_id=p.seller_id
       WHERE p.id=$1 AND p.status='pending'`, [req.params.id]
    );
    if (!product.rowCount) return res.status(404).json({error:'Pending product not found.'});
    if (status === 'approved' && !product.rows[0].is_test && product.rows[0].seller_verification !== 'verified')
      return res.status(409).json({error:'Seller must be verified before approving this product.'});
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

router.get('/sellers/pending', async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT s.id,s.user_id,s.business_name,s.description,s.verification_status,s.credential_asset_id,s.created_at,
              u.name AS owner_name,u.email AS owner_email
       FROM sellers s JOIN users u ON u.id=s.user_id
       WHERE s.verification_status='pending' ORDER BY s.created_at ASC`
    );
    res.json({sellers:result.rows});
  } catch(e){next(e);}
});

router.patch('/sellers/:id/verification', async (req,res,next) => {
  const status=String(req.body?.status||'');
  const checkedAgainst=String(req.body?.checkedAgainst||'').trim();
  const notes=String(req.body?.notes||'').trim();
  if(!['pending','verified','rejected'].includes(status)) return res.status(400).json({error:'Invalid seller verification status.'});
  if(status==='verified'&&(checkedAgainst.length<5||checkedAgainst.length>300||notes.length>1000))
    return res.status(400).json({error:'Official issuing authority/register and review note are required before approval.'});
  let client;
  try{
    client=await pool.connect();
    await client.query('BEGIN');
    const seller=await client.query('SELECT id,user_id FROM sellers WHERE id=$1 FOR UPDATE',[req.params.id]);
    if(!seller.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Seller profile not found.'});}
    let assetId=null;
    if(status==='verified'){
      const credential=await client.query(
        `SELECT a.id FROM sellers s
         JOIN private_assets a ON a.id=s.credential_asset_id AND a.owner_user_id=s.user_id
           AND a.status='uploaded' AND a.purpose='seller_credential'
         WHERE s.id=$1`,
        [req.params.id]
      );
      if(!credential.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'Verified private business/pharmacy credential upload is required before seller approval.'});}
      assetId=credential.rows[0].id;
    }
    const result=await client.query(
      'UPDATE sellers SET verification_status=$1 WHERE id=$2 RETURNING id,user_id,business_name,verification_status',
      [status,req.params.id]
    );
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,'seller_verification_updated','seller',$2,$3)`,
      [req.user.id,String(req.params.id),JSON.stringify({status,checkedAgainst:status==='verified'?checkedAgainst:null,notes:status==='verified'?notes:null,assetId})]
    );
    await client.query('COMMIT');
    res.json({seller:result.rows[0]});
  }catch(e){await client?.query('ROLLBACK').catch(()=>{});next(e);}
  finally{client?.release();}
});

router.post('/test-products', async (req,res,next) => {
  try {
    if(!config.enableTestOrderWorkflow) return res.status(403).json({error:'TEST ONLY workflow is disabled. Enable it explicitly in the server environment first.'});
    const name=String(req.body?.name||'').trim();
    const description=String(req.body?.description||'').trim();
    if(name.length<3||name.length>90||description.length<10||description.length>300)
      return res.status(400).json({error:'Test product name (3–90) and description (10–300) are required.'});
    const category=await pool.query("SELECT id FROM categories WHERE slug='test-only' AND is_active=true");
    if(!category.rowCount) return res.status(503).json({error:'TEST ONLY category is unavailable. Apply database migration 007.'});
    const result=await pool.query(
      `INSERT INTO products(seller_id,category_id,name,description,price,stock,status,is_active,is_test,reviewed_by,reviewed_at)
       VALUES($1,$2,$3,$4,1.00,5,'approved',TRUE,TRUE,$1,NOW())
       RETURNING id,name,description,price,stock,status,is_test`,
      [req.user.id,category.rows[0].id,`TEST ONLY — ${name}`,description]
    );
    await audit(req.user.id,'test_product_created','product',result.rows[0].id,{isTest:true,price:1,stock:5});
    res.status(201).json({product:result.rows[0],message:'TEST ONLY product created. It cannot accept payment or fulfillment.'});
  } catch(e){next(e);}
});

router.get('/refunds', async (req,res,next) => {
  try {
    const result=await pool.query(
      `SELECT p.id,p.order_id,p.provider,p.amount_paisa,p.provider_status,p.provider_transaction_id,p.created_at,p.updated_at,
              o.order_number,o.payment_status,u.name AS buyer_name,u.email AS buyer_email
       FROM payment_transactions p
       JOIN orders o ON o.id=p.order_id
       JOIN users u ON u.id=p.user_id
       WHERE p.status='refund_requested'
       ORDER BY p.updated_at ASC LIMIT 300`
    );
    res.json({refunds:result.rows});
  }catch(e){next(e);}
});

router.get('/orders', async (req,res,next) => {
  try {
    const result=await pool.query(
      `SELECT o.id,o.order_number,o.total_amount,o.order_status,o.payment_status,o.created_at,o.is_test,
              u.name AS buyer_name,u.email AS buyer_email
       FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 500`
    );
    res.json({orders:result.rows});
  } catch(e){next(e);}
});


router.get('/orders/:id', async (req,res,next) => {
  try {
    const [order, items, history] = await Promise.all([
      pool.query(
        `SELECT o.id,o.order_number,o.total_amount,o.shipping_address,o.order_status,o.payment_status,o.created_at,o.is_test,
                u.name AS buyer_name,u.email AS buyer_email
         FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=$1`,
        [req.params.id]
      ),
      pool.query(
        'SELECT product_name,unit_price,quantity FROM order_items WHERE order_id=$1 ORDER BY id',
        [req.params.id]
      ),
      pool.query(
        `SELECT h.from_status,h.to_status,h.note,h.created_at,u.name AS actor_name
         FROM order_status_history h LEFT JOIN users u ON u.id=h.actor_id
         WHERE h.order_id=$1 ORDER BY h.created_at DESC`,
        [req.params.id]
      )
    ]);
    if (!order.rowCount) return res.status(404).json({error:'Order not found.'});
    res.json({order:order.rows[0],items:items.rows,history:history.rows});
  } catch(e){next(e);}
});

router.patch('/orders/:id/status', async (req,res,next) => {
  let client;
  let transactionOpen = false;
  try {
    const status = String(req.body?.status || '');
    const note = String(req.body?.note || '').trim();
    const transitions = {
      pending: ['confirmed','cancelled'],
      confirmed: ['processing','cancelled'],
      processing: ['shipped','cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: []
    };
    if (!Object.hasOwn(transitions,status) || note.length > 500)
      return res.status(400).json({error:'Invalid order status or note.'});
    client = await pool.connect();
    await client.query('BEGIN');
    transactionOpen = true;
    const current = await client.query('SELECT id,order_status,payment_status,is_test FROM orders WHERE id=$1 FOR UPDATE',[req.params.id]);
    if (!current.rowCount) {
      await client.query('ROLLBACK'); transactionOpen = false;
      return res.status(404).json({error:'Order not found.'});
    }
    const previous = current.rows[0];
    if (!transitions[previous.order_status]?.includes(status)) {
      await client.query('ROLLBACK'); transactionOpen = false;
      return res.status(409).json({error:`Order cannot move from ${previous.order_status} to ${status}.`});
    }
    if (previous.is_test && ['shipped','delivered'].includes(status)) {
      await client.query('ROLLBACK'); transactionOpen = false;
      return res.status(409).json({error:'TEST ONLY orders cannot be shipped or marked delivered.'});
    }
    if (['processing','shipped','delivered'].includes(status) && previous.payment_status !== 'paid') {
      await client.query('ROLLBACK'); transactionOpen = false;
      return res.status(409).json({error:'An order cannot be processed or fulfilled until payment is independently confirmed.'});
    }
    if (status === 'cancelled' && previous.payment_status === 'paid') {
      await client.query('ROLLBACK'); transactionOpen = false;
      return res.status(409).json({error:'Paid order cannot be cancelled here. Complete the verified refund workflow first.'});
    }
    if (status === 'cancelled') {
      await client.query(
        `UPDATE products p SET stock=p.stock + oi.quantity
         FROM order_items oi
         WHERE oi.order_id=$1 AND oi.product_id=p.id`,
        [req.params.id]
      );
    }
    const updated = await client.query(
      'UPDATE orders SET order_status=$1 WHERE id=$2 RETURNING id,order_number,order_status,payment_status',
      [status,req.params.id]
    );
    await client.query(
      'INSERT INTO order_status_history(order_id,actor_id,from_status,to_status,note) VALUES($1,$2,$3,$4,$5)',
      [req.params.id,req.user.id,previous.order_status,status,note || null]
    );
    await client.query(
      'INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',
      [req.user.id,'order_status_changed','order',String(req.params.id),JSON.stringify({from:previous.order_status,to:status})]
    );
    await client.query('COMMIT');
    transactionOpen = false;
    res.json({order:updated.rows[0]});
  } catch(e) {
    if (transactionOpen && client) await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally { client?.release(); }
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

router.get('/pharmacists/applications', async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT id,full_name,email,phone,qualification,registration_number,issuing_authority,status,created_at
       FROM pharmacist_applications WHERE status='pending' ORDER BY created_at ASC LIMIT 200`
    );
    res.json({ applications: result.rows });
  } catch (e) { next(e); }
});

router.patch('/pharmacists/applications/:id', async (req,res,next) => {
  const decision = String(req.body?.decision || '');
  const notes = String(req.body?.notes || '').trim();
  if (!['approved','rejected'].includes(decision) || notes.length > 2000) {
    return res.status(400).json({ error: 'Decision र review notes ठीकसँग दिनुहोस्। Credential verification छुट्टै चरणमा हुन्छ।' });
  }
  let client;
  let open = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN'); open = true;
    const app = await client.query(
      "SELECT * FROM pharmacist_applications WHERE id=$1 AND status='pending' FOR UPDATE",
      [req.params.id]
    );
    if (!app.rowCount) {
      await client.query('ROLLBACK'); open = false;
      return res.status(404).json({ error: 'Pending pharmacist application भेटिएन।' });
    }
    const a = app.rows[0];
    if (decision === 'approved') {
      const existing = await client.query('SELECT id FROM users WHERE LOWER(email)=LOWER($1)',[a.email]);
      if (existing.rowCount) {
        await client.query('ROLLBACK'); open = false;
        return res.status(409).json({ error: 'यो email बाट पहिल्यै user account छ। Duplicate account स्वतः बनाइएन।' });
      }
      const created = await client.query(
        "INSERT INTO users(name,email,password_hash,role,is_active) VALUES($1,$2,$3,'pharmacist',TRUE) RETURNING id,name,email,role",
        [a.full_name,a.email,a.password_hash]
      );
      // Application approval creates a provisional account only. No uploaded credential
      // has been inspected yet, so clinical access must remain disabled.
      await client.query(
        `INSERT INTO pharmacist_profiles(user_id,qualification,registration_number,issuing_authority,
          credential_verified_by,credential_verified_at,is_credential_active)
         VALUES($1,$2,$3,$4,NULL,NULL,FALSE)`,
        [created.rows[0].id,a.qualification,a.registration_number,a.issuing_authority]
      );
    }
    await client.query(
      'UPDATE pharmacist_applications SET status=$1,password_hash=NULL,review_notes=$2,reviewed_by=$3,reviewed_at=NOW(),updated_at=NOW() WHERE id=$4',
      [decision,notes || null,req.user.id,req.params.id]
    );
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,$2,'pharmacist_application',$3,$4)`,
      [req.user.id,`pharmacist_application_${decision}`,req.params.id,JSON.stringify({registrationNumber:a.registration_number,provisionalAccount:decision==='approved'})]
    );
    await client.query('COMMIT'); open = false;
    res.json({ status: decision, message: decision === 'approved' ? 'Provisional Pharmacist account बन्यो। Credential upload र Super Admin verification पूरा नभएसम्म clinical access बन्द रहन्छ।' : 'आवेदन अस्वीकृत गरियो।' });
  } catch (e) {
    if (open && client) await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally { client?.release(); }
});

router.get('/medicine-reviews', async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (m.id) m.id AS medicine_id,m.name,m.nepali_name,m.verification_status,
              r.id AS review_id,r.recommendation,r.clinical_notes,r.sources,r.reviewed_at,
              u.name AS pharmacist_name,p.registration_number
       FROM medicines m
       JOIN medicine_reviews r ON r.medicine_id=m.id AND r.reviewed_at >= m.updated_at
       JOIN users u ON u.id=r.pharmacist_id
       JOIN pharmacist_profiles p ON p.user_id=u.id AND p.is_credential_active=TRUE
       WHERE m.verification_status <> 'verified' AND u.is_active=TRUE
       ORDER BY m.id,r.reviewed_at DESC`
    );
    res.json({ reviews: result.rows });
  } catch (e) { next(e); }
});

router.patch('/medicines/:id/publish-verification', async (req,res,next) => {
  let client;
  let open = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN'); open = true;
    // Serialize publishing with pharmacist reviews so a newer review cannot
    // replace the approved review between selection and publication.
    const medicine = await client.query(
      'SELECT id,verification_status FROM medicines WHERE id=$1 FOR UPDATE',
      [req.params.id]
    );
    if (!medicine.rowCount) {
      await client.query('ROLLBACK'); open = false;
      return res.status(404).json({ error: 'औषधि भेटिएन।' });
    }
    if (medicine.rows[0].verification_status === 'verified') {
      await client.query('ROLLBACK'); open = false;
      return res.status(409).json({ error: 'यो औषधि पहिले नै Verified छ।' });
    }
    const review = await client.query(
      `SELECT r.id,r.recommendation,r.clinical_notes,r.pharmacist_id,p.registration_number
       FROM medicine_reviews r
       JOIN medicines m ON m.id=r.medicine_id AND r.reviewed_at >= m.updated_at
       JOIN pharmacist_profiles p ON p.user_id=r.pharmacist_id AND p.is_credential_active=TRUE
       JOIN users u ON u.id=r.pharmacist_id AND u.is_active=TRUE
       WHERE r.medicine_id=$1 ORDER BY r.reviewed_at DESC LIMIT 1`,
      [req.params.id]
    );
    if (!review.rowCount || review.rows[0].recommendation !== 'approved') {
      await client.query('ROLLBACK'); open = false;
      return res.status(409).json({ error: 'अन्तिम Pharmacist review ले approval नदिएसम्म प्रकाशित Verified गर्न मिल्दैन।' });
    }
    const updated = await client.query(
      `UPDATE medicines SET verification_status='verified',verified_by=$1,
       pharmacist_registration=$2,verified_at=NOW(),verification_notes=$3,updated_at=NOW()
       WHERE id=$4 AND verification_status <> 'verified' RETURNING id,name,verification_status,verified_at`,
      [String(review.rows[0].pharmacist_id),review.rows[0].registration_number,review.rows[0].clinical_notes,req.params.id]
    );
    if (!updated.rowCount) {
      await client.query('ROLLBACK'); open = false;
      return res.status(404).json({ error: 'औषधि भेटिएन वा पहिले नै Verified छ।' });
    }
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,'medicine_verification_published','medicine',$2,$3)`,
      [req.user.id,req.params.id,JSON.stringify({reviewId:review.rows[0].id,pharmacistId:review.rows[0].pharmacist_id})]
    );
    await client.query('COMMIT'); open = false;
    res.json({ medicine: updated.rows[0] });
  } catch (e) {
    if (open && client) await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally { client?.release(); }
});


router.get('/pharmacists/accounts', async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT u.id,u.name,u.email,u.is_active,p.qualification,p.registration_number,
              p.issuing_authority,p.is_credential_active,p.credential_asset_id,p.credential_verified_at,
              reviewer.name AS verified_by_name
       FROM pharmacist_profiles p JOIN users u ON u.id=p.user_id
       LEFT JOIN users reviewer ON reviewer.id=p.credential_verified_by
       ORDER BY p.credential_verified_at DESC`
    );
    res.json({ pharmacists: result.rows });
  } catch (e) { next(e); }
});

router.patch('/pharmacists/accounts/:id/credential', async (req,res,next) => {
  const checkedAgainst=String(req.body?.checkedAgainst||'').trim();
  const notes=String(req.body?.notes||'').trim();
  if(checkedAgainst.length<5||checkedAgainst.length>300||notes.length>1000)
    return res.status(400).json({error:'Official issuing authority/register and review note are required.'});
  let client;
  try {
    client=await pool.connect();
    await client.query('BEGIN');
    const profile=await client.query(
      'SELECT user_id FROM pharmacist_profiles WHERE user_id=$1 FOR UPDATE',
      [req.params.id]
    );
    if(!profile.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Pharmacist profile not found.'});}
    const credential=await client.query(
      `SELECT a.id FROM pharmacist_profiles p
       JOIN private_assets a ON a.id=p.credential_asset_id AND a.owner_user_id=p.user_id
         AND a.status='uploaded' AND a.purpose='pharmacist_credential'
       WHERE p.user_id=$1`,
      [req.params.id]
    );
    if(!credential.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'Uploaded pharmacist credential document is required before verification.'});}
    const result=await client.query(
      `UPDATE pharmacist_profiles SET is_credential_active=true,credential_verified_by=$1,
       credential_verified_at=NOW() WHERE user_id=$2 RETURNING user_id,is_credential_active,credential_verified_at`,
      [req.user.id,req.params.id]
    );
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,'pharmacist_private_credential_verified','pharmacist',$2,$3)`,
      [req.user.id,String(req.params.id),JSON.stringify({checkedAgainst,notes,assetId:credential.rows[0].id})]
    );
    await client.query('COMMIT');
    res.json({pharmacist:result.rows[0],message:'Credential review recorded and pharmacist access activated.'});
  }catch(e){await client?.query('ROLLBACK').catch(()=>{});next(e);}
  finally{client?.release();}
});

router.patch('/pharmacists/accounts/:id/status', async (req,res,next) => {
  try {
    const active = req.body?.active;
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'active true वा false हुनुपर्छ।' });
    if(active){
      const verified=await pool.query(
        `SELECT p.user_id FROM pharmacist_profiles p
         JOIN private_assets a ON a.id=p.credential_asset_id AND a.owner_user_id=p.user_id
           AND a.status='uploaded' AND a.purpose='pharmacist_credential'
         WHERE p.user_id=$1 AND p.credential_verified_at IS NOT NULL`,
        [req.params.id]
      );
      if(!verified.rowCount)return res.status(409).json({error:'A current uploaded credential must be reviewed by Super Admin before reactivation.'});
    }
    const result = await pool.query(
      `UPDATE users u SET is_active=$1,updated_at=NOW()
       FROM pharmacist_profiles p
       WHERE u.id=$2 AND p.user_id=u.id
       RETURNING u.id,u.name,u.email,u.is_active`,
      [active,req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Pharmacist account भेटिएन।' });
    await pool.query(
      'UPDATE pharmacist_profiles SET is_credential_active=$1 WHERE user_id=$2',
      [active,req.params.id]
    );
    await audit(req.user.id,active?'pharmacist_credential_reactivated':'pharmacist_credential_suspended','pharmacist',req.params.id,{active});
    res.json({ pharmacist: result.rows[0] });
  } catch (e) { next(e); }
});

export default router;
