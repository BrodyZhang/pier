import pool from '../services/db';
import type { User } from '../types';

export class UserRepository {
  static async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, name, role, registration_date, created_at, last_login_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, name, role, registration_date, created_at, last_login_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async create(email: string): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (email) VALUES ($1)
       RETURNING id, role, name`,
      [email]
    );
    return result.rows[0];
  }

  static async updateName(id: string, name: string): Promise<void> {
    await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, id]);
  }

  static async updateLastLogin(id: string): Promise<void> {
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  static async isAdmin(id: string): Promise<boolean> {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    return result.rows.length > 0 && result.rows[0].role === 'admin';
  }

  static async ensureAdmin(email: string): Promise<void> {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (email, role) VALUES ($1, 'admin')`,
        [email]
      );
      console.log(`Admin user created: ${email}`);
    } else {
      await pool.query(
        `UPDATE users SET role = 'admin' WHERE email = $1`,
        [email]
      );
      console.log(`Admin role set for: ${email}`);
    }
  }

  static async getDailyRegistrationCount(): Promise<number> {
    const count = await pool.query('SELECT COUNT(*) FROM users WHERE registration_date = CURRENT_DATE');
    return parseInt(count.rows[0].count);
  }

  static async getAdminUser(): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, name, role, registration_date, created_at, last_login_at
       FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`
    );
    return result.rows[0] || null;
  }
}
