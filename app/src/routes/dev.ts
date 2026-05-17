import { Router, Request, Response } from 'express';
import pool from '../services/db';

const router = Router();

// Helper: validate agent exists and is in ai-editable status
async function getDevAgent(id: string): Promise<any> {
  const result = await pool.query(
    `SELECT id, unique_slug, status FROM agent_requests WHERE id = $1 AND status IN ('in_development', 'pending_review')`,
    [id]
  );
  return result.rows[0] || null;
}

// GET /api/dev/agents — list agents needing AI development (requires DEV_API_KEY)
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ar.id, ar.name, ar.description, ar.unique_slug, ar.status,
              ar.review_notes, ar.review_comments, ar.created_at, ar.updated_at,
              u.email as user_email
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

// GET /api/dev/rejected — agents with review_comments for AI to re-iterate
router.get('/rejected', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ar.id, ar.name, ar.description, ar.unique_slug, ar.status,
              ar.review_notes, ar.review_comments, ar.created_at, ar.updated_at,
              u.email as user_email
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
       WHERE ar.status = 'in_development' AND ar.review_comments IS NOT NULL
       ORDER BY ar.updated_at DESC`
    );
    res.json({ agents: result.rows });
  } catch (err) {
    console.error('Rejected API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dev/upload/:id — AI uploads developed HTML (requires DEV_API_KEY)
router.post('/upload/:id', async (req: Request, res: Response) => {
  try {
    const agent = await getDevAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found or not in development status' });
    }

    const { html } = req.body;
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'html field (string) is required' });
    }

    await pool.query('DELETE FROM agent_files WHERE agent_id = $1', [req.params.id]);
    await pool.query(
      'INSERT INTO agent_files (agent_id, content) VALUES ($1, $2)',
      [req.params.id, html]
    );

    await pool.query(
      `UPDATE agent_requests SET status = 'dev_review', review_comments = NULL, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true, status: 'dev_review' });
  } catch (err) {
    console.error('Dev upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
