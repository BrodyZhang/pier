export function decodeBase64Html(content: string): string {
  try {
    const decoded = Buffer.from(content, 'base64').toString('utf-8');
    if (!decoded.includes('<!DOCTYPE') && !decoded.includes('<html')) {
      return content;
    }
    return decoded;
  } catch {
    return content;
  }
}

export function injectDisclaimer(html: string): string {
  const disclaimer = `<div style="position:fixed;bottom:10px;left:10px;right:10px;font-size:11px;color:rgba(0,0,0,0.2);z-index:9999;pointer-events:none;text-align:center;">本页面由 AI 自动生成，为个人学习实验项目，内容仅供展示，不构成任何承诺或保证。</div>`;
  return html.replace('</body>', `${disclaimer}</body>`);
}

export function escapeHtmlForDisplay(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
