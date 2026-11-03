import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
const router=Router();
router.use(requireAuth);

router.post('/',async(req,res,next)=>{
  try{
    const subject=String(req.body?.subject||'').trim();
    const message=String(req.body?.message||'').trim();
    if(subject.length<3||subject.length>160||message.length<8||message.length>4000)
      return res.status(400).json({error:'Subject and message are required.'});
    const result=await pool.query(
      `INSERT INTO support_tickets(user_id,subject,message) VALUES($1,$2,$3)
       RETURNING id,subject,message,status,created_at`,
      [req.user.id,subject,message]
    );
    res.status(201).json({ticket:result.rows[0]});
  }catch(e){next(e);}
});

router.get('/mine',async(req,res,next)=>{
  try{
    const result=await pool.query(
      'SELECT id,subject,message,status,created_at FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({tickets:result.rows});
  }catch(e){next(e);}
});
export default router;
