import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';
export function requireAuth(req,res,next){
 const token=req.cookies?.[config.cookieName];if(!token)return res.status(401).json({error:'Authentication required.'});
 try{
  const payload=jwt.verify(token,config.jwtSecret,{issuer:'wyrmora-api',audience:'wyrmora-client'});
  pool.query('SELECT id,name,email,role,is_active,session_version FROM users WHERE id=$1',[payload.sub]).then(({rows})=>{
   const user=rows[0];if(!user||!user.is_active||(payload.sessionVersion ?? 0)!==(user.session_version ?? 0)){res.clearCookie(config.cookieName,{...cookieOptions(),maxAge:undefined});return res.status(401).json({error:'Account is unavailable.'});}
   req.user={id:String(user.id),name:user.name,email:user.email,role:user.role};next();
  }).catch(next);
 }catch{res.clearCookie(config.cookieName,{...cookieOptions(),maxAge:undefined});return res.status(401).json({error:'Session expired. Please sign in again.'});}
}
export function allowRoles(...roles){return(req,res,next)=>!req.user||!roles.includes(req.user.role)?res.status(403).json({error:'You do not have permission to do this.'}):next();}
export function cookieOptions(){return{httpOnly:true,secure:config.cookieSecure,sameSite:'lax',path:'/',maxAge:1000*60*60*8};}
