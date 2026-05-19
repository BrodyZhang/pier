import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../services/db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.redirect('/admin/requests');
});

router.get('/requests', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ar.*, u.email as user_email
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
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
    console.error('Admin requests error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/requests/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ar.*, u.email as user_email
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
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
    console.error('Admin review error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const slug = crypto.randomUUID();
    const { review_notes } = req.body;

    await pool.query(
      `UPDATE agent_requests
       SET status = 'in_development', unique_slug = $1, review_notes = $2,
           review_log = COALESCE(review_log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('action','approved','notes',$2,'timestamp',NOW())),
           updated_at = NOW()
       WHERE id = $3`,
      [slug, review_notes || null, req.params.id]
    );

    await pool.query(
      `INSERT INTO agent_versions (agent_id, version_number, request_description)
       VALUES ($1, 1, 'Initial approval')`,
      [req.params.id]
    );

    res.redirect('/admin/requests');
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/requests/:id/reject', async (req: Request, res: Response) => {
  const { reason } = req.body;
  try {
    await pool.query(
      `UPDATE agent_requests
       SET status = 'rejected', rejection_reason = $1,
           review_log = COALESCE(review_log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('action','rejected','reason',$1,'timestamp',NOW())),
           updated_at = NOW()
       WHERE id = $2`,
      [reason || 'No reason provided', req.params.id]
    );
    res.redirect('/admin/requests');
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/requests/:id/upload', async (req: Request, res: Response) => {
  const file = (req as any).files?.html;
  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  try {
    const agent = await pool.query(
      'SELECT unique_slug FROM agent_requests WHERE id = $1',
      [req.params.id]
    );

    if (agent.rows.length === 0 || !agent.rows[0].unique_slug) {
      return res.status(404).send('Agent not found or not yet approved');
    }

    const content = file.data.toString('utf-8');

    await pool.query('DELETE FROM agent_files WHERE agent_id = $1', [req.params.id]);
    await pool.query(
      'INSERT INTO agent_files (agent_id, content) VALUES ($1, $2)',
      [req.params.id, content]
    );

    await pool.query(
      `UPDATE agent_requests SET status = 'dev_review', review_comments = NULL,
           review_log = COALESCE(review_log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('action','uploaded','timestamp',NOW())),
           updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    res.redirect('/admin/requests');
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/requests/:id/approve-dev', async (req: Request, res: Response) => {
  try {
    await pool.query(
      `UPDATE agent_requests SET status = 'completed',
           review_log = COALESCE(review_log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('action','approved_dev','timestamp',NOW())),
           updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.redirect('/admin/requests');
  } catch (err) {
    console.error('Approve dev error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/requests/:id/reject-dev', async (req: Request, res: Response) => {
  try {
    const { review_comments } = req.body;
    await pool.query(
      `UPDATE agent_requests SET status = 'in_development', review_comments = $1,
           review_log = COALESCE(review_log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('action','rejected_dev','comments',$1,'timestamp',NOW())),
           updated_at = NOW() WHERE id = $2`,
      [review_comments || null, req.params.id]
    );
    res.redirect('/admin/requests');
  } catch (err) {
    console.error('Reject dev error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/requests/:id/delete', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM agent_requests WHERE id = $1', [req.params.id]);
    res.redirect('/admin/requests');
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).send('Server error');
  }
});

export default router;
