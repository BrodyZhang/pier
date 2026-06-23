import { decodeBase64Html, injectDisclaimer, escapeHtmlForDisplay } from '../utils/html';

describe('HTML Utils', () => {
  describe('decodeBase64Html', () => {
    it('should decode valid base64 HTML', () => {
      const html = '<!DOCTYPE html><html><body>Hello</body></html>';
      const encoded = Buffer.from(html).toString('base64');
      expect(decodeBase64Html(encoded)).toBe(html);
    });

    it('should return original content if not valid base64 HTML', () => {
      const content = 'not base64 html';
      expect(decodeBase64Html(content)).toBe(content);
    });

    it('should return original content if decoding fails', () => {
      const content = 'invalid-base64!@#';
      expect(decodeBase64Html(content)).toBe(content);
    });
  });

  describe('injectDisclaimer', () => {
    it('should inject disclaimer before </body>', () => {
      const html = '<html><body><p>Hello</p></body></html>';
      const result = injectDisclaimer(html);
      expect(result).toContain('本页面由 AI 自动生成');
      expect(result).toContain('</body>');
    });

    it('should handle html without body tag', () => {
      const html = '<html><p>Hello</p></html>';
      const result = injectDisclaimer(html);
      expect(result).toBe(html);
    });
  });

  describe('escapeHtmlForDisplay', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtmlForDisplay('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtmlForDisplay('a & b')).toBe('a &amp; b');
    });

    it('should escape single quotes', () => {
      expect(escapeHtmlForDisplay("it's")).toBe("it&#39;s");
    });
  });
});
