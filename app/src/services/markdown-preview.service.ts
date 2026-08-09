import { marked } from 'marked';
import { MarkdownPreviewRepository } from '../repositories/markdown-preview.repository';

export class MarkdownPreviewService {
  static async create(markdown: string): Promise<string> {
    const encoded = Buffer.from(markdown, 'utf-8').toString('base64');
    const preview = await MarkdownPreviewRepository.create(encoded);
    return preview.id;
  }

  static async getById(id: string): Promise<string | null> {
    const preview = await MarkdownPreviewRepository.findById(id);
    if (!preview) return null;
    return Buffer.from(preview.content, 'base64').toString('utf-8');
  }

  static render(markdown: string): string {
    marked.setOptions({ gfm: true, breaks: true, mangle: false, headerIds: false });
    return marked.parse(markdown) as string;
  }

  static async listAll(limit = 300): Promise<{ id: string; created_at: Date; content: string }[]> {
    const rows = await MarkdownPreviewRepository.findAll(limit);
    return rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      content: Buffer.from(r.content, 'base64').toString('utf-8'),
    }));
  }

  static async delete(id: string): Promise<boolean> {
    return MarkdownPreviewRepository.delete(id);
  }

  static async cleanupOlderThan(days: number): Promise<number> {
    return MarkdownPreviewRepository.deleteOlderThan(days);
  }
}
