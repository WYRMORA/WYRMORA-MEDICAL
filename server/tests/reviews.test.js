import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db.js';
import { config } from '../src/config.js';
import { createApp } from '../src/app.js';

test('product reviews require a delivered and paid order', async () => {
  const originalQuery = pool.query;
  pool.query = async sql => {
    if (sql.includes('FROM users WHERE id=$1')) {
      return { rows: [{ id: '42', name: 'Test', email: 'test@example.com', role: 'customer', is_active: true }], rowCount: 1 };
    }
    if (sql.includes('FROM order_items oi JOIN orders o')) return { rows: [], rowCount: 0 };
    throw new Error('Unexpected SQL in review test');
  };
  try {
    const token = jwt.sign({ email: 'test@example.com' }, config.jwtSecret, {
      subject: '42', issuer: 'wyrmora-api', audience: 'wyrmora-client', expiresIn: '8h'
    });
    const response = await request(createApp()).post('/api/products/9/reviews')
      .set('Cookie', config.cookieName + '=' + token)
      .set('Origin', config.clientOrigins[0])
      .send({ rating: 5, comment: 'Good product and service.' });
    assert.equal(response.status, 403);
    assert.match(response.body.error, /after ordering/i);
  } finally {
    pool.query = originalQuery;
  }
});
