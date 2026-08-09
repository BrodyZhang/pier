import pool from '../services/db';

export interface MarkdownPreview {
  id: string;
  content: string;
  add_nav: boolean;
  is_featured: boolean;
  created_at: Date;
}

export class MarkdownPreviewRepository {
  static async create(content: string, addNav: boolean): Promise<MarkdownPreview> {
    const result = await pool.query(
      'INSERT INTO markdown_previews (content, add_nav) VALUES ($1, $2) RETURNING id, content, add_nav, is_featured, created_at',
      [content, addNav]
    );
    return result.rows[0];
  }

  static async findById(id: string): Promise<MarkdownPreview | null> {
    const result = await pool.query(
      'SELECT id, content, add_nav, is_featured, created_at FROM markdown_previews WHERE id = $1::uuid',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findAll(limit = 300): Promise<MarkdownPreview[]> {
    const result = await pool.query(
      'SELECT id, content, add_nav, is_featured, created_at FROM markdown_previews ORDER BY is_featured DESC, created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  static async countStats(): Promise<{ total: number; featured: number }> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_featured = TRUE)::int AS featured
       FROM markdown_previews`
    );
    return { total: result.rows[0]?.total ?? 0, featured: result.rows[0]?.featured ?? 0 };
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

  static async setFeatured(id: string, featured: boolean): Promise<boolean> {
    const result = await pool.query(
      'UPDATE markdown_previews SET is_featured = $2 WHERE id = $1::uuid RETURNING id',
      [id, featured]
    );
    return result.rows.length > 0;
  }

  static async deleteOlderThan(days: number): Promise<number> {
    const result = await pool.query(
      "DELETE FROM markdown_previews WHERE created_at < NOW() - ($1 * INTERVAL '1 day') AND is_featured = FALSE",
      [days]
    );
    return result.rowCount || 0;
  }
}
