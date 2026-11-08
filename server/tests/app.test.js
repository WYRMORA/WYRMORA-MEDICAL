import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import { spawnSync } from 'node:child_process';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db.js';
import { config } from '../src/config.js';
import { createApp } from '../src/app.js';
import { emailSchema } from '../src/lib/validation.js';
import { applicationSchema, createApplicationLimit, reviewSchema } from '../src/routes/pharmacist.js';

test('health endpoint reports API status', async () => {
  const app = createApp();
  const response = await request(app).get('/api/health');
  assert.equal(response.status,200);
  assert.equal(response.body.status,'ok');
});

test('unknown routes return JSON 404', async () => {
  const app = createApp();
  const response = await request(app).get('/api/not-a-route');
  assert.equal(response.status,404);
  assert.equal(response.body.error,'Route not found.');
});

test('unsafe requests reject a foreign browser origin', async () => {
  const app = createApp();
  const response = await request(app).post('/api/auth/login')
    .set('Origin','https://attacker.example')
    .send({email:'nobody@example.com',password:'bad'});
  assert.equal(response.status,403);
});

test('unsafe requests reject a missing browser origin', async () => {
  const app = createApp();
  const response = await request(app).post('/api/auth/login')
    .send({email:'nobody@example.com',password:'bad'});
  assert.equal(response.status,403);
});

test('registration validation rejects weak passwords', async () => {
  const app = createApp();
  const response = await request(app).post('/api/auth/register')
    .set('Origin','http://localhost:5173')
    .send({name:'Test User',email:'test@example.com',password:'weak'});
  assert.equal(response.status,400);
  assert.equal(response.body.error,'Invalid registration details.');
});

test('medicine write endpoint requires an authenticated admin session', async () => {
  const app = createApp();
  const response = await request(app).post('/api/medicines')
    .set('Origin','http://localhost:5173')
    .send({name:'Test',nepali:'परीक्षण'});
  assert.equal(response.status,401);
});

test('shared email validation accepts normal addresses and rejects malformed input', () => {
  assert.equal(emailSchema.safeParse('admin@example.com').success,true);
  assert.equal(emailSchema.safeParse('admin example.com').success,false);
});

test('pharmacist application schema normalizes email and rejects weak passwords', () => {
  const valid = applicationSchema.safeParse({
    name:' Test Pharmacist ',
    email:' PHARMACIST@EXAMPLE.COM ',
    password:'StrongPass123',
    qualification:'B.Pharm',
    registrationNumber:'NPC-12345'
  });
  assert.equal(valid.success,true);
  assert.equal(valid.data.email,'pharmacist@example.com');
  assert.equal(valid.data.name,'Test Pharmacist');
  assert.equal(valid.data.issuingAuthority,'Nepal Pharmacy Council');

  const weakPassword = applicationSchema.safeParse({
    name:'Test Pharmacist',
    email:'pharmacist@example.com',
    password:'weakpassword',
    qualification:'B.Pharm',
    registrationNumber:'NPC-12345'
  });
  assert.equal(weakPassword.success,false);
});

test('pharmacist application schema rejects missing credentials and malformed email', () => {
  const missingRegistration = applicationSchema.safeParse({
    name:'Test Pharmacist',
    email:'pharmacist@example.com',
    password:'StrongPass123',
    qualification:'B.Pharm',
    registrationNumber:' '
  });
  assert.equal(missingRegistration.success,false);

  const malformedEmail = applicationSchema.safeParse({
    name:'Test Pharmacist',
    email:'not-an-email',
    password:'StrongPass123',
    qualification:'B.Pharm',
    registrationNumber:'NPC-12345'
  });
  assert.equal(malformedEmail.success,false);
});

test('clinical review schema enforces recommendation, note and source requirements', () => {
  const valid = reviewSchema.safeParse({
    recommendation:'approved',
    clinicalNotes:'Reviewed dosage, contraindications, interactions and patient safety information.',
    sources:'Official medicine reference'
  });
  assert.equal(valid.success,true);

  const invalid = reviewSchema.safeParse({
    recommendation:'verified',
    clinicalNotes:'Too short',
    sources:'No'
  });
  assert.equal(invalid.success,false);
});

test('pharmacist medicine workspace requires an authenticated pharmacist session', async () => {
  const app = createApp();
  const response = await request(app).get('/api/pharmacist/medicines');
  assert.equal(response.status,401);
});

test('pharmacist application endpoint rejects invalid details before database access', async () => {
  const app = createApp();
  const response = await request(app).post('/api/pharmacist/applications')
    .set('Origin','http://localhost:5173')
    .send({
      name:'X',
      email:'bad-email',
      password:'weak',
      qualification:'',
      registrationNumber:''
    });
  assert.equal(response.status,400);
  assert.match(response.body.error,/आवेदनका/);
});


test('pharmacist application rate limit allows three requests and blocks the fourth per IP', async () => {
  // Isolated Express app and in-memory limiter: no real application route or database is used.
  const app = express();
  app.set('trust proxy', 1);
  app.post('/applications', createApplicationLimit(), (_req, res) => res.sendStatus(204));

  const first = await request(app).post('/applications');
  const second = await request(app).post('/applications');
  const third = await request(app).post('/applications');
  const fourth = await request(app).post('/applications');

  assert.equal(first.status, 204);
  assert.equal(second.status, 204);
  assert.equal(third.status, 204);
  assert.equal(fourth.status, 429);
});

test('demo seed script refuses to run in production mode', () => {
  const result = spawnSync(process.execPath, ['scripts/seed.js'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/test',
      JWT_SECRET: 'test-only-secret-that-is-long-enough-123456789'
    }
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Demo seed is disabled in production/);
  assert.doesNotMatch(result.stderr, /ECONNREFUSED|connect ECONN/);
});

test('transaction routes forward database connection failures to the JSON error handler', async () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const originalMarketplaceFlag = config.enableMarketplaceOrders;
  config.enableMarketplaceOrders = true;
  pool.query = async () => ({
    rows: [{ id: '42', name: 'Test User', email: 'test@example.com', role: 'customer', is_active: true }],
    rowCount: 1
  });
  pool.connect = async () => {
    throw new Error('simulated database connection failure');
  };

  try {
    const token = jwt.sign(
      { email: 'test@example.com' },
      config.jwtSecret,
      { subject: '42', issuer: 'wyrmora-api', audience: 'wyrmora-client', expiresIn: '8h' }
    );
    const app = createApp();
    const requests = [
      ['/api/orders', { shippingAddress: '123 Main Street, Kathmandu' }],
      ['/api/cart/items', { productId: 1, quantity: 1 }]
    ];

    for (const [path, body] of requests) {
      const response = await request(app)
        .post(path)
        .set('Cookie', `${config.cookieName}=${token}`)
        .set('Origin', config.clientOrigins[0])
        .send(body);
      assert.equal(response.status, 500);
      assert.equal(response.body.error, 'An unexpected server error occurred.');
    }
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  }
});

test('marketplace cart and checkout remain disabled by default even for authenticated customers', async () => {
  assert.equal(config.enableMarketplaceOrders, false);
  const originalQuery = pool.query;
  pool.query = async () => ({
    rows: [{ id: '42', name: 'Test User', email: 'test@example.com', role: 'customer', is_active: true }],
    rowCount: 1
  });
  try {
    const token = jwt.sign(
      { email: 'test@example.com' }, config.jwtSecret,
      { subject: '42', issuer: 'wyrmora-api', audience: 'wyrmora-client', expiresIn: '8h' }
    );
    const app = createApp();
    const cookie = `${config.cookieName}=${token}`;
    const cart = await request(app).get('/api/cart').set('Cookie', cookie);
    const checkout = await request(app).post('/api/orders')
      .set('Cookie', cookie).set('Origin', config.clientOrigins[0])
      .send({ shippingAddress: '123 Main Street, Kathmandu' });
    assert.equal(cart.status, 403);
    assert.equal(checkout.status, 403);
    assert.match(checkout.body.error, /checkout is disabled/i);
  } finally {
    pool.query = originalQuery;
  }
});
