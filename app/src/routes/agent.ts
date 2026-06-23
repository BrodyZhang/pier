import { Router, Request, Response } from 'express';
import { AgentService } from '../services/agent.service';
import { requireAuth } from '../middleware/auth';
import { createAgentSchema, agentIdSchema, shareSchema } from '../validators/agent.validator';
import { escapeHtmlForDisplay } from '../utils/html';

const router = Router();

router.get('/new', requireAuth, (_req: Request, res: Response) => {
  res.render('agent/new', { title: 'New Agent', error: null });
});

router.post('/new', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const parsed = createAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || '输入无效';
      return res.render('agent/new', {
        title: 'New Agent',
        error: errorMessage,
      });
    }

    await AgentService.create({
      ...parsed.data,
      user_id: req.session.userId!,
    });
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req: Request, res: Response, next) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.redirect('/auth/login');
  }

  try {
    const a = await AgentService.getBySlugWithUser(req.params.slug);
    if (!a || (a.status !== 'completed' && a.status !== 'dev_review')) {
      return res.status(404).send('Agent not found');
    }

    const isAdmin = req.session.role === 'admin';
    const isCreator = a.user_id === userId;
    const share = await AgentService.getShare(a.id);
    const isPartner = share?.partner_user_id === userId;

    if (!isCreator && !isPartner && !isAdmin) {
      return res.status(403).send('Access denied. This agent is not shared with you.');
    }

    const file = await AgentService.getLatestFile(a.id);
    if (!file) {
      return res.render('agent/not-ready', { title: a.name, name: a.name });
    }

    let html = AgentService.injectDisclaimer(AgentService.decodeHtml(file.content));

    const userEmail = req.session.userEmail || '';
    const userName = req.session.userName || userEmail;

    // Inject real-time chat
    const chatHtml = `<div id="pier-chat-root" data-slug="${req.params.slug}" data-email="${userEmail}" data-name="${userName}" style="display:none;"></div>
<link rel="stylesheet" href="/css/chat.css">
<div id="pier-chat-btn" onclick="toggleChat()">💬</div>
<div id="pier-chat-overlay" onclick="toggleChat()">
  <div id="pier-chat-panel" onclick="event.stopPropagation()">
    <div id="pier-chat-header">
      <div><span id="pier-chat-title">实时聊天</span></div>
      <div><span id="pier-chat-online"></span><button id="pier-chat-close" onclick="toggleChat()">✕</button></div>
    </div>
    <div id="pier-chat-msgs"></div>
    <div id="pier-chat-input-area">
      <textarea id="pier-chat-input" placeholder="说点什么..." maxlength="500" rows="1" oninput="this.style.height='';this.style.height=Math.min(this.scrollHeight,70)+'px'" onfocus="onInputFocus()" onblur="onInputBlur()" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatMsg()}"></textarea>
      <button id="pier-chat-send" onclick="sendChatMsg()">➤</button>
    </div>
    <div id="pier-chat-footer">实时消息仅当前在线用户可见，关闭后消失</div>
  </div>
</div>
<script src="/js/chat.js"></script>`;
    html = html.replace('</body>', `${chatHtml}</body>`);

    res.send(html);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug/share', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const agent = await AgentService.getBySlug(req.params.slug);
    if (!agent || agent.user_id !== req.session.userId) {
      return res.status(404).send('Agent not found');
    }

    const share = await AgentService.getShare(agent.id);

    res.render('agent/share', {
      title: 'Share Agent',
      agent,
      share: share || null,
      error: null,
      success: null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:slug/share', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const agent = await AgentService.getBySlug(req.params.slug);
    if (!agent || agent.user_id !== req.session.userId) {
      return res.status(404).send('Agent not found');
    }

    const parsed = shareSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.render('agent/share', {
        title: 'Share Agent', agent, share: null,
        error: '请输入有效的邮箱地址', success: null,
      });
    }

    const existing = await AgentService.getShare(agent.id);
    if (existing) {
      return res.render('agent/share', {
        title: 'Share Agent', agent, share: existing,
        error: 'Already shared with someone. Unshare first.', success: null,
      });
    }

    await AgentService.share(agent.id, parsed.data.partnerEmail);
    res.render('agent/share', {
      title: 'Share Agent', agent, share: { partner_email: parsed.data.partnerEmail },
      error: null, success: `Shared with ${parsed.data.partnerEmail}`,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/request-version', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const parent = await AgentService.getById(req.params.id);
    if (!parent || parent.status !== 'completed') {
      return res.status(404).send('Agent not found or not completed');
    }
    if (parent.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).send('Access denied');
    }

    res.render('agent/request-version', { title: 'Request New Version', parent, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/request-version', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const parent = await AgentService.getById(req.params.id);
    if (!parent || parent.status !== 'completed') {
      return res.status(404).send('Agent not found or not completed');
    }
    if (parent.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).send('Access denied');
    }

    const { name, description } = req.body;
    if (!name?.trim() || !description?.trim()) {
      return res.render('agent/request-version', {
        title: 'Request New Version', parent, error: '名称和描述不能为空'
      });
    }

    const newVersion = (parent.version_number || 1) + 1;
    await AgentService.create({
      name: name.trim(),
      description: description.trim(),
      user_id: req.session.userId!,
    });

    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/rename', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const agent = await AgentService.getById(req.params.id);
    if (!agent) return res.status(404).send('Agent not found');
    if (agent.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).send('Access denied');
    }

    const { name } = req.body;
    if (!name?.trim() || name.trim().length > 50) {
      return res.status(400).send('名称不能为空且不超过50个字符');
    }

    await AgentService.update(req.params.id, { name: name.trim() });
    res.redirect('back');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/toggle-public', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const agent = await AgentService.getById(req.params.id);
    if (!agent) return res.status(404).send('Agent not found');
    if (agent.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).send('Access denied');
    }

    await AgentService.togglePublic(req.params.id);
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/delete', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const deleted = await AgentService.deleteByUser(req.params.id, req.session.userId!);
    if (!deleted) return res.status(404).send('Agent not found');
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

router.post('/:slug/unshare', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const agent = await AgentService.getBySlug(req.params.slug);
    if (!agent || agent.user_id !== req.session.userId) {
      return res.status(404).send('Agent not found');
    }

    await AgentService.unshare(agent.id);
    res.redirect(`/agent/${req.params.slug}/share`);
  } catch (err) {
    next(err);
  }
});

// Public route for viewing completed agents (no auth required)
export const publicRouter = Router();

publicRouter.get('/p/:slug', async (req: Request, res: Response, next) => {
  try {
    const a = await AgentService.getBySlugForPublic(req.params.slug);
    if (!a) {
      return res.status(404).send('页面未找到');
    }

    const file = await AgentService.getLatestFile(a.id);
    if (!file) {
      return res.status(404).send('页面内容未找到');
    }

    const html = AgentService.decodeHtml(file.content);
    const escaped = escapeHtmlForDisplay(html);

    const protocol = req.protocol;
    const host = req.get('host');
    const pageUrl = `${protocol}://${host}/p/${req.params.slug}`;

    const desc = a.description
      ? a.description.substring(0, 120)
      : '一个精心制作的告白页面';

    res.render('agent/public', {
      layout: false,
      name: a.name,
      description: desc,
      agentHtmlEscaped: escaped,
      pageUrl: pageUrl,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
