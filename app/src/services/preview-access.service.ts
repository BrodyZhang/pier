import { UsageService } from './usage.service';
import { SettingsService } from './settings.service';
import { sendAdminAlert } from './mail';

export interface PreviewAccessResult {
  allowed: boolean;
  reason?: 'limit' | 'cap';
  message?: string;
  dailyLimit: number;
}

export class PreviewAccessService {
  private static lastCapNotifiedAt = 0;
  private static readonly CAP_NOTIFY_INTERVAL_MS = 6 * 60 * 60 * 1000;

  static async getDailyLimit(): Promise<number> {
    return SettingsService.getInt('preview_daily_limit', 100);
  }

  static async checkCanCreate(feature: string, ip: string): Promise<PreviewAccessResult> {
    const dailyLimit = await this.getDailyLimit();
    const cap = await SettingsService.getInt('preview_storage_cap', 100000);

    const total = await UsageService.getTotalPreviewCount();
    if (total >= cap) {
      await this.notifyCapIfNeeded(total, cap);
      return {
        allowed: false,
        reason: 'cap',
        message: `预览存储已达上限（${cap.toLocaleString()} 条），功能暂时停用，请稍后再试。`,
        dailyLimit,
      };
    }

    if (dailyLimit <= 0) {
      return {
        allowed: false,
        reason: 'limit',
        message: `预览功能已停用，请稍后再试。`,
        dailyLimit,
      };
    }

    const granted = await UsageService.consumeSlot(feature, ip, dailyLimit);
    if (!granted) {
      return {
        allowed: false,
        reason: 'limit',
        message: `今日预览次数已达上限（${dailyLimit} 次），请明天再试。`,
        dailyLimit,
      };
    }

    return { allowed: true, dailyLimit };
  }

  private static async notifyCapIfNeeded(total: number, cap: number): Promise<void> {
    const now = Date.now();
    if (now - this.lastCapNotifiedAt < this.CAP_NOTIFY_INTERVAL_MS) return;
    this.lastCapNotifiedAt = now;

    await sendAdminAlert(
      '预览存储已达上限，请清理',
      `预览功能已因存储达到上限（${cap.toLocaleString()} 条，当前 ${total.toLocaleString()} 条）而停用。\n请尽快到管理后台清理旧预览：/admin/previews`
    );
  }
}
