import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { config } from '../src/config.js';

const file = process.argv[2];
if(!file){console.error('Usage: npm run backup:verify -- <backup.dump>');process.exit(2);}
await fs.access(file);
const parsed = new URL(config.databaseUrl);
const username=decodeURIComponent(parsed.username), password=decodeURIComponent(parsed.password);
const host=parsed.hostname, port=parsed.port || '5432';
const adminUrl=new URL(config.databaseUrl);adminUrl.pathname='/postgres';
const admin=new pg.Client({connectionString:adminUrl.toString()});
const database=`wyrmora_restore_check_${randomUUID().replace(/-/g,'').slice(0,16)}`;
let created=false;
try{
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);created=true;
  const args=['--host',host,'--port',port,'--username',username,'--dbname',database,'--no-owner','--no-acl','--exit-on-error',file];
  const child=spawn('pg_restore',args,{env:{...process.env,PGPASSWORD:password,...(parsed.searchParams.get('sslmode')?{PGSSLMODE:parsed.searchParams.get('sslmode')}:{})},stdio:'inherit'});
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
  if(code!==0)throw new Error(`pg_restore failed with exit code ${code}`);
  const restoredUrl=new URL(config.databaseUrl);restoredUrl.pathname=`/${database}`;
  const restored=new pg.Client({connectionString:restoredUrl.toString()});
  await restored.connect();
  try{
    const result=await restored.query("SELECT COUNT(*)::int AS tables FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
    if(result.rows[0].tables<1)throw new Error('Restored database has no public tables.');
    console.log(`Restore verification succeeded: ${result.rows[0].tables} public tables restored into temporary database.`);
  }finally{await restored.end();}
}finally{
  if(created)await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`).catch(()=>{});
  await admin.end().catch(()=>{});
}
