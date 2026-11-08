import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db.js';
import { config } from '../src/config.js';
import { createApp } from '../src/app.js';

test('medicine verification publication locks and confirms the medicine before review lookup', async () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const calls = [];
  pool.query = async sql => {
    if (sql.includes('FROM users WHERE id=$1')) {
      return { rows: [{ id: '7', name: 'Super Admin', email: 'admin@example.com', role: 'super_admin', is_active: true }], rowCount: 1 };
    }
    throw new Error('Unexpected pool query');
  };
  pool.connect = async () => ({
    query: async sql => {
      calls.push(sql);
      if (sql.includes('FROM medicines WHERE id=$1 FOR UPDATE')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    },
    release: () => {}
  });
  try {
    const token = jwt.sign({ email: 'admin@example.com' }, config.jwtSecret, {
      subject: '7', issuer: 'wyrmora-api', audience: 'wyrmora-client', expiresIn: '8h'
    });
    const response = await request(createApp()).patch('/api/admin/medicines/paracetamol/publish-verification')
      .set('Cookie', config.cookieName + '=' + token)
      .set('Origin', config.clientOrigins[0])
      .send({});
    assert.equal(response.status, 404);
    assert.ok(calls.indexOf('BEGIN') < calls.findIndex(sql => sql.includes('FROM medicines WHERE id=$1 FOR UPDATE')));
    assert.ok(calls.includes('ROLLBACK'));
    assert.equal(calls.some(sql => sql.includes('FROM medicine_reviews')), false);
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  }
});
