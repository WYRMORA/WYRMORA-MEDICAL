import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

try {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed is disabled in production. Do not create demo marketplace accounts or listings on a live service.');
  }

  const categories = [
    ['Electronics','electronics'],['Fashion','fashion'],['Home','home'],['Books','books'],['Sports','sports']
  ];
  for (const [name,slug] of categories) {
    await pool.query('INSERT INTO categories(name,slug) VALUES($1,$2) ON CONFLICT(slug) DO NOTHING',[name,slug]);
  }

  const sellerHash = await bcrypt.hash('SellerDemo123!',12);
  const seller = await pool.query(
    `INSERT INTO users(name,email,password_hash,role)
     VALUES('Demo Seller','seller@wyrmora.test',$1,'seller')
     ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id`,
    [sellerHash]
  );
  await pool.query(`INSERT INTO sellers(user_id,business_name,description,verification_status)
    VALUES($1,'WYRMORA Select','Local development seed seller','verified') ON CONFLICT(user_id) DO NOTHING`,[seller.rows[0].id]);

  const cats = await pool.query('SELECT id,slug FROM categories');
  const map = Object.fromEntries(cats.rows.map(c=>[c.slug,c.id]));
  const items = [
    ['Studio Wireless Headphones','electronics','Comfortable over-ear audio for work and travel.',3499,20],
    ['Everyday Canvas Backpack','fashion','A durable everyday carry with a clean silhouette.',1890,30],
    ['Minimal Desk Lamp','home','Warm adjustable lighting for your workspace.',2250,15],
    ['The Creative Habit','books','A practical guide to building a creative routine.',950,40],
    ['Insulated Travel Bottle','home','Reusable stainless-steel bottle for daily hydration.',790,50],
    ['Classic Running Shoes','sports','Lightweight trainers for everyday movement.',4290,12]
  ];
  for (const [name,cat,description,price,stock] of items) {
    await pool.query(
      `INSERT INTO products(seller_id,category_id,name,description,price,stock,status)
       SELECT $1,$2,$3,$4,$5,$6,'approved'
       WHERE NOT EXISTS(SELECT 1 FROM products WHERE name=$3 AND seller_id=$1)`,
      [seller.rows[0].id,map[cat],name,description,price,stock]
    );
  }
  console.log('Development seed complete. Demo seller: seller@wyrmora.test / SellerDemo123!');
  console.log('This demo seller and its sample listings are for local development only.');
} catch (err) {
  console.error('Seed failed:',err.message);
  process.exitCode=1;
} finally { await pool.end(); }
