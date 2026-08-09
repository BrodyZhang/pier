import { htmlPreviewSchema } from '../validators/html-preview.validator';

describe('HTML Preview Validator', () => {
  it('should accept valid html', () => {
    const result = htmlPreviewSchema.safeParse({ html: '<h1>Hello</h1>' });
    expect(result.success).toBe(true);
  });

  it('should reject empty html', () => {
    const result = htmlPreviewSchema.safeParse({ html: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('不能为空');
    }
  });

  it('should reject oversized html', () => {
    const result = htmlPreviewSchema.safeParse({ html: 'a'.repeat(500001) });
    expect(result.success).toBe(false);
  });

  it('should accept html at max length', () => {
    const result = htmlPreviewSchema.safeParse({ html: 'a'.repeat(500000) });
    expect(result.success).toBe(true);
  });
});
