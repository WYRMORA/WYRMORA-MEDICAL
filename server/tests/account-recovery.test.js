import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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


test('required customer email verification blocks login until the address is confirmed', async () => {
  const originalQuery=pool.query;
  const originalRequired=config.requireVerifiedEmail;
  const passwordHash=await bcrypt.hash('StrongPass123!',4);
  config.requireVerifiedEmail=true;
  pool.query=async sql=>{
    assert.match(sql,/email_verified_at/);
    return {rows:[{id:'72',name:'Unverified Customer',email:'unverified@example.test',role:'customer',password_hash:passwordHash,session_version:0,email_verified_at:null}],rowCount:1};
  };
  try{
    const response=await request(createApp())
      .post('/api/auth/login')
      .set('Origin',config.clientOrigins[0])
      .send({email:'unverified@example.test',password:'StrongPass123!'});
    assert.equal(response.status,403);
    assert.match(response.body.error,/Email verification is required/);
    assert.equal(response.headers['set-cookie'],undefined);
  }finally{pool.query=originalQuery;config.requireVerifiedEmail=originalRequired;}
});

test('required customer email verification blocks existing unverified sessions', async () => {
  const originalQuery=pool.query;
  const originalRequired=config.requireVerifiedEmail;
  config.requireVerifiedEmail=true;
  pool.query=async sql=>{
    assert.match(sql,/email_verified_at/);
    return {rows:[{id:'73',name:'Unverified Customer',email:'session@example.test',role:'customer',is_active:true,session_version:0,email_verified_at:null}],rowCount:1};
  };
  const token=jwt.sign({email:'session@example.test',sessionVersion:0},config.jwtSecret,{
    subject:'73',issuer:'wyrmora-api',audience:'wyrmora-client',expiresIn:'8h'
  });
  try{
    const response=await request(createApp()).get('/api/auth/me')
      .set('Cookie',`${config.cookieName}=${token}`);
    assert.equal(response.status,403);
    assert.match(response.body.error,/Email verification is required/);
  }finally{pool.query=originalQuery;config.requireVerifiedEmail=originalRequired;}
});

test('registration does not create a customer session when email verification is required', async () => {
  const originalQuery=pool.query;
  const originalRequired=config.requireVerifiedEmail;
  config.requireVerifiedEmail=true;
  pool.query=async sql=>{
    assert.match(sql,/INSERT INTO users/);
    return {rows:[{id:'74',name:'New Customer',email:'new@example.test',role:'customer',session_version:0}],rowCount:1};
  };
  try{
    const response=await request(createApp())
      .post('/api/auth/register')
      .set('Origin',config.clientOrigins[0])
      .send({name:'New Customer',email:'new@example.test',password:'StrongPass123!'});
    assert.equal(response.status,201);
    assert.equal(response.body.requiresEmailVerification,true);
    assert.equal(response.headers['set-cookie'],undefined);
  }finally{pool.query=originalQuery;config.requireVerifiedEmail=originalRequired;}
});
