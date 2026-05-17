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

// GET /api/dev/pending — pending task counts for AI to check
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*)::int as count
       FROM agent_requests
       WHERE status IN ('pending_review', 'in_development', 'dev_review')
       GROUP BY status`
    );
    const counts: Record<string, number> = { pending_review: 0, in_development: 0, dev_review: 0 };
    result.rows.forEach((r: any) => { counts[r.status] = r.count; });
    res.json({ counts, total: Object.values(counts).reduce((a: number, b: number) => a + b, 0) });
  } catch (err) {
    console.error('Pending API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
