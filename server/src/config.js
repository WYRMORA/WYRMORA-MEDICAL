import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../.env') });
dotenv.config({ path: path.resolve(here, '../.env') });

const isTest = process.env.NODE_ENV === 'test';
const databaseUrl = process.env.DATABASE_URL || (isTest ? 'postgres://test:test@127.0.0.1:5432/test' : '');
const jwtSecret = process.env.JWT_SECRET || (isTest ? 'test-only-secret-that-is-long-enough-123456789' : '');
if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');
if (!jwtSecret) throw new Error('Missing required environment variable: JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl,
  jwtSecret,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim()).filter(Boolean),
  cookieName: process.env.COOKIE_NAME || 'wyrmora_session',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production'),
  nodeEnv: process.env.NODE_ENV || 'development',
  enableTestOrderWorkflow: process.env.ENABLE_TEST_ORDER_WORKFLOW === 'true',
  // Commercial marketplace checkout is opt-in only after legal, pharmacy and payment approvals.
  enableMarketplaceOrders: process.env.ENABLE_MARKETPLACE_ORDERS === 'true'
};
