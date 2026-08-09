import pool from '../services/db';

export interface MarkdownPreview {
  id: string;
  content: string;
  add_nav: boolean;
  created_at: Date;
}

export class MarkdownPreviewRepository {
  static async create(content: string, addNav: boolean): Promise<MarkdownPreview> {
    const result = await pool.query(
      'INSERT INTO markdown_previews (content, add_nav) VALUES ($1, $2) RETURNING id, content, add_nav, created_at',
      [content, addNav]
    );
    return result.rows[0];
  }

  static async findById(id: string): Promise<MarkdownPreview | null> {
    const result = await pool.query(
      'SELECT id, content, add_nav, created_at FROM markdown_previews WHERE id = $1::uuid',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findAll(limit = 300): Promise<MarkdownPreview[]> {
    const result = await pool.query(
      'SELECT id, content, add_nav, created_at FROM markdown_previews ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM markdown_previews WHERE id = $1::uuid RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  }

  static async update(id: string, content: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE markdown_previews SET content = $2 WHERE id = $1::uuid RETURNING id',
      [id, content]
    );
    return result.rows.length > 0;
  }

  static async deleteOlderThan(days: number): Promise<number> {
    const result = await pool.query(
      'DELETE FROM markdown_previews WHERE created_at < NOW() - ($1 * INTERVAL \'1 day\')',
      [days]
    );
    return result.rowCount || 0;
  }
}
