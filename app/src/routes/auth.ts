import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../services/db';
import { sendVerificationCode } from '../services/mail';

const router = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const DAILY_LIMIT = 100;

router.get('/register', (_req: Request, res: Response) => {
  res.render('auth/register', { title: 'Register', error: null, email: '', sent: false });
});

router.post('/register', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.render('auth/register', { title: 'Register', error: 'Invalid email', email, sent: false });
  }

  try {
    const count = await pool.query(
      'SELECT COUNT(*) FROM users WHERE registration_date = CURRENT_DATE'
    );
    if (parseInt(count.rows[0].count) >= DAILY_LIMIT) {
      return res.render('auth/register', {
        title: 'Register', error: 'Daily registration limit (100) reached. Try again tomorrow.',
        email, sent: false,
      });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.render('auth/register', {
        title: 'Register', error: 'Email already registered. Please login.',
        email, sent: false,
      });
    }

    const code = generateCode();
    await pool.query(
      'UPDATE verification_codes SET used = true WHERE email = $1 AND used = false',
      [email]
    );
    await pool.query(
      `INSERT INTO verification_codes (email, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [email, code]
    );

    await sendVerificationCode(email, code);
    res.render('auth/register', { title: 'Register', error: null, email, sent: true });
  } catch (err) {
    console.error('Register error:', err);
    res.render('auth/register', {         title: 'Register', error: 'Server error. Try again.', email, sent: false });
  }
});

router.post('/register/verify', async (req: Request, res: Response) => {
  const { email, code } = req.body;

  try {
    const result = await pool.query(
      `SELECT id FROM verification_codes
       WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.render('auth/register', {
        error: 'Invalid or expired code.', email, sent: true,
      });
    }

    await pool.query('UPDATE verification_codes SET used = true WHERE id = $1', [result.rows[0].id]);

    const user = await pool.query(
      `INSERT INTO users (email) VALUES ($1)
       RETURNING id, role`,
      [email]
    );

    req.session.userId = user.rows[0].id;
    req.session.role = user.rows[0].role;
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Verify error:', err);
    res.render('auth/register', { title: 'Register', error: 'Server error.', email, sent: true });
  }
});

router.get('/login', (_req: Request, res: Response) => {
  res.render('auth/login', { title: 'Login', error: null, email: '', sent: false });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.render('auth/login', { title: 'Login', error: 'Invalid email', email, sent: false });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length === 0) {
      return res.render('auth/login', {
        title: 'Login', error: 'Email not registered. Please register first.',
        email, sent: false,
      });
    }

    const code = generateCode();
    await pool.query(
      'UPDATE verification_codes SET used = true WHERE email = $1 AND used = false',
      [email]
    );
    await pool.query(
      `INSERT INTO verification_codes (email, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [email, code]
    );

    await sendVerificationCode(email, code);
    res.render('auth/login', { title: 'Login', error: null, email, sent: true });
  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', { error: 'Server error.', email, sent: false });
  }
});

router.post('/login/verify', async (req: Request, res: Response) => {
  const { email, code } = req.body;

  try {
    const result = await pool.query(
      `SELECT v.id, u.id as uid, u.role FROM verification_codes v
       JOIN users u ON u.email = v.email
       WHERE v.email = $1 AND v.code = $2 AND v.used = false AND v.expires_at > NOW()
       ORDER BY v.created_at DESC LIMIT 1`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.render('auth/login', {
        title: 'Login', error: 'Invalid or expired code.', email, sent: true,
      });
    }

    await pool.query('UPDATE verification_codes SET used = true WHERE id = $1', [result.rows[0].id]);
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [result.rows[0].uid]);

    req.session.userId = result.rows[0].uid;
    req.session.role = result.rows[0].role;
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login verify error:', err);
    res.render('auth/login', { title: 'Login', error: 'Server error.', email, sent: true });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

export default router;
