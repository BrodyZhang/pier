import { Router, Request, Response } from 'express';
import pool from '../services/db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const agents = await pool.query(
      `SELECT ar.*, u.email as creator_email,
        (SELECT COUNT(*) FROM agent_shares WHERE agent_id = ar.id) as share_count
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
       WHERE ar.user_id = $1
       ORDER BY ar.created_at DESC`,
      [req.session.userId]
    );

    const sharedAgents = await pool.query(
      `SELECT ar.*, u.email as creator_email
       FROM agent_requests ar
       JOIN agent_shares s ON s.agent_id = ar.id
       JOIN users u ON u.id = ar.user_id
       WHERE s.partner_user_id = $1
       ORDER BY ar.created_at DESC`,
      [req.session.userId]
    );

    res.render('dashboard', {
      title: 'Dashboard',
      agents: agents.rows,
      sharedAgents: sharedAgents.rows,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Server error');
  }
});

export default router;
