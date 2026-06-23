import pool from '../services/db';
import type { AgentRequest, AgentRequestWithUser, AgentFile } from '../types';

export class AgentRepository {
  static async findById(id: string): Promise<AgentRequest | null> {
    const result = await pool.query('SELECT * FROM agent_requests WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findBySlug(slug: string): Promise<AgentRequest | null> {
    const result = await pool.query('SELECT * FROM agent_requests WHERE unique_slug = $1::uuid', [slug]);
    return result.rows[0] || null;
  }

  static async findBySlugWithUser(slug: string): Promise<AgentRequestWithUser | null> {
    const result = await pool.query(
      `SELECT ar.*, u.email as creator_email
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
       WHERE ar.unique_slug = $1::uuid`,
      [slug]
    );
    return result.rows[0] || null;
  }

  static async findByUser(userId: string): Promise<AgentRequestWithUser[]> {
    const result = await pool.query(
      `SELECT ar.*, u.email as creator_email,
        (SELECT COUNT(*) FROM agent_shares WHERE agent_id = ar.id) as share_count,
        parent.name as parent_name, parent.unique_slug as parent_slug
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
       LEFT JOIN agent_requests parent ON parent.id = ar.parent_id
       WHERE ar.user_id = $1
       ORDER BY ar.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async findSharedWithUser(userId: string): Promise<AgentRequestWithUser[]> {
    const result = await pool.query(
      `SELECT ar.*, u.email as creator_email
       FROM agent_requests ar
       JOIN agent_shares s ON s.agent_id = ar.id
       JOIN users u ON u.id = ar.user_id
       WHERE s.partner_user_id = $1
       ORDER BY ar.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async findShowcased(limit: number = 12): Promise<AgentRequest[]> {
    const result = await pool.query(
      `SELECT id, name, description, unique_slug,
              LEFT(description, 80) as short_desc
       FROM agent_requests
       WHERE showcased = true AND status = 'completed' AND unique_slug IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async findPublicBySlug(slug: string): Promise<AgentRequestWithUser | null> {
    const result = await pool.query(
      `SELECT ar.id, ar.name, ar.description, ar.unique_slug,
              u.email as creator_email
       FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
       WHERE ar.unique_slug = $1::uuid AND ar.status = 'completed' AND ar.is_public = true`,
      [slug]
    );
    return result.rows[0] || null;
  }

  static async create(data: { user_id: string; name: string; description: string }): Promise<AgentRequest> {
    const result = await pool.query(
      `INSERT INTO agent_requests (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.user_id, data.name, data.description]
    );
    return result.rows[0];
  }

  static async createWithSlug(data: {
    user_id: string;
    name: string;
    description: string;
    status: string;
    slug: string;
  }): Promise<AgentRequest> {
    const result = await pool.query(
      `INSERT INTO agent_requests (user_id, name, description, status, unique_slug)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.user_id, data.name, data.description, data.status, data.slug]
    );
    return result.rows[0];
  }

  static async update(id: string, data: { name?: string; description?: string }): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(data.description);
    }

    if (updates.length === 0) return;

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await pool.query(
      `UPDATE agent_requests SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );
  }

  static async updateStatus(id: string, status: string, extra?: Record<string, unknown>): Promise<void> {
    const sets: string[] = ['status = $1', 'updated_at = NOW()'];
    const values: unknown[] = [status];
    let idx = 2;

    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        sets.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }

    values.push(id);
    await pool.query(
      `UPDATE agent_requests SET ${sets.join(', ')} WHERE id = $${idx}`,
      values
    );
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM agent_requests WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  static async deleteByUser(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM agent_requests WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rows.length > 0;
  }

  static async appendReviewLog(id: string, entry: Record<string, unknown>): Promise<void> {
    await pool.query(
      `UPDATE agent_requests
       SET review_log = COALESCE(review_log, '[]'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify([entry]), id]
    );
  }

  static async findFiles(agentId: string): Promise<AgentFile[]> {
    const result = await pool.query(
      'SELECT * FROM agent_files WHERE agent_id = $1 ORDER BY created_at DESC',
      [agentId]
    );
    return result.rows;
  }

  static async findLatestFile(agentId: string): Promise<AgentFile | null> {
    const result = await pool.query(
      'SELECT * FROM agent_files WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1',
      [agentId]
    );
    return result.rows[0] || null;
  }

  static async replaceFile(agentId: string, content: string): Promise<void> {
    await pool.query('DELETE FROM agent_files WHERE agent_id = $1', [agentId]);
    await pool.query(
      'INSERT INTO agent_files (agent_id, content) VALUES ($1, $2)',
      [agentId, content]
    );
  }

  static async findShare(agentId: string): Promise<{ partner_email: string; partner_user_id: string | null } | null> {
    const result = await pool.query(
      'SELECT partner_email, partner_user_id FROM agent_shares WHERE agent_id = $1',
      [agentId]
    );
    return result.rows[0] || null;
  }

  static async createShare(agentId: string, partnerEmail: string, partnerUserId?: string): Promise<void> {
    await pool.query(
      `INSERT INTO agent_shares (agent_id, partner_email, partner_user_id)
       VALUES ($1, $2, $3)`,
      [agentId, partnerEmail, partnerUserId || null]
    );
  }

  static async deleteShare(agentId: string): Promise<void> {
    await pool.query('DELETE FROM agent_shares WHERE agent_id = $1', [agentId]);
  }

  static async isOwner(agentId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM agent_requests WHERE id = $1 AND user_id = $2',
      [agentId, userId]
    );
    return result.rows.length > 0;
  }

  static async hasAccess(agentId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT ar.id FROM agent_requests ar
       LEFT JOIN agent_shares s ON s.agent_id = ar.id
       WHERE ar.id = $1 AND (ar.user_id = $2 OR s.partner_user_id = $2)`,
      [agentId, userId]
    );
    return result.rows.length > 0;
  }

  static async isPublic(agentId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT is_public FROM agent_requests WHERE id = $1',
      [agentId]
    );
    return result.rows.length > 0 && result.rows[0].is_public;
  }

  static async togglePublic(id: string): Promise<void> {
    const agent = await pool.query('SELECT is_public FROM agent_requests WHERE id = $1', [id]);
    if (agent.rows.length === 0) return;

    if (agent.rows[0].is_public) {
      await pool.query(
        `UPDATE agent_requests SET is_public = false, showcased = false, updated_at = NOW() WHERE id = $1`,
        [id]
      );
    } else {
      await pool.query(
        `UPDATE agent_requests SET is_public = true, updated_at = NOW() WHERE id = $1`,
        [id]
      );
    }
  }

  static async toggleShowcase(id: string): Promise<void> {
    await pool.query(
      `UPDATE agent_requests SET showcased = NOT showcased, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }
}
