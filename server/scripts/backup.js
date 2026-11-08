import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { config } from '../src/config.js';

function connectionArgs(url, database) {
  const parsed = new URL(url);
  return {
    args: ['--host',parsed.hostname,'--port',parsed.port || '5432','--username',decodeURIComponent(parsed.username),'--dbname',database || decodeURIComponent(parsed.pathname.slice(1))],
    env: { ...process.env, PGPASSWORD: decodeURIComponent(parsed.password) }
  };
}
const directory = path.resolve(process.env.BACKUP_DIR || './backups');
await fs.mkdir(directory,{recursive:true,mode:0o700});
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const target = path.join(directory,`wyrmora-${stamp}-${randomUUID().slice(0,8)}.dump`);
const connection = connectionArgs(config.databaseUrl);
const args = [...connection.args,'--format=custom','--no-owner','--no-acl','--file',target];
const child = spawn('pg_dump',args,{env:connection.env,stdio:'inherit'});
const code = await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
if(code!==0){await fs.rm(target,{force:true});process.exitCode=code||1;}
else {
  const stat=await fs.stat(target);
  if(stat.size<100){await fs.rm(target,{force:true});throw new Error('Backup archive is unexpectedly small.');}
  console.log(`Backup created: ${target} (${stat.size} bytes)`);
}
