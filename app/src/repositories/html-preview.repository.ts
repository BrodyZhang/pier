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
}
