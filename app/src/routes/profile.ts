import { Router, Request, Response } from 'express';
import pool from '../services/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await pool.query(
      'SELECT id, email, name, role, registration_date, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (user.rows.length === 0) return res.status(404).send('User not found');
    res.render('profile', { title: '个人设置', user: user.rows[0], error: null, success: null });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || !name.trim() || name.trim().length > 50) {
    const user = await pool.query('SELECT id, email, name, role, registration_date, created_at FROM users WHERE id = $1', [req.session.userId]);
    return res.render('profile', { title: '个人设置', user: user.rows[0], error: '名称不能为空且不超过50个字符', success: null });
  }
  try {
    await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), req.session.userId]);
    req.session.userName = name.trim();
    const user = await pool.query('SELECT id, email, name, role, registration_date, created_at FROM users WHERE id = $1', [req.session.userId]);
    res.render('profile', { title: '个人设置', user: user.rows[0], error: null, success: '名称已更新' });
  } catch (err) {
    console.error('Update name error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/delete', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.session.userId]);
    req.session.destroy(() => {
      res.redirect('/');
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).send('Server error');
  }
});

export default router;
