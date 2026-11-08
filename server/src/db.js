import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Pool-level errors can contain connection or SQL details. Log only the code.
pool.on('error', (err) => console.error('Unexpected PostgreSQL pool error:', { code: err.code }));
