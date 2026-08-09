import pool from './db';

export class SettingsService {
  private static cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private static readonly CACHE_TTL_MS = 60 * 1000;

  static async get(key: string, defaultValue: string = ''): Promise<string> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    const value = result.rows.length > 0 ? result.rows[0].value : defaultValue;
    this.cache.set(key, { value, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return value;
  }

  static async set(key: string, value: string): Promise<void> {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
    this.cache.set(key, { value, expiresAt: Date.now() + this.CACHE_TTL_MS });
  }

  static async getInt(key: string, defaultValue: number): Promise<number> {
    const value = await this.get(key, String(defaultValue));
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  static async getBool(key: string, defaultValue: boolean): Promise<boolean> {
    const value = await this.get(key, defaultValue ? '1' : '0');
    return value === '1' || value === 'true';
  }
}
