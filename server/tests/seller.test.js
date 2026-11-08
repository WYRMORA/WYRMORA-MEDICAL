import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db.js';
import { config } from '../src/config.js';
import { createApp } from '../src/app.js';

function customerToken() {
  return jwt.sign({ email: 'seller-test@example.com' }, config.jwtSecret, {
    subject: '42', issuer: 'wyrmora-api', audience: 'wyrmora-client', expiresIn: '8h'
  });
}

test('seller profile endpoint returns an empty profile for a customer account', async () => {
  const originalQuery = pool.query;
  pool.query = async sql => {
    if (sql.includes('FROM users WHERE id=$1')) {
      return { rows: [{ id: '42', name: 'Test Customer', email: 'seller-test@example.com', role: 'customer', is_active: true }], rowCount: 1 };
    }
    if (sql.includes('FROM sellers WHERE user_id=$1')) return { rows: [], rowCount: 0 };
    throw new Error('Unexpected SQL in seller profile test');
  };
  try {
    const response = await request(createApp()).get('/api/seller/profile')
      .set('Cookie', config.cookieName + '=' + customerToken());
    assert.equal(response.status, 200);
    assert.equal(response.body.profile, null);
  } finally { pool.query = originalQuery; }
});

test('seller profile rejects descriptions over 2000 characters before database writes', async () => {
  const originalQuery = pool.query;
  pool.query = async sql => {
    if (sql.includes('FROM users WHERE id=$1')) {
      return { rows: [{ id: '42', name: 'Test Customer', email: 'seller-test@example.com', role: 'customer', is_active: true }], rowCount: 1 };
    }
    throw new Error('Unexpected database query');
  };
  try {
    const response = await request(createApp()).post('/api/seller/profile')
      .set('Cookie', config.cookieName + '=' + customerToken())
      .set('Origin', config.clientOrigins[0])
      .send({ businessName: 'Test Pharmacy', description: 'x'.repeat(2001) });
    assert.equal(response.status, 400);
    assert.match(response.body.error, /2000 characters/);
  } finally { pool.query = originalQuery; }
});

test('seller listing category endpoint returns only active categories', async () => {
  const originalQuery = pool.query;
  pool.query = async sql => {
    assert.match(sql, /WHERE is_active=true/);
    return { rows: [{ id: 1, name: 'Health', slug: 'health' }], rowCount: 1 };
  };
  try {
    const response = await request(createApp()).get('/api/products/categories');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.categories, [{ id: 1, name: 'Health', slug: 'health' }]);
  } finally { pool.query = originalQuery; }
});
