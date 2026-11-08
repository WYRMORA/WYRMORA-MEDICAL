import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const khaltiBase = () => process.env.KHALTI_ENV === 'production' ? 'https://khalti.com/api/v2' : 'https://dev.khalti.com/api/v2';
const configured = () => Boolean(process.env.KHALTI_SECRET_KEY && process.env.KHALTI_RETURN_URL && process.env.KHALTI_WEBSITE_URL);
async function khalti(path, payload) {
  const response = await fetch(`${khaltiBase()}${path}`, {
    method: 'POST',
    headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('Payment provider request failed.');
    error.status = 502;
    throw error;
  }
  return data;
}

router.post('/khalti/initiate', allowRoles('customer'), async (req,res,next) => {
  const client = await pool.connect();
  let paymentId;
  try {
    if (!configured()) return res.status(503).json({ error: 'Khalti payment is not configured.' });
    await client.query('BEGIN');
    const order = await client.query(
      `SELECT id,order_number,total_amount,payment_status FROM orders
       WHERE id=$1 AND user_id=$2 AND is_test=false FOR UPDATE`,
      [req.body?.orderId,req.user.id]
    );
    if (!order.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Order not found.' }); }
    if (order.rows[0].payment_status === 'paid') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Order is already paid.' }); }
    const amountPaisa = Math.round(Number(order.rows[0].total_amount) * 100);
    if (!Number.isSafeInteger(amountPaisa) || amountPaisa < 1000) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Khalti minimum payment is NPR 10.' }); }
    const purchaseOrderId = `WYRMORA-${order.rows[0].id}-${randomUUID()}`;
    const inserted = await client.query(
      `INSERT INTO payment_transactions(order_id,user_id,provider,purchase_order_id,amount_paisa,status)
       VALUES($1,$2,'khalti',$3,$4,'initiating') RETURNING id`,
      [order.rows[0].id,req.user.id,purchaseOrderId,amountPaisa]
    );
    paymentId = inserted.rows[0].id;
    await client.query("UPDATE orders SET payment_status='pending' WHERE id=$1 AND payment_status<>'paid'",[order.rows[0].id]);
    await client.query('COMMIT');
    const result = await khalti('/epayment/initiate/', {
      return_url: process.env.KHALTI_RETURN_URL,
      website_url: process.env.KHALTI_WEBSITE_URL,
      amount: amountPaisa,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: order.rows[0].order_number
    });
    if (!result.pidx || !result.payment_url) throw Object.assign(new Error('Payment provider returned an invalid response.'),{status:502});
    await pool.query(
      "UPDATE payment_transactions SET pidx=$1,payment_url=$2,status='pending',updated_at=NOW() WHERE id=$3",
      [result.pidx,result.payment_url,paymentId]
    );
    return res.status(201).json({ payment: { id:paymentId,paymentUrl:result.payment_url,pidx:result.pidx,amountPaisa,provider:'khalti' } });
  } catch (e) {
    if (paymentId) await pool.query("UPDATE payment_transactions SET status='failed',updated_at=NOW() WHERE id=$1 AND status='initiating'",[paymentId]).catch(()=>{});
    return next(e);
  } finally { client.release(); }
});

router.post('/khalti/verify', allowRoles('customer'), async (req,res,next) => {
  try {
    if (!configured()) return res.status(503).json({ error: 'Khalti payment is not configured.' });
    const pidx = String(req.body?.pidx || '');
    if (pidx.length < 10 || pidx.length > 120) return res.status(400).json({ error: 'Invalid payment reference.' });
    const found = await pool.query(
      'SELECT id,order_id,amount_paisa,status FROM payment_transactions WHERE pidx=$1 AND user_id=$2 AND provider=$3',
      [pidx,req.user.id,'khalti']
    );
    if (!found.rowCount) return res.status(404).json({ error: 'Payment not found.' });
    const payment = found.rows[0];
    const result = await khalti('/epayment/lookup/',{ pidx });
    if (Number(result.total_amount) !== Number(payment.amount_paisa)) return res.status(409).json({ error: 'Payment amount does not match the order.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO payment_events(provider,event_key,payment_id,event_type,payload)
         VALUES('khalti',$1,$2,$3,$4) ON CONFLICT(provider,event_key) DO NOTHING`,
        [`lookup:${pidx}:${result.status}:${result.transaction_id || 'none'}`,payment.id,`lookup_${String(result.status).toLowerCase().replace(/[^a-z]+/g,'_')}`,JSON.stringify({status:result.status,total_amount:result.total_amount,transaction_id:result.transaction_id||null})]
      );
      if (result.status === 'Completed') {
        await client.query(
          "UPDATE payment_transactions SET status='completed',provider_status=$1,provider_transaction_id=$2,verified_at=COALESCE(verified_at,NOW()),updated_at=NOW() WHERE id=$3 AND status<>'refunded'",
          [result.status,result.transaction_id||null,payment.id]
        );
        await client.query("UPDATE orders SET payment_status='paid' WHERE id=$1 AND payment_status<>'refunded'",[payment.order_id]);
      } else if (['Expired','User canceled','Failed'].includes(result.status)) {
        await client.query("UPDATE payment_transactions SET status='failed',provider_status=$1,updated_at=NOW() WHERE id=$2 AND status<>'completed'",[result.status,payment.id]);
        await client.query("UPDATE orders SET payment_status='failed' WHERE id=$1 AND payment_status<>'paid'",[payment.order_id]);
      } else {
        await client.query("UPDATE payment_transactions SET provider_status=$1,updated_at=NOW() WHERE id=$2",[result.status,payment.id]);
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(()=>{}); throw e; } finally { client.release(); }
    return res.json({ status:result.status,verified:result.status==='Completed',message:result.status==='Completed'?'Payment verified.':'Payment is not confirmed; do not fulfill the order.' });
  } catch (e) { return next(e); }
});

router.get('/mine', allowRoles('customer'), async (req,res,next) => {
  try {
    const result=await pool.query(
      'SELECT id,order_id,provider,amount_paisa,status,provider_status,created_at,verified_at FROM payment_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json({ payments:result.rows });
  } catch(e){next(e);}
});

// Refunds are tracked as requests; actual provider-side refunds must be executed in the Khalti merchant dashboard and reconciled before marking refunded.
router.post('/:id/refund-request', allowRoles('customer'), async (req,res,next) => {
  try {
    const result=await pool.query(
      `UPDATE payment_transactions SET status='refund_requested',updated_at=NOW()
       WHERE id=$1 AND user_id=$2 AND status='completed'
       RETURNING id,order_id,status`,
      [req.params.id,req.user.id]
    );
    if(!result.rowCount)return res.status(409).json({error:'Only a completed payment can be submitted for refund review.'});
    await pool.query("INSERT INTO payment_events(provider,event_key,payment_id,event_type,payload) VALUES('khalti',$1,$2,'refund_requested',$3) ON CONFLICT(provider,event_key) DO NOTHING",
      [`refund-request:${result.rows[0].id}`,result.rows[0].id,JSON.stringify({requestedBy:req.user.id})]);
    res.status(202).json({refundRequest:{paymentId:result.rows[0].id,status:'refund_requested'},message:'Refund request recorded for administrator review.'});
  }catch(e){next(e);}
});

router.patch('/:id/refund-confirm', allowRoles('super_admin'), async (req,res,next) => {
  try {
    const transactionId=String(req.body?.providerTransactionId||'').trim();
    if(transactionId.length<5||transactionId.length>120)return res.status(400).json({error:'A verified provider refund transaction ID is required.'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const payment=await client.query("SELECT id,order_id FROM payment_transactions WHERE id=$1 AND status='refund_requested' FOR UPDATE",[req.params.id]);
      if(!payment.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Refund request not found.'});}
      await client.query("UPDATE payment_transactions SET status='refunded',provider_status='Refunded',updated_at=NOW() WHERE id=$1",[req.params.id]);
      await client.query("UPDATE orders SET payment_status='refunded' WHERE id=$1",[payment.rows[0].order_id]);
      await client.query("INSERT INTO payment_events(provider,event_key,payment_id,event_type,payload) VALUES('khalti',$1,$2,'refund_confirmed',$3) ON CONFLICT(provider,event_key) DO NOTHING",
        [`refund-confirm:${req.params.id}`,req.params.id,JSON.stringify({providerTransactionId:transactionId,confirmedBy:req.user.id})]);
      await client.query('COMMIT');
      res.json({status:'refunded'});
    }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
  }catch(e){next(e);}
});
export default router;
