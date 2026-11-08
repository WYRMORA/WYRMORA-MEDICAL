import test, { after } from 'node:test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
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
  const email = `integration-${randomUUID()}@example.test`;
  const password = 'StrongPass123!';
  let userId;
  let adminId;
  let sellerProductId;
  let categoryId;
  const pharmacistEmail = `pharmacist-${randomUUID()}@example.test`;
  const pharmacistRegistration = `NPC-${randomUUID()}`;

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
    const removeCartItem = await request(app).delete('/api/cart/items/999999').set('Cookie', cookie).set('Origin', config.clientOrigins[0]);
    assert.equal(removeCartItem.status, 204);
    const checkout = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .set('Origin', config.clientOrigins[0])
      .send({ shippingAddress: '123 Main Street, Kathmandu' });
    assert.equal(checkout.status, 403);

    const categoryName = `Integration Category ${randomUUID().slice(0,8)}`;
    const category = await pool.query(
      'INSERT INTO categories(name,slug) VALUES($1,$2) RETURNING id',
      [categoryName,`integration-${randomUUID()}`]
    );
    categoryId = category.rows[0].id;
    const sellerProfile = await request(app)
      .post('/api/seller/profile')
      .set('Cookie',cookie)
      .set('Origin',config.clientOrigins[0])
      .send({businessName:'Integration Pharmacy Store',description:'Integration test seller profile'});
    assert.equal(sellerProfile.status,201);
    const sellerRow=await pool.query('SELECT id FROM sellers WHERE user_id=$1',[userId]);
    const sellerId=sellerRow.rows[0].id;


    const adminEmail = `integration-admin-${randomUUID()}@example.test`;
    const admin = await pool.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'super_admin') RETURNING id",
      ['Integration Admin',adminEmail,'test-hash-not-used-for-login']
    );
    adminId = admin.rows[0].id;
    const adminToken = jwt.sign(
      { email: adminEmail }, config.jwtSecret,
      { subject: String(adminId), issuer: 'wyrmora-api', audience: 'wyrmora-client', expiresIn: '8h' }
    );
    const adminCookie = `${config.cookieName}=${adminToken}`;
    const sellerApprovalWithoutCredential=await request(app)
      .patch(`/api/admin/sellers/${sellerId}/verification`)
      .set('Cookie',adminCookie)
      .set('Origin',config.clientOrigins[0])
      .send({status:'verified',checkedAgainst:'Official register',notes:'Checked'});
    assert.equal(sellerApprovalWithoutCredential.status,409);
    const sellerCredentialId=randomUUID();
    await pool.query(
      `INSERT INTO private_assets(id,owner_user_id,purpose,object_key,original_name,content_type,size_bytes,status,uploaded_at)
       VALUES($1,$2,'seller_credential',$3,'license.pdf','application/pdf',1024,'uploaded',NOW())`,
      [sellerCredentialId,userId,`integration/private/seller/${sellerCredentialId}.pdf`]
    );
    await pool.query('UPDATE sellers SET credential_asset_id=$1 WHERE user_id=$2',[sellerCredentialId,userId]);
    const sellerApproval=await request(app)
      .patch(`/api/admin/sellers/${sellerId}/verification`)
      .set('Cookie',adminCookie)
      .set('Origin',config.clientOrigins[0])
      .send({status:'verified',checkedAgainst:'Official issuing authority register',notes:'Business identity and license checked.'});
    assert.equal(sellerApproval.status,200);
    assert.equal(sellerApproval.body.seller.verification_status,'verified');
    const listing = await request(app)
      .post('/api/seller/products')
      .set('Cookie',cookie)
      .set('Origin',config.clientOrigins[0])
      .send({name:'Integration Test Product',description:'A sufficiently detailed product description for integration testing.',categoryId,price:125,stock:8});
    assert.equal(listing.status,201);
    assert.equal(listing.body.product.status,'pending');
    sellerProductId = listing.body.product.id;
    const sellerProducts = await request(app).get('/api/seller/products').set('Cookie',cookie);
    assert.equal(sellerProducts.status,200);
    assert.equal(sellerProducts.body.products.length,1);
    const sellerAudit=await pool.query(
      `SELECT metadata FROM audit_logs WHERE actor_id=$1 AND action='seller_verification_updated' AND entity_id=$2 ORDER BY created_at DESC LIMIT 1`,
      [adminId,String(sellerId)]
    );
    assert.equal(sellerAudit.rowCount,1);
    assert.equal(sellerAudit.rows[0].metadata.assetId,sellerCredentialId);
    const approvedListing = await request(app)
      .patch(`/api/admin/products/${sellerProductId}/approve`)
      .set('Cookie',adminCookie)
      .set('Origin',config.clientOrigins[0])
      .send({status:'approved'});
    assert.equal(approvedListing.status,200);
    const publicListing = await request(app).get(`/api/products/${sellerProductId}`);
    assert.equal(publicListing.status,200);
    assert.equal(publicListing.body.product.name,'Integration Test Product');

    const application = await pool.query(
      `INSERT INTO pharmacist_applications(full_name,email,password_hash,qualification,registration_number,issuing_authority)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      ['Integration Pharmacist',pharmacistEmail,'temporary-test-hash','B.Pharm',pharmacistRegistration,'Nepal Pharmacy Council']
    );
    const rejection = await request(app)
      .patch(`/api/admin/pharmacists/applications/${application.rows[0].id}`)
      .set('Cookie', adminCookie)
      .set('Origin', config.clientOrigins[0])
      .send({ decision: 'rejected', notes: 'Credential details could not be independently confirmed.' });
    assert.equal(rejection.status, 200);
    const rejected = await pool.query('SELECT status,password_hash FROM pharmacist_applications WHERE id=$1',[application.rows[0].id]);
    assert.equal(rejected.rows[0].status,'rejected');
    assert.equal(rejected.rows[0].password_hash,null);

    const reapplication = await request(app)
      .post('/api/pharmacist/applications')
      .set('Origin', config.clientOrigins[0])
      .send({
        name:'Integration Pharmacist',
        email:pharmacistEmail,
        password:'StrongPass123!',
        qualification:'B.Pharm',
        registrationNumber:pharmacistRegistration,
        issuingAuthority:'Nepal Pharmacy Council'
      });
    assert.equal(reapplication.status,201);

    const approvedApplication = await request(app)
      .patch(`/api/admin/pharmacists/applications/${reapplication.body.application.id}`)
      .set('Cookie', adminCookie)
      .set('Origin', config.clientOrigins[0])
      .send({ decision:'approved', notes:'Provisional account created pending private credential review.' });
    assert.equal(approvedApplication.status,200);
    const provisional = await pool.query(
      `SELECT p.is_credential_active,p.credential_verified_at,p.credential_verified_by,u.id
       FROM pharmacist_profiles p JOIN users u ON u.id=p.user_id WHERE u.email=$1`,
      [pharmacistEmail]
    );
    assert.equal(provisional.rowCount,1);
    assert.equal(provisional.rows[0].is_credential_active,false);
    assert.equal(provisional.rows[0].credential_verified_at,null);
    assert.equal(provisional.rows[0].credential_verified_by,null);
    const provisionalToken=jwt.sign({email:pharmacistEmail},config.jwtSecret,{
      subject:String(provisional.rows[0].id),issuer:'wyrmora-api',audience:'wyrmora-client',expiresIn:'8h'
    });
    const blockedClinicalAccess=await request(app).get('/api/pharmacist/medicines')
      .set('Cookie',`${config.cookieName}=${provisionalToken}`);
    assert.equal(blockedClinicalAccess.status,403);
    await pool.query('DELETE FROM users WHERE id=$1',[provisional.rows[0].id]);

    // A later deployment re-runs the migration chain. A rejected application
    // and its active reapplication must not make migration 008 fail.
    const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const migrationRerun = spawnSync(process.execPath, ['scripts/migrate.js'], {
      cwd: serverDirectory,
      encoding: 'utf8',
      env: process.env
    });
    assert.equal(migrationRerun.status, 0, migrationRerun.stderr || migrationRerun.stdout);

    const login = await request(app)
      .post('/api/auth/login')
      .set('Origin', config.clientOrigins[0])
      .send({ email, password });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.id, userId);
  } finally {
    await pool.query('DELETE FROM pharmacist_applications WHERE email=$1',[pharmacistEmail]);
    if (sellerProductId) await pool.query('DELETE FROM products WHERE id=$1',[sellerProductId]);
    if (categoryId) await pool.query('DELETE FROM categories WHERE id=$1',[categoryId]);
    if (adminId) {
      await pool.query('DELETE FROM audit_logs WHERE actor_id=$1',[adminId]);
      await pool.query('DELETE FROM users WHERE id=$1',[adminId]);
    }
    if (userId) {
      await pool.query('DELETE FROM support_tickets WHERE user_id=$1', [userId]);
      await pool.query('DELETE FROM users WHERE id=$1', [userId]);
    }
  }
});
