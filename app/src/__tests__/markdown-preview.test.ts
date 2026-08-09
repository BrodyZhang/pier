import { markdownPreviewSchema } from '../validators/markdown-preview.validator';
import { MarkdownPreviewService } from '../services/markdown-preview.service';

describe('Markdown Preview', () => {
  describe('markdownPreviewSchema', () => {
    it('should accept valid markdown', () => {
      const result = markdownPreviewSchema.safeParse({ md: '# Hello' });
      expect(result.success).toBe(true);
    });

    it('should reject empty markdown', () => {
      const result = markdownPreviewSchema.safeParse({ md: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('不能为空');
      }
    });

    it('should reject oversized markdown', () => {
      const result = markdownPreviewSchema.safeParse({ md: 'a'.repeat(500001) });
      expect(result.success).toBe(false);
    });
  });

  describe('MarkdownPreviewService.render', () => {
    it('should render headings and bold text', () => {
      const html = MarkdownPreviewService.render('# Title\n\n**bold**');
      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<strong>bold</strong>');
    });

    it('should render fenced code blocks', () => {
      const html = MarkdownPreviewService.render('```js\nconst a = 1;\n```');
      expect(html).toContain('<pre>');
      expect(html).toContain('const a = 1;');
    });

    it('should render tables (GFM)', () => {
      const html = MarkdownPreviewService.render('| a | b |\n|---|---|\n| 1 | 2 |');
      expect(html).toContain('<table>');
      expect(html).toContain('<td>1</td>');
    });
  });
});
