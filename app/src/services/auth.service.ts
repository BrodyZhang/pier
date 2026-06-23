import { UserRepository } from '../repositories/user.repository';
import pool from './db';
import { sendVerificationCode } from './mail';
import type { User } from '../types';

export class AuthService {
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async sendCode(email: string): Promise<{ success: boolean; error?: string; wait?: number }> {
    const lastCode = await pool.query(
      `SELECT created_at FROM verification_codes
       WHERE email = $1 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (lastCode.rows.length > 0) {
      const elapsed = Date.now() - new Date(lastCode.rows[0].created_at).getTime();
      if (elapsed < 60000) {
        const wait = Math.ceil((60000 - elapsed) / 1000);
        return { success: false, error: `请 ${wait} 秒后再试`, wait };
      }
    }

    const code = this.generateCode();
    await pool.query(
      'UPDATE verification_codes SET used = true WHERE email = $1 AND used = false',
      [email]
    );
    await pool.query(
      `INSERT INTO verification_codes (email, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [email, code]
    );

    await sendVerificationCode(email, code);
    return { success: true };
  }

  static async verifyCode(email: string, code: string): Promise<{ valid: boolean; codeId?: string }> {
    const result = await pool.query(
      `SELECT id FROM verification_codes
       WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return { valid: false };
    }

    await pool.query('UPDATE verification_codes SET used = true WHERE id = $1', [result.rows[0].id]);
    return { valid: true, codeId: result.rows[0].id };
  }

  static async register(email: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      return { success: false, error: '该邮箱已注册，请登录。' };
    }

    const DAILY_LIMIT = 20;
    const registered = await UserRepository.getDailyRegistrationCount();
    if (registered >= DAILY_LIMIT) {
      return { success: false, error: '今日注册名额已满（20/20），请明天再来。' };
    }

    const user = await UserRepository.create(email);
    return { success: true, user };
  }

  static async login(email: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return { success: false, error: '该邮箱未注册，请先注册。' };
    }
    return { success: true, user };
  }

  static async updateLastLogin(userId: string): Promise<void> {
    await UserRepository.updateLastLogin(userId);
  }

  static async getDailyRegistrationCount(): Promise<number> {
    return UserRepository.getDailyRegistrationCount();
  }
}
