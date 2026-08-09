import { htmlPreviewSchema } from '../validators/html-preview.validator';
import { buildPreviewNav } from '../utils/preview-nav';
import { PREVIEW_MAX_LENGTH } from '../config';

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
    const result = htmlPreviewSchema.safeParse({ html: 'a'.repeat(PREVIEW_MAX_LENGTH + 1) });
    expect(result.success).toBe(false);
  });

  it('should accept html at max length', () => {
    const result = htmlPreviewSchema.safeParse({ html: 'a'.repeat(PREVIEW_MAX_LENGTH) });
    expect(result.success).toBe(true);
  });
});

describe('buildPreviewNav', () => {
  const nav = buildPreviewNav();

  it('should include home, copy and print buttons', () => {
    expect(nav).toContain('pier-nav-home');
    expect(nav).toContain('pier-nav-copy');
    expect(nav).toContain('pier-nav-print');
    expect(nav).toContain('返回首页');
    expect(nav).toContain('复制地址');
    expect(nav).toContain('打印');
  });

  it('should hide the nav when printing', () => {
    expect(nav).toContain('@media print');
    expect(nav).toContain('#pier-preview-nav { display: none !important; }');
  });

  it('should trigger window.print on print click', () => {
    expect(nav).toContain('window.print()');
  });
});
