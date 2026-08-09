import { HtmlPreviewRepository } from '../repositories/html-preview.repository';

export interface HtmlPreviewView {
  content: string;
  addNav: boolean;
}

export class HtmlPreviewService {
  static async create(html: string, addNav: boolean): Promise<string> {
    const encoded = Buffer.from(html, 'utf-8').toString('base64');
    const preview = await HtmlPreviewRepository.create(encoded, addNav);
    return preview.id;
  }

  static async getById(id: string): Promise<HtmlPreviewView | null> {
    const preview = await HtmlPreviewRepository.findById(id);
    if (!preview) return null;
    return {
      content: Buffer.from(preview.content, 'base64').toString('utf-8'),
      addNav: preview.add_nav,
    };
  }

  static async listAll(limit = 300): Promise<{ id: string; created_at: Date; content: string; is_featured: boolean }[]> {
    const rows = await HtmlPreviewRepository.findAll(limit);
    return rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      content: Buffer.from(r.content, 'base64').toString('utf-8'),
      is_featured: r.is_featured,
    }));
  }

  static async countStats(): Promise<{ total: number; featured: number }> {
    return HtmlPreviewRepository.countStats();
  }

  static async setFeatured(id: string, featured: boolean): Promise<boolean> {
    return HtmlPreviewRepository.setFeatured(id, featured);
  }

  static async delete(id: string): Promise<boolean> {
    return HtmlPreviewRepository.delete(id);
  }

  static async update(id: string, html: string): Promise<boolean> {
    const encoded = Buffer.from(html, 'utf-8').toString('base64');
    return HtmlPreviewRepository.update(id, encoded);
  }

  static async cleanupOlderThan(days: number): Promise<number> {
    return HtmlPreviewRepository.deleteOlderThan(days);
  }
}
