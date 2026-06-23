import { Router, Request, Response } from 'express';
import pool from '../services/db';
import { AgentService } from '../services/agent.service';

const router = Router();

const EDITABLE_STATUSES = ['in_development', 'dev_review'] as const;

async function getDevAgent(id: string): Promise<{ id: string; unique_slug: string | null; status: string } | null> {
  const result = await pool.query(
    `SELECT id, unique_slug, status FROM agent_requests WHERE id = $1 AND status = ANY($2)`,
    [id, EDITABLE_STATUSES]
  );
  return result.rows[0] || null;
}

router.get('/agents', async (req: Request, res: Response, next) => {
  try {
    const result = await pool.query(
      `SELECT ar.id, ar.name, ar.description, ar.unique_slug, ar.status,
              ar.review_notes, ar.review_comments, ar.created_at, ar.updated_at,
              u.email as user_email
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
        WHERE ar.status = 'in_development'
       ORDER BY ar.created_at ASC`
    );
    res.json({ agents: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/pending', async (req: Request, res: Response, next) => {
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
    next(err);
  }
});

router.get('/rejected', async (req: Request, res: Response, next) => {
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
    next(err);
  }
});

router.post('/upload/:id', async (req: Request, res: Response, next) => {
  try {
    const agent = await getDevAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found or not in development status' });
    }

    let html: string;
    if (req.body.html_base64 && typeof req.body.html_base64 === 'string') {
      html = Buffer.from(req.body.html_base64, 'base64').toString('utf-8');
    } else if (req.body.html && typeof req.body.html === 'string') {
      html = req.body.html;
    } else {
      return res.status(400).json({ error: 'html (string) or html_base64 (base64 string) is required' });
    }

    await AgentService.uploadFile(req.params.id, html);
    await AgentService.updateStatus(req.params.id, 'dev_review', { review_comments: null });

    res.json({ success: true, status: 'dev_review' });
  } catch (err) {
    next(err);
  }
});

router.post('/create', async (req: Request, res: Response, next) => {
  try {
    let { name, description, userId } = req.body;
    if (req.body.name_base64) name = Buffer.from(req.body.name_base64, 'base64').toString('utf-8');
    if (req.body.description_base64) description = Buffer.from(req.body.description_base64, 'base64').toString('utf-8');
    if (!name || !description) {
      return res.status(400).json({ error: 'name and description are required' });
    }

    const agent = await AgentService.createByAdmin({ name, description, userId });
    res.json({ agent });
  } catch (err) {
    next(err);
  }
});

router.post('/update/:id', async (req: Request, res: Response, next) => {
  try {
    const exists = await AgentService.getById(req.params.id);
    if (!exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const updates: { name?: string; description?: string } = {};
    if (req.body.name_base64) {
      updates.name = Buffer.from(req.body.name_base64, 'base64').toString('utf-8');
    } else if (req.body.name) {
      updates.name = req.body.name;
    }
    if (req.body.description_base64) {
      updates.description = Buffer.from(req.body.description_base64, 'base64').toString('utf-8');
    } else if (req.body.description) {
      updates.description = req.body.description;
    }

    if (!updates.name && !updates.description) {
      return res.status(400).json({ error: 'name, name_base64, description, or description_base64 required' });
    }

    await AgentService.update(req.params.id, updates);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/delete/:id', async (req: Request, res: Response, next) => {
  try {
    const deleted = await AgentService.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/approve/:id', async (req: Request, res: Response, next) => {
  try {
    const approved = await AgentService.approveDev(req.params.id);
    if (!approved) {
      return res.status(404).json({ error: 'Agent not found or not in dev_review status' });
    }
    res.json({ success: true, status: 'completed' });
  } catch (err) {
    next(err);
  }
});

router.get('/lookup/:slug', async (req: Request, res: Response, next) => {
  try {
    const agent = await AgentService.getBySlug(req.params.slug);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({
      agent: {
        id: agent.id,
        unique_slug: agent.unique_slug,
        name: agent.name,
        description: agent.description,
        status: agent.status
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
