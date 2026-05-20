import { Router, Request, Response } from 'express';
import pool from '../services/db';
import { sendVerificationCode } from '../services/mail';
import { requireAuth } from '../middleware/auth';

const router = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await pool.query(
      'SELECT id, email, name, role, registration_date, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (user.rows.length === 0) return res.status(404).send('User not found');
    res.render('profile', {
      title: '个人设置',
      user: user.rows[0],
      error: req.query.error || null,
      success: req.query.success || null,
      deleteSent: req.query.deleteSent === '1',
      deleteError: req.query.deleteError || null,
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || !name.trim() || name.trim().length > 50) {
    return res.redirect('/profile?error=' + encodeURIComponent('名称不能为空且不超过50个字符'));
  }
  try {
    await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), req.session.userId]);
    req.session.userName = name.trim();
    res.redirect('/profile?success=' + encodeURIComponent('名称已更新'));
  } catch (err) {
    console.error('Update name error:', err);
    res.redirect('/profile?error=' + encodeURIComponent('服务器错误'));
  }
});

router.post('/delete/send-code', requireAuth, async (req: Request, res: Response) => {
  const email = req.session.userEmail;
  if (!email) return res.redirect('/auth/login');

  try {
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
    res.redirect('/profile?deleteSent=1');
  } catch (err) {
    console.error('Send delete code error:', err);
    res.redirect('/profile?deleteError=' + encodeURIComponent('发送验证码失败，请重试'));
  }
});

router.post('/delete/confirm', requireAuth, async (req: Request, res: Response) => {
  const { code } = req.body;
  const email = req.session.userEmail;
  if (!email) return res.redirect('/auth/login');

  if (!code || !/^\d{6}$/.test(code)) {
    return res.redirect('/profile?deleteSent=1&deleteError=' + encodeURIComponent('验证码为6位数字'));
  }

  try {
    const result = await pool.query(
      `SELECT id FROM verification_codes
       WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.redirect('/profile?deleteSent=1&deleteError=' + encodeURIComponent('验证码无效或已过期'));
    }

    await pool.query('UPDATE verification_codes SET used = true WHERE id = $1', [result.rows[0].id]);
    await pool.query('DELETE FROM users WHERE id = $1', [req.session.userId]);

    req.session.destroy(() => {
      res.redirect('/');
    });
  } catch (err) {
    console.error('Delete confirm error:', err);
    res.redirect('/profile?deleteSent=1&deleteError=' + encodeURIComponent('服务器错误，请重试'));
  }
});

export default router;
