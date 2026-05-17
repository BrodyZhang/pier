import { Router, Request, Response } from 'express';
import pool from '../services/db';

const router = Router();

// GET /api/dev/agents — list agents in development (requires admin)
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ar.id, ar.name, ar.description, ar.unique_slug, ar.status,
              ar.created_at, ar.updated_at, u.email as user_email
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
       WHERE ar.status = 'in_development' OR ar.status = 'pending_review'
       ORDER BY ar.created_at ASC`
    );
    res.json({ agents: result.rows });
  } catch (err) {
    console.error('Dev API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
