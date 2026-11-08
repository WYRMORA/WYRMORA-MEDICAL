import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { pool } from '../src/db.js';

after(async () => {
  await pool.end();
});

test('PostgreSQL migrations and customer account workflow work end to end', async () => {
  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE'`
  );
  const tableNames = new Set(tables.rows.map(row => row.table_name));
  for (const table of ['users','medicines','support_tickets','orders','cart_items','pharmacist_applications','medicine_reviews','audit_logs']) {
    assert.equal(tableNames.has(table), true, `missing migrated table: ${table}`);
  }

  const medicines = await request(createApp()).get('/api/medicines');
  assert.equal(medicines.status, 200);
  assert.ok(medicines.body.items.length >= 6);
  assert.ok(medicines.body.items.every(item => item.priceVerified === false));

  const app = createApp();
  const email = `integration-${crypto.randomUUID()}@example.test`;
  const password = 'StrongPass123!';
  let userId;

  try {
    const registration = await request(app)
      .post('/api/auth/register')
      .set('Origin', config.clientOrigins[0])
      .send({ name: 'Integration Customer', email, password });

    assert.equal(registration.status, 201);
    assert.equal(registration.body.user.email, email);
    assert.equal(Object.hasOwn(registration.body.user, 'password_hash'), false);

    const cookie = registration.headers['set-cookie']?.find(value => value.startsWith(`${config.cookieName}=`))?.split(';')[0];
    assert.ok(cookie, 'registration should set an HttpOnly session cookie');
    userId = registration.body.user.id;

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, userId);

    const ticket = await request(app)
      .post('/api/support')
      .set('Cookie', cookie)
      .set('Origin', config.clientOrigins[0])
      .send({ subject: 'Integration support', message: 'This is a valid integration support ticket.' });
    assert.equal(ticket.status, 201);

    const tickets = await request(app).get('/api/support/mine').set('Cookie', cookie);
    assert.equal(tickets.status, 200);
    assert.equal(tickets.body.tickets.length, 1);
    assert.equal(tickets.body.tickets[0].id, ticket.body.ticket.id);

    const cart = await request(app).get('/api/cart').set('Cookie', cookie);
    assert.equal(cart.status, 200);
    const checkout = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .set('Origin', config.clientOrigins[0])
      .send({ shippingAddress: '123 Main Street, Kathmandu' });
    assert.equal(checkout.status, 403);

    const login = await request(app)
      .post('/api/auth/login')
      .set('Origin', config.clientOrigins[0])
      .send({ email, password });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.id, userId);
  } finally {
    if (userId) {
      await pool.query('DELETE FROM support_tickets WHERE user_id=$1', [userId]);
      await pool.query('DELETE FROM users WHERE id=$1', [userId]);
    }
  }
});
