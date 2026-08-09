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
}
