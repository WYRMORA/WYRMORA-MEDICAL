import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { createOpaqueToken, hashToken } from '../src/lib/email.js';
import { pool } from '../src/db.js';

test('account tokens are high-entropy opaque values and only hashes are stored', () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();
  assert.equal(first.token.length, 43);
  assert.equal(first.hash, hashToken(first.token));
  assert.notEqual(first.token, first.hash);
  assert.notEqual(first.hash, second.hash);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
});

test('password reset request does not disclose whether an email account exists', async () => {
  const originalQuery = pool.query;
  pool.query = async () => ({ rows: [], rowCount: 0 });
  try {
    const response = await request(createApp())
      .post('/api/account/password-reset/request')
      .set('Origin', config.clientOrigins[0])
      .send({ email: 'not-registered@example.test' });
    assert.equal(response.status, 202);
    assert.deepEqual(response.body, {
      message: 'If the account is eligible, instructions will be sent to the registered email address.'
    });
  } finally { pool.query = originalQuery; }
});

test('email verification request does not disclose whether an email account exists', async () => {
  const originalQuery = pool.query;
  pool.query = async () => ({ rows: [], rowCount: 0 });
  try {
    const response = await request(createApp())
      .post('/api/account/email-verification/request')
      .set('Origin', config.clientOrigins[0])
      .send({ email: 'not-registered@example.test' });
    assert.equal(response.status, 202);
    assert.deepEqual(response.body, {
      message: 'If the account needs verification, instructions will be sent to the registered email address.'
    });
  } finally { pool.query = originalQuery; }
});

test('malformed and expired-style account tokens are rejected without database access', async () => {
  const originalQuery = pool.query;
  pool.query = async () => { throw new Error('database should not be queried for malformed token'); };
  try {
    const verify = await request(createApp())
      .post('/api/account/email-verification/confirm')
      .set('Origin', config.clientOrigins[0])
      .send({ token: 'short' });
    const reset = await request(createApp())
      .post('/api/account/password-reset/confirm')
      .set('Origin', config.clientOrigins[0])
      .send({ token: 'short', password: 'weak' });
    assert.equal(verify.status, 400);
    assert.equal(reset.status, 400);
  } finally { pool.query = originalQuery; }
});
