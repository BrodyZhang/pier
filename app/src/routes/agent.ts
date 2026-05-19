import { Router, Request, Response } from 'express';
import pool from '../services/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/new', requireAuth, (_req: Request, res: Response) => {
  res.render('agent/new', { title: 'New Agent', error: null });
});

router.post('/new', requireAuth, async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name || !name.trim() || !description || !description.trim()) {
    return res.render('agent/new', { title: 'New Agent', error: 'Name and description are required.' });
  }

  if (name.trim().length > 50) {
    return res.render('agent/new', { title: 'New Agent', error: '页面名称不能超过50个字符。' });
  }

  if (description.trim().length > 500) {
    return res.render('agent/new', { title: 'New Agent', error: '描述不能超过500个字符。' });
  }

  try {
    await pool.query(
      `INSERT INTO agent_requests (user_id, name, description)
       VALUES ($1, $2, $3)`,
      [req.session.userId, name.trim(), description.trim()]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Create agent error:', err);
    res.render('agent/new', { title: 'New Agent', error: 'Server error. Try again.' });
  }
});

router.get('/:slug', async (req: Request, res: Response) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.redirect('/auth/login');
  }

  try {
    const agent = await pool.query(
      `SELECT ar.*, u.email as creator_email FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
       WHERE ar.unique_slug = $1::uuid AND (ar.status = 'completed' OR ar.status = 'dev_review')`,
      [req.params.slug]
    );

    if (agent.rows.length === 0) {
      return res.status(404).send('Agent not found');
    }

    const a = agent.rows[0];
    const isAdmin = req.session.role === 'admin';
    const isCreator = a.user_id === userId;

    const share = await pool.query(
      'SELECT partner_user_id FROM agent_shares WHERE agent_id = $1',
      [a.id]
    );
    const isPartner = share.rows.length > 0 && share.rows[0].partner_user_id === userId;

    if (!isCreator && !isPartner && !isAdmin) {
      return res.status(403).send('Access denied. This agent is not shared with you.');
    }

    const file = await pool.query(
      'SELECT content FROM agent_files WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1',
      [a.id]
    );

    if (file.rows.length === 0) {
      return res.render('agent/not-ready', { title: a.name, name: a.name });
    }

    let html = file.rows[0].content;
    const disclaimer = `<div style="position:fixed;bottom:10px;right:10px;font-size:12px;color:rgba(255,255,255,0.3);z-index:9999;pointer-events:none;">AI 自动化学习中...</div>
<div style="position:fixed;bottom:10px;left:10px;font-size:11px;color:rgba(0,0,0,0.2);z-index:9999;pointer-events:none;">This page is for demonstration purposes only.</div>`;
    html = html.replace('</body>', `${disclaimer}</body>`);

    res.send(html);
  } catch (err) {
    console.error('Agent view error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/:slug/share', requireAuth, async (req: Request, res: Response) => {
  try {
    const agent = await pool.query(
      `SELECT * FROM agent_requests
       WHERE unique_slug = $1::uuid AND user_id = $2`,
      [req.params.slug, req.session.userId]
    );

    if (agent.rows.length === 0) {
      return res.status(404).send('Agent not found');
    }

    const share = await pool.query(
      'SELECT * FROM agent_shares WHERE agent_id = $1',
      [agent.rows[0].id]
    );

    res.render('agent/share', {
      title: 'Share Agent',
      agent: agent.rows[0],
      share: share.rows[0] || null,
      error: null,
      success: null,
    });
  } catch (err) {
    console.error('Share page error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/:slug/share', requireAuth, async (req: Request, res: Response) => {
  const { partnerEmail } = req.body;

  try {
    const agent = await pool.query(
      `SELECT * FROM agent_requests
       WHERE unique_slug = $1::uuid AND user_id = $2`,
      [req.params.slug, req.session.userId]
    );

    if (agent.rows.length === 0) {
      return res.status(404).send('Agent not found');
    }

    if (!partnerEmail || !partnerEmail.includes('@')) {
      return res.render('agent/share', {
        title: 'Share Agent', agent: agent.rows[0], share: null,
        error: 'Invalid email address.', success: null,
      });
    }

    const existing = await pool.query(
      'SELECT * FROM agent_shares WHERE agent_id = $1',
      [agent.rows[0].id]
    );

    if (existing.rows.length > 0) {
      return res.render('agent/share', {
        title: 'Share Agent', agent: agent.rows[0], share: existing.rows[0],
        error: 'Already shared with someone. Unshare first.', success: null,
      });
    }

    const partner = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [partnerEmail]
    );

    await pool.query(
      `INSERT INTO agent_shares (agent_id, partner_email, partner_user_id)
       VALUES ($1, $2, $3)`,
      [agent.rows[0].id, partnerEmail, partner.rows[0]?.id || null]
    );

    res.render('agent/share', {
      title: 'Share Agent', agent: agent.rows[0], share: { partner_email: partnerEmail },
      error: null,
      success: `Shared with ${partnerEmail}`,
    });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/:id/delete', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `DELETE FROM agent_requests
       WHERE id = $1::uuid AND user_id = $2
       RETURNING id`,
      [req.params.id, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Agent not found');
    }

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Agent delete error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/:slug/unshare', requireAuth, async (req: Request, res: Response) => {
  try {
    const agent = await pool.query(
      `SELECT id FROM agent_requests
       WHERE unique_slug = $1::uuid AND user_id = $2`,
      [req.params.slug, req.session.userId]
    );

    if (agent.rows.length === 0) {
      return res.status(404).send('Agent not found');
    }

    await pool.query('DELETE FROM agent_shares WHERE agent_id = $1', [agent.rows[0].id]);
    res.redirect(`/agent/${req.params.slug}/share`);
  } catch (err) {
    console.error('Unshare error:', err);
    res.status(500).send('Server error');
  }
});

export default router;
