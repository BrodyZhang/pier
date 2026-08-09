import { HtmlPreviewRepository } from '../repositories/html-preview.repository';

export class HtmlPreviewService {
  static async create(html: string): Promise<string> {
    const encoded = Buffer.from(html, 'utf-8').toString('base64');
    const preview = await HtmlPreviewRepository.create(encoded);
    return preview.id;
  }

  static async getById(id: string): Promise<string | null> {
    const preview = await HtmlPreviewRepository.findById(id);
    if (!preview) return null;
    return Buffer.from(preview.content, 'base64').toString('utf-8');
  }

  static async listAll(limit = 300): Promise<{ id: string; created_at: Date; content: string }[]> {
    const rows = await HtmlPreviewRepository.findAll(limit);
    return rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      content: Buffer.from(r.content, 'base64').toString('utf-8'),
    }));
  }

  static async delete(id: string): Promise<boolean> {
    return HtmlPreviewRepository.delete(id);
  }
}
