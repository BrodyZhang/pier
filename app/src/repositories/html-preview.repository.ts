import pool from '../services/db';

export interface HtmlPreview {
  id: string;
  content: string;
  created_at: Date;
}

export class HtmlPreviewRepository {
  static async create(content: string): Promise<HtmlPreview> {
    const result = await pool.query(
      'INSERT INTO html_previews (content) VALUES ($1) RETURNING id, content, created_at',
      [content]
    );
    return result.rows[0];
  }

  static async findById(id: string): Promise<HtmlPreview | null> {
    const result = await pool.query(
      'SELECT id, content, created_at FROM html_previews WHERE id = $1::uuid',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findAll(limit = 300): Promise<HtmlPreview[]> {
    const result = await pool.query(
      'SELECT id, content, created_at FROM html_previews ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM html_previews WHERE id = $1::uuid RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  }
}
