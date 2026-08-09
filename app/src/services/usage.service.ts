import pool from './db';

export class UsageService {
  static async consumeSlot(feature: string, ip: string, limit: number): Promise<boolean> {
    if (limit <= 0) return false;

    const result = await pool.query(
      `INSERT INTO preview_usage (feature, ip, day, count) VALUES ($1, $2, CURRENT_DATE, 1)
       ON CONFLICT (feature, ip, day) DO UPDATE SET count = preview_usage.count + 1
       WHERE preview_usage.count < $3
       RETURNING count`,
      [feature, ip, limit]
    );
    return result.rows.length > 0;
  }

  static async getTodayCount(feature: string, ip: string): Promise<number> {
    const result = await pool.query(
      'SELECT count FROM preview_usage WHERE feature = $1 AND ip = $2 AND day = CURRENT_DATE',
      [feature, ip]
    );
    return result.rows.length > 0 ? result.rows[0].count : 0;
  }

  static async getTotalPreviewCount(): Promise<number> {
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM html_previews) +
         (SELECT COUNT(*) FROM markdown_previews) AS total`
    );
    return parseInt(result.rows[0].total, 10);
  }
}
