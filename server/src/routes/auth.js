import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import { pool } from '../db.js';
import { config } from '../config.js';
import { registerSchema } from '../lib/validation.js';
import { requireAuth, cookieOptions } from '../middleware/auth.js';
const router = Router();
function setSession(res,user) {
 const token=jwt.sign({email:user.email},config.jwtSecret,{subject:String(user.id),issuer:'wyrmora-api',audience:'wyrmora-client',expiresIn:'8h'});
 res.cookie(config.cookieName,token,cookieOptions());
}
router.post('/register',async(req,res,next)=>{try{
 const parsed=registerSchema.safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Invalid registration details.',details:parsed.error.flatten()});
 const {name,email,password}=parsed.data,hash=await bcrypt.hash(password,12);
 const result=await pool.query("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'customer') RETURNING id,name,email,role",[name,email,hash]);
 setSession(res,result.rows[0]);res.status(201).json({user:result.rows[0]});
}catch(err){if(err.code==='23505')return res.status(409).json({error:'An account with this email already exists.'});next(err);}});
router.post('/login',async(req,res,next)=>{try{
 const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');
 if(!email||!password||email.length>254||password.length>72)return res.status(400).json({error:'Email and password are required.'});
 const result=await pool.query('SELECT id,name,email,role,password_hash FROM users WHERE email=$1 AND is_active=true',[email]),user=result.rows[0];
 if(!user||!(await bcrypt.compare(password,user.password_hash)))return res.status(401).json({error:'Email or password is incorrect.'});
 setSession(res,user);delete user.password_hash;res.json({user});
}catch(err){next(err);}});
router.post('/bootstrap-super-admin',async(req,res,next)=>{
 const expected=Buffer.from(process.env.ADMIN_BOOTSTRAP_TOKEN||''),supplied=Buffer.from(String(req.get('x-bootstrap-token')||''));
 if(!expected.length||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return res.status(403).json({error:'Bootstrap is not available.'});
 try{
  const {name,email,password}=req.body||{},cleanName=String(name||'').trim(),cleanEmail=String(email||'').trim().toLowerCase();
  if(cleanName.length<2||cleanName.length>80||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)||String(password||'').length<12||String(password).length>72)return res.status(400).json({error:'Provide a name, valid email, and password of 12–72 characters.'});
  const hash=await bcrypt.hash(password,12),client=await pool.connect();
  try{
   await client.query('BEGIN');await client.query('LOCK TABLE users IN EXCLUSIVE MODE');
   const count=await client.query("SELECT COUNT(*)::int AS count FROM users WHERE role='super_admin'");
   if(count.rows[0].count>0){await client.query('ROLLBACK');return res.status(409).json({error:'A Super Admin already exists. Bootstrap is closed.'});}
   const created=await client.query("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'super_admin') RETURNING id,name,email,role",[cleanName,cleanEmail,hash]);
   await client.query("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,'super_admin_bootstrap','user',$2,$3)",[created.rows[0].id,String(created.rows[0].id),JSON.stringify({email:cleanEmail})]);
   await client.query('COMMIT');setSession(res,created.rows[0]);return res.status(201).json({user:created.rows[0]});
  }catch(error){await client.query('ROLLBACK').catch(()=>{});if(error.code==='23505')return res.status(409).json({error:'An account with this email already exists.'});throw error;}finally{client.release();}
 }catch(err){next(err);}
});
router.post('/logout',(req,res)=>{res.clearCookie(config.cookieName,{...cookieOptions(),maxAge:undefined});res.status(204).end();});
router.get('/me',requireAuth,(req,res)=>{const{id,name,email,role}=req.user;res.json({user:{id,name,email,role}});});
export default router;
