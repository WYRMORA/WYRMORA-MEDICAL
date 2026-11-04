import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

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
