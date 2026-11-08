import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { createOpaqueToken, hashToken, sendAccountEmail, buildAccountLink, isEmailDeliveryConfigured } from '../lib/email.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false });
const genericReset = { message: 'If the account is eligible, instructions will be sent to the registered email address.' };
const genericVerify = { message: 'If the account needs verification, instructions will be sent to the registered email address.' };

async function issueToken(user, purpose, path, subject, intro) {
  const { token, hash } = createOpaqueToken();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE account_tokens SET consumed_at=NOW() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL',
      [user.id, purpose]
    );
    await client.query(
      'INSERT INTO account_tokens(user_id,purpose,token_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL \'30 minutes\')',
      [user.id, purpose, hash]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  const link = buildAccountLink(path, token);
  await sendAccountEmail({
    to: user.email,
    subject,
    text: `${intro}\n\n${link}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`,
    html: `<p>${intro}</p><p><a href="${link}">Continue to WYRMORA</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p>`
  });
}

router.post('/email-verification/request', limiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!isEmailDeliveryConfigured()) return res.status(202).json(genericVerify);
    const result = await pool.query('SELECT id,name,email,email_verified_at FROM users WHERE email=$1 AND is_active=true', [email]);
    if (result.rowCount && !result.rows[0].email_verified_at) {
      await issueToken(result.rows[0], 'email_verification', '/verify-email', 'Verify your WYRMORA email', 'Verify your email address to help secure your WYRMORA account.');
    }
    return res.status(202).json(genericVerify);
  } catch (error) {
    if (error.status === 502 || error.status === 503) return res.status(202).json(genericVerify);
    return next(error);
  }
});

router.post('/email-verification/confirm', limiter, async (req, res, next) => {
  const token = String(req.body?.token || '');
  if (token.length < 32 || token.length > 128) return res.status(400).json({ error: 'This verification link is invalid or expired.' });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT id,user_id FROM account_tokens
       WHERE token_hash=$1 AND purpose='email_verification' AND consumed_at IS NULL AND expires_at>NOW()
       FOR UPDATE`,
      [hashToken(token)]
    );
    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This verification link is invalid or expired.' });
    }
    await client.query('UPDATE users SET email_verified_at=NOW(),updated_at=NOW() WHERE id=$1', [found.rows[0].user_id]);
    await client.query("UPDATE account_tokens SET consumed_at=NOW() WHERE user_id=$1 AND purpose='email_verification' AND consumed_at IS NULL", [found.rows[0].user_id]);
    await client.query('COMMIT');
    return res.json({ message: 'Email address verified.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return next(error);
  } finally { client?.release(); }
});

router.post('/password-reset/request', limiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!isEmailDeliveryConfigured()) return res.status(202).json(genericReset);
    const result = await pool.query('SELECT id,name,email FROM users WHERE email=$1 AND is_active=true', [email]);
    if (result.rowCount) {
      await issueToken(result.rows[0], 'password_reset', '/reset-password', 'Reset your WYRMORA password', 'A password reset was requested for your WYRMORA account.');
    }
    return res.status(202).json(genericReset);
  } catch (error) {
    if (error.status === 502 || error.status === 503) return res.status(202).json(genericReset);
    return next(error);
  }
});

router.post('/password-reset/confirm', limiter, async (req, res, next) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (token.length < 32 || token.length > 128 || password.length < 10 || password.length > 72 ||
      !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'The reset link or new password is invalid.' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT id,user_id FROM account_tokens
       WHERE token_hash=$1 AND purpose='password_reset' AND consumed_at IS NULL AND expires_at>NOW()
       FOR UPDATE`,
      [hashToken(token)]
    );
    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'The reset link or new password is invalid.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [passwordHash, found.rows[0].user_id]);
    await client.query('UPDATE account_tokens SET consumed_at=NOW() WHERE user_id=$1 AND purpose IN (\'password_reset\',\'email_verification\') AND consumed_at IS NULL', [found.rows[0].user_id]);
    await client.query('COMMIT');
    return res.json({ message: 'Password updated. Please sign in again.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return next(error);
  } finally { client?.release(); }
});

export default router;
