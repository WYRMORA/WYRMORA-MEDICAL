import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';
import { registerSchema } from '../lib/validation.js';
import { requireAuth, cookieOptions } from '../middleware/auth.js';

const router = Router();

function setSession(res, user) {
  const token = jwt.sign(
    { role: user.role, email: user.email },
    config.jwtSecret,
    { subject: String(user.id), issuer: 'wyrmora-api', audience: 'wyrmora-client', expiresIn: '8h' }
  );
  res.cookie(config.cookieName, token, cookieOptions());
}

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid registration details.', details: parsed.error.flatten() });
    const { name, email, password } = parsed.data;
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'customer')
       RETURNING id,name,email,role`,
      [name, email, hash]
    );
    const user = result.rows[0];
    setSession(res, user);
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password || email.length > 254 || password.length > 72) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = await pool.query('SELECT id,name,email,role,password_hash FROM users WHERE email=$1 AND is_active=true', [email]);
    const user = result.rows[0];
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!valid) return res.status(401).json({ error: 'Email or password is incorrect.' });
    setSession(res, user);
    delete user.password_hash;
    res.json({ user });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, { ...cookieOptions(), maxAge: undefined });
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id,name,email,role FROM users WHERE id=$1 AND is_active=true', [req.user.id]);
    if (!result.rowCount) return res.status(401).json({ error: 'Account is unavailable.' });
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
});

export default router;
