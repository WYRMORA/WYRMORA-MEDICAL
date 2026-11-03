
import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

try {
  const migration = await fs.readFile(
    path.join(here, '../migrations/003_pharmacist_verification.sql'),
    'utf8'
  );

  await pool.query(migration);
  console.log('003_pharmacist_verification.sql applied.');

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`WYRMORA API listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received; shutting down...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
} catch (err) {
  console.error('Database migration or server startup failed:', err.message);
  await pool.end();
  process.exit(1);
}
