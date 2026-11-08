import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

test('private upload presigning requires an authenticated session', async () => {
  const response = await request(createApp())
    .post('/api/uploads/presign')
    .set('Origin','http://localhost:5173')
    .send({ purpose:'product_image',fileName:'photo.png',contentType:'image/png',sizeBytes:1024 });
  assert.equal(response.status,401);
});

test('private upload download requires an authenticated session', async () => {
  const response = await request(createApp()).get('/api/uploads/00000000-0000-4000-8000-000000000000/download');
  assert.equal(response.status,401);
});

test('Khalti payment initiation requires an authenticated session', async () => {
  const response = await request(createApp())
    .post('/api/payments/khalti/initiate')
    .set('Origin','http://localhost:5173')
    .send({ orderId:1 });
  assert.equal(response.status,401);
});

test('payment verification and refund endpoints require an authenticated session', async () => {
  const app=createApp();
  const verify=await request(app)
    .post('/api/payments/khalti/verify')
    .set('Origin','http://localhost:5173')
    .send({pidx:'123456789012'});
  const refund=await request(app)
    .post('/api/payments/00000000-0000-4000-8000-000000000000/refund-request')
    .set('Origin','http://localhost:5173')
    .send({});
  assert.equal(verify.status,401);
  assert.equal(refund.status,401);
});


test('Super Admin credential and refund review endpoints require authentication', async () => {
  const app=createApp();
  const refunds=await request(app).get('/api/admin/refunds');
  const sellerCredential=await request(app).patch('/api/admin/sellers/1/verification')
    .set('Origin','http://localhost:5173').send({status:'verified'});
  const pharmacistCredential=await request(app).patch('/api/admin/pharmacists/accounts/1/credential')
    .set('Origin','http://localhost:5173').send({checkedAgainst:'Official register'});
  assert.equal(refunds.status,401);
  assert.equal(sellerCredential.status,401);
  assert.equal(pharmacistCredential.status,401);
});

test('Private upload completion and attachment require authentication', async () => {
  const app=createApp();
  const complete=await request(app).post('/api/uploads/00000000-0000-4000-8000-000000000000/complete')
    .set('Origin','http://localhost:5173').send({});
  const attach=await request(app).post('/api/uploads/00000000-0000-4000-8000-000000000000/attach')
    .set('Origin','http://localhost:5173').send({});
  assert.equal(complete.status,401);
  assert.equal(attach.status,401);
});
