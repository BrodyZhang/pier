import { Router, Request, Response } from 'express';
import pool from '../services/db';
import { AgentService } from '../services/agent.service';
import { reviewSchema, agentIdSchema } from '../validators/agent.validator';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.redirect('/admin/requests');
});

router.get('/requests', async (_req: Request, res: Response, next) => {
  try {
    const result = await pool.query(
      `SELECT ar.*, u.email as user_email,
              parent.name as parent_name
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
       LEFT JOIN agent_requests parent ON parent.id = ar.parent_id
       ORDER BY ar.created_at DESC`
    );
    const all = result.rows;
    const pending = all.filter((r: any) => r.status === 'pending_review');
    const dev = all.filter((r: any) => r.status === 'in_development');
    const devReview = all.filter((r: any) => r.status === 'dev_review');
    const completed = all.filter((r: any) => r.status === 'completed');
    const rejected = all.filter((r: any) => r.status === 'rejected');

    res.render('admin/requests', { title: 'Admin - Requests', pending, dev, devReview, completed, rejected });
  } catch (err) {
    next(err);
  }
});

router.get('/requests/:id', async (req: Request, res: Response, next) => {
  try {
    const result = await pool.query(
      `SELECT ar.*, u.email as user_email,
              parent.name as parent_name, parent.unique_slug as parent_slug
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
       LEFT JOIN agent_requests parent ON parent.id = ar.parent_id
       WHERE ar.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Request not found');
    }

    const versions = await pool.query(
      `SELECT * FROM agent_versions WHERE agent_id = $1 ORDER BY version_number DESC`,
      [req.params.id]
    );

    res.render('admin/review', {
      title: 'Review Request',
      agent: result.rows[0],
      versions: versions.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/requests/:id/approve', async (req: Request, res: Response, next) => {
  try {
    const { review_notes } = req.body;
    await AgentService.approve(req.params.id, review_notes);
    res.redirect('/admin/requests');
  } catch (err) {
    next(err);
  }
});

router.post('/requests/:id/reject', async (req: Request, res: Response, next) => {
  try {
    const { reason } = req.body;
    await AgentService.reject(req.params.id, reason);
    res.redirect('/admin/requests');
  } catch (err) {
    next(err);
  }
});

router.post('/requests/:id/upload', async (req: Request, res: Response, next) => {
  const file = (req as any).files?.html;
  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  try {
    const agent = await AgentService.getById(req.params.id);
    if (!agent || !agent.unique_slug) {
      return res.status(404).send('Agent not found or not yet approved');
    }

    const content = file.data.toString('utf-8');
    await AgentService.uploadFile(req.params.id, content);

    await AgentService.updateStatus(req.params.id, 'dev_review', { review_comments: null });
    res.redirect('/admin/requests');
  } catch (err) {
    next(err);
  }
});

router.post('/requests/:id/approve-dev', async (req: Request, res: Response, next) => {
  try {
    await AgentService.approveDev(req.params.id);
    res.redirect('/admin/requests');
  } catch (err) {
    next(err);
  }
});

router.post('/requests/:id/reject-dev', async (req: Request, res: Response, next) => {
  try {
    const { review_comments } = req.body;
    await AgentService.rejectDev(req.params.id, review_comments);
    res.redirect('/admin/requests');
  } catch (err) {
    next(err);
  }
});

router.post('/requests/:id/rename', async (req: Request, res: Response, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim() || name.trim().length > 50) {
      return res.status(400).send('名称不能为空且不超过50个字符');
    }
    await AgentService.update(req.params.id, { name: name.trim() });
    res.redirect('/admin/requests');
  } catch (err) {
    next(err);
  }
});

router.post('/requests/:id/delete', async (req: Request, res: Response, next) => {
  try {
    await AgentService.delete(req.params.id);
    res.redirect('/admin/requests');
  } catch (err) {
    next(err);
  }
});

router.post('/requests/:id/toggle-showcase', async (req: Request, res: Response, next) => {
  try {
    const result = await AgentService.toggleShowcase(req.params.id);
    if (!result.success) {
      return res.status(400).send(result.error);
    }
    res.redirect('/admin/requests');
  } catch (err) {
    next(err);
  }
});

export default router;
