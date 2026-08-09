import { Router, Request, Response } from 'express';
import { MarkdownPreviewService } from '../services/markdown-preview.service';
import { PreviewAccessService } from '../services/preview-access.service';
import { markdownPreviewSchema } from '../validators/markdown-preview.validator';
import { strictLimiter } from '../middleware/rate-limit';
import { isValidUuid } from '../utils/validation';
import { buildPreviewNav } from '../utils/preview-nav';
import { PREVIEW_MAX_LENGTH } from '../config';

const router = Router();

router.use((_req: Request, res: Response, next) => {
  res.locals.maxLength = PREVIEW_MAX_LENGTH;
  next();
});

function parseAddNav(value: unknown): boolean {
  return value === 'on' || value === '1' || value === 'true' || value === true;
}

router.get('/md', async (_req: Request, res: Response) => {
  const dailyLimit = await PreviewAccessService.getDailyLimit();
  res.render('md/index', {
    title: 'Markdown 在线预览',
    error: null,
    success: null,
    previewUrl: null,
    dailyLimit,
    addNav: true,
  });
});

router.post('/md', strictLimiter, async (req: Request, res: Response, next) => {
  try {
    const addNav = parseAddNav(req.body.add_nav);

    const parsed = markdownPreviewSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || '输入无效';
      const dailyLimit = await PreviewAccessService.getDailyLimit();
      return res.render('md/index', {
        title: 'Markdown 在线预览',
        error: errorMessage,
        success: null,
        previewUrl: null,
        dailyLimit,
        addNav,
      });
    }

    const access = await PreviewAccessService.checkCanCreate('md', req.ip || 'unknown');
    if (!access.allowed) {
      return res.render('md/index', {
        title: 'Markdown 在线预览',
        error: access.message,
        success: null,
        previewUrl: null,
        dailyLimit: access.dailyLimit,
        addNav,
      });
    }

    const id = await MarkdownPreviewService.create(parsed.data.md, addNav);
    res.render('md/index', {
      title: 'Markdown 在线预览',
      error: null,
      success: '预览已生成',
      previewUrl: `/md/p/${id}`,
      dailyLimit: access.dailyLimit,
      addNav,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/md/p/:id', async (req: Request, res: Response, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).send('预览不存在或已失效');
    }

    const preview = await MarkdownPreviewService.getById(req.params.id);
    if (!preview) {
      return res.status(404).send('预览不存在或已失效');
    }

    const body = MarkdownPreviewService.render(preview.content);
    const nav = preview.addNav ? buildPreviewNav() : '';

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Markdown 预览</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: -apple-system, 'Microsoft YaHei', 'PingFang SC', 'Segoe UI', sans-serif;
    background: #fafafa;
    color: #24292f;
    line-height: 1.7;
    padding: 40px 16px;
}
.md-preview {
    max-width: 820px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 40px 48px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}
.md-preview h1, .md-preview h2, .md-preview h3, .md-preview h4 { margin: 1.4em 0 0.6em; line-height: 1.3; }
.md-preview h1 { font-size: 1.8em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
.md-preview h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
.md-preview h3 { font-size: 1.25em; }
.md-preview p, .md-preview ul, .md-preview ol, .md-preview blockquote, .md-preview table { margin: 0.8em 0; }
.md-preview ul, .md-preview ol { padding-left: 1.6em; }
.md-preview a { color: #0366d6; text-decoration: none; }
.md-preview a:hover { text-decoration: underline; }
.md-preview code {
    background: rgba(27,31,35,0.06);
    padding: 0.2em 0.4em;
    border-radius: 5px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
    font-size: 0.9em;
}
.md-preview pre {
    background: #f6f8fa;
    border-radius: 8px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 0.8em 0;
}
.md-preview pre code { background: transparent; padding: 0; font-size: 0.88em; }
.md-preview blockquote {
    border-left: 4px solid #dfe2e5;
    padding: 0.4em 1em;
    color: #6a737d;
    background: #f6f8fa;
    border-radius: 0 8px 8px 0;
}
.md-preview table { border-collapse: collapse; width: 100%; }
.md-preview th, .md-preview td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
.md-preview th { background: #f6f8fa; }
.md-preview img { max-width: 100%; border-radius: 8px; }
.md-preview hr { border: none; border-top: 2px solid #eaecef; margin: 1.5em 0; }
@media (max-width: 640px) {
    .md-preview { padding: 24px 18px; border-radius: 8px; }
    body { padding: 16px 8px; }
}
</style>
</head>
<body>
<div class="md-preview">${body}</div>
<script>
window.MathJax = {
    tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] }
};
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
${nav}
</body>
</html>`;

    res.removeHeader('Content-Security-Policy');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

export default router;
