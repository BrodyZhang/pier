import { Router, Request, Response } from 'express';
import { HtmlPreviewService } from '../services/html-preview.service';
import { htmlPreviewSchema } from '../validators/html-preview.validator';
import { strictLimiter } from '../middleware/rate-limit';
import { isValidUuid } from '../utils/validation';

const router = Router();

router.get('/html', (_req: Request, res: Response) => {
  res.render('html/index', {
    title: 'HTML 在线预览',
    error: null,
    success: null,
    previewUrl: null,
  });
});

router.post('/html', strictLimiter, async (req: Request, res: Response, next) => {
  try {
    const parsed = htmlPreviewSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || '输入无效';
      return res.render('html/index', {
        title: 'HTML 在线预览',
        error: errorMessage,
        success: null,
        previewUrl: null,
      });
    }

    const id = await HtmlPreviewService.create(parsed.data.html);
    res.render('html/index', {
      title: 'HTML 在线预览',
      error: null,
      success: '预览已生成',
      previewUrl: `/html/p/${id}`,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/html/p/:id', async (req: Request, res: Response, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).send('预览不存在或已失效');
    }

    const html = await HtmlPreviewService.getById(req.params.id);
    if (!html) {
      return res.status(404).send('预览不存在或已失效');
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const pageUrl = `${protocol}://${host}/html/p/${req.params.id}`;

    const footer = `<div style="position:fixed;bottom:8px;left:0;right:0;text-align:center;font-size:11px;color:rgba(0,0,0,0.3);z-index:2147483647;pointer-events:none;user-select:none;">${pageUrl}</div>`;

    const out = html.includes('</body>')
      ? html.replace('</body>', `${footer}</body>`)
      : html + footer;

    res.send(out);
  } catch (err) {
    next(err);
  }
});

export default router;
