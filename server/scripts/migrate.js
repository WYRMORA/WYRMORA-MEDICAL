import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
try {
  for (const file of ['001_init.sql','002_medical.sql','003_pharmacist_verification.sql','004_admin_roles.sql','005_medicine_reports.sql','006_order_status_history.sql','007_safe_test_orders.sql','008_pharmacist_workflow.sql','009_pharmacist_application_password_cleanup.sql','010_account_tokens.sql','011_session_version.sql']) {
    const sql = await fs.readFile(path.join(here, '../migrations', file), 'utf8');
    await pool.query(sql);
    console.log(`${file} applied.`);
  }
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally { await pool.end(); }
