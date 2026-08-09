import { Router, Request, Response } from 'express';
import { HtmlPreviewService } from '../services/html-preview.service';
import { PreviewAccessService } from '../services/preview-access.service';
import { htmlPreviewSchema } from '../validators/html-preview.validator';
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

router.get('/html', async (_req: Request, res: Response) => {
  const dailyLimit = await PreviewAccessService.getDailyLimit();
  res.render('html/index', {
    title: 'HTML 在线预览',
    error: null,
    success: null,
    previewUrl: null,
    dailyLimit,
    addNav: true,
  });
});

router.post('/html', strictLimiter, async (req: Request, res: Response, next) => {
  try {
    const addNav = parseAddNav(req.body.add_nav);

    const parsed = htmlPreviewSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || '输入无效';
      const dailyLimit = await PreviewAccessService.getDailyLimit();
      return res.render('html/index', {
        title: 'HTML 在线预览',
        error: errorMessage,
        success: null,
        previewUrl: null,
        dailyLimit,
        addNav,
      });
    }

    const access = await PreviewAccessService.checkCanCreate('html', req.ip || 'unknown');
    if (!access.allowed) {
      return res.render('html/index', {
        title: 'HTML 在线预览',
        error: access.message,
        success: null,
        previewUrl: null,
        dailyLimit: access.dailyLimit,
        addNav,
      });
    }

    const id = await HtmlPreviewService.create(parsed.data.html, addNav);
    res.render('html/index', {
      title: 'HTML 在线预览',
      error: null,
      success: '预览已生成',
      previewUrl: `/html/p/${id}`,
      dailyLimit: access.dailyLimit,
      addNav,
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

    const preview = await HtmlPreviewService.getById(req.params.id);
    if (!preview) {
      return res.status(404).send('预览不存在或已失效');
    }

    const nav = preview.addNav ? buildPreviewNav() : '';
    const out = preview.content.includes('</body>')
      ? preview.content.replace('</body>', `${nav}</body>`)
      : preview.content + nav;

    // Serve the user's HTML as-is (plus optional nav). Remove helmet's CSP so
    // external libraries (e.g. MathJax from CDN) load like a local file.
    res.removeHeader('Content-Security-Policy');
    res.send(out);
  } catch (err) {
    next(err);
  }
});

export default router;
