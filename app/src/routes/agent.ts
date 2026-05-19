import { Router, Request, Response } from 'express';
import pool from '../services/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/new', requireAuth, (_req: Request, res: Response) => {
  res.render('agent/new', { title: 'New Agent', error: null });
});

router.post('/new', requireAuth, async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name || !name.trim() || !description || !description.trim()) {
    return res.render('agent/new', { title: 'New Agent', error: 'Name and description are required.' });
  }

  if (name.trim().length > 50) {
    return res.render('agent/new', { title: 'New Agent', error: '页面名称不能超过50个字符。' });
  }

  if (description.trim().length > 500) {
    return res.render('agent/new', { title: 'New Agent', error: '描述不能超过500个字符。' });
  }

  try {
    await pool.query(
      `INSERT INTO agent_requests (user_id, name, description)
       VALUES ($1, $2, $3)`,
      [req.session.userId, name.trim(), description.trim()]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Create agent error:', err);
    res.render('agent/new', { title: 'New Agent', error: 'Server error. Try again.' });
  }
});

router.get('/:slug', async (req: Request, res: Response) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.redirect('/auth/login');
  }

  try {
    const agent = await pool.query(
      `SELECT ar.*, u.email as creator_email FROM agent_requests ar
       JOIN users u ON u.id = ar.user_id
       WHERE ar.unique_slug = $1::uuid AND (ar.status = 'completed' OR ar.status = 'dev_review')`,
      [req.params.slug]
    );

    if (agent.rows.length === 0) {
      return res.status(404).send('Agent not found');
    }

    const a = agent.rows[0];
    const isAdmin = req.session.role === 'admin';
    const isCreator = a.user_id === userId;

    const userEmail = req.session.userEmail || '';

    const share = await pool.query(
      'SELECT partner_user_id FROM agent_shares WHERE agent_id = $1',
      [a.id]
    );
    const isPartner = share.rows.length > 0 && share.rows[0].partner_user_id === userId;

    if (!isCreator && !isPartner && !isAdmin) {
      return res.status(403).send('Access denied. This agent is not shared with you.');
    }

    const file = await pool.query(
      'SELECT content FROM agent_files WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1',
      [a.id]
    );

    if (file.rows.length === 0) {
      return res.render('agent/not-ready', { title: a.name, name: a.name });
    }

    let raw = file.rows[0].content;
    let html: string;
    try {
      html = Buffer.from(raw, 'base64').toString('utf-8');
      if (!html.includes('<!DOCTYPE') && !html.includes('<html')) html = raw;
    } catch { html = raw; }
    const disclaimer = `<div style="position:fixed;bottom:10px;left:10px;right:10px;font-size:11px;color:rgba(0,0,0,0.2);z-index:9999;pointer-events:none;text-align:center;">本页面由 AI 自动生成，为个人学习实验项目，内容仅供展示，不构成任何承诺或保证。</div>`;
    html = html.replace('</body>', `${disclaimer}</body>`);

    // Inject real-time chat
    const chatHtml = `<div id="pier-chat-root" data-slug="${req.params.slug}" data-email="${userEmail}" style="display:none;"></div>
<style>
#pier-chat-btn{position:fixed;bottom:20px;right:20px;z-index:10000;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#ff6b9d,#c2185b);color:#fff;border:none;font-size:26px;cursor:pointer;box-shadow:0 4px 20px rgba(194,24,91,0.4);display:flex;align-items:center;justify-content:center;transition:transform .2s;}
#pier-chat-btn:active{transform:scale(0.95)}
#pier-chat-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:10001;background:rgba(0,0,0,0.5);display:none;align-items:flex-end;justify-content:center;}
#pier-chat-panel{width:100%;max-width:480px;background:#fff;border-radius:20px 20px 0 0;max-height:70vh;height:70vh;display:flex;flex-direction:column;box-shadow:0 -4px 30px rgba(0,0,0,0.2);transform:translateY(100%);transition:transform .3s ease;}
@media(max-width:480px){ #pier-chat-panel{max-width:100%;border-radius:16px 16px 0 0;height:75vh;max-height:75vh;} }
#pier-chat-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f0f0f0;border-radius:20px 20px 0 0;background:#fff;}
#pier-chat-title{font-size:16px;font-weight:600;color:#333;}
#pier-chat-online{font-size:12px;color:#999;margin-right:8px;}
#pier-chat-close{background:none;border:none;font-size:24px;cursor:pointer;color:#666;padding:0;line-height:1;}
#pier-chat-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#f8f9fa;}
#pier-chat-msg-me{display:flex;flex-direction:column;align-items:flex-end;max-width:85%;}
#pier-chat-msg-me .bubble{background:linear-gradient(135deg,#ff6b9d,#e91e63);color:#fff;padding:10px 16px;border-radius:20px 20px 4px 20px;font-size:15px;line-height:1.4;word-break:break-word;box-shadow:0 2px 8px rgba(233,30,99,0.3);}
#pier-chat-msg-other{display:flex;flex-direction:column;align-items:flex-start;max-width:85%;}
#pier-chat-msg-other .bubble{background:#fff;color:#333;padding:10px 16px;border-radius:20px 20px 20px 4px;font-size:15px;line-height:1.4;word-break:break-word;box-shadow:0 1px 4px rgba(0,0,0,0.1);}
#pier-chat-msg-meta{font-size:11px;color:#aaa;margin:4px 4px 0;}
#pier-chat-input-area{padding:12px 16px 20px;background:#fff;border-top:1px solid #f0f0f0;display:flex;gap:10px;align-items:center;}
#pier-chat-input{flex:1;border:none;background:#f5f5f5;border-radius:24px;padding:12px 18px;font-size:15px;outline:none;height:48px;}
#pier-chat-send{background:linear-gradient(135deg,#ff6b9d,#e91e63);color:#fff;border:none;border-radius:50%;width:48px;height:48px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(233,30,99,0.3);}
#pier-chat-send:active{transform:scale(0.95);}
#pier-chat-footer{padding:0 16px 12px;font-size:11px;color:#bbb;text-align:center;background:#fff;}
</style>
<div id="pier-chat-btn" onclick="toggleChat()">💬</div>
<div id="pier-chat-overlay" onclick="toggleChat()">
  <div id="pier-chat-panel" onclick="event.stopPropagation()">
    <div id="pier-chat-header">
      <span id="pier-chat-title">实时聊天</span>
      <span><span id="pier-chat-online"></span><button id="pier-chat-close" onclick="toggleChat()">✕</button></span>
    </div>
    <div id="pier-chat-msgs"></div>
    <div id="pier-chat-input-area">
      <input id="pier-chat-input" type="text" placeholder="说点什么..." maxlength="500" onkeydown="if(event.key==='Enter')sendChatMsg()">
      <button id="pier-chat-send" onclick="sendChatMsg()">➤</button>
    </div>
    <div id="pier-chat-footer">实时消息仅当前在线用户可见，关闭后消失，无历史记录</div>
  </div>
</div>
<script>
(function(){
  var slug = document.getElementById('pier-chat-root').getAttribute('data-slug');
  var userEmail = document.getElementById('pier-chat-root').getAttribute('data-email') || '游客';
  var wsUrl = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws?slug=' + encodeURIComponent(slug);
  var ws = null;
  var reconnectTimer = null;
  var trying = false;

  function connect() {
    if (trying || (ws && ws.readyState === WebSocket.OPEN)) return;
    trying = true;
    console.log('[Chat] Connecting to', wsUrl);
    ws = new WebSocket(wsUrl);
    ws.onopen = function() {
      trying = false;
      console.log('[Chat] Connected');
      addSystemMsg('已连接', 'success');
      ws.send(JSON.stringify({type:'join',userEmail:userEmail}));
    };
    ws.onmessage = function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'users') {
          updateOnline(msg.count);
        } else if (msg.type === 'join') {
          addSystemMsg(msg.user + ' 加入了');
          if (msg.users) updateOnline(msg.users);
        } else if (msg.type === 'leave') {
          addSystemMsg(msg.user + ' 离开了');
          if (msg.users) updateOnline(msg.users);
        } else if (msg.type === 'message') {
          var d = new Date(msg.time);
          var t = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
          addChatMsg(msg.user, msg.text, t);
        } else if (msg.type === 'error') {
          addSystemMsg('⚠ ' + msg.message, 'error');
        }
      } catch(ex) { console.log('[Chat] Parse error', ex); }
    };
    ws.onclose = function(e) {
      trying = false;
      console.log('[Chat] Disconnected', e.code, e.reason);
      addSystemMsg('连接断开，3秒后重连...', 'error');
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 3000);
    };
    ws.onerror = function(e) {
      console.log('[Chat] Error', e);
      trying = false;
    };
  }

  function updateOnline(n) {
    var el = document.getElementById('pier-chat-online');
    if (el) el.textContent = n + '人在线 ';
  }

  function addSystemMsg(text, type) {
    var el = document.getElementById('pier-chat-msgs');
    if (!el) return;
    var d = document.createElement('div');
    d.style.cssText = 'text-align:center;font-size:12px;padding:8px;color:' + (type === 'error' ? '#e91e63' : '#999') + ';';
    d.textContent = text;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }

  function addChatMsg(user, text, time) {
    var el = document.getElementById('pier-chat-msgs');
    if (!el) return;
    var isMe = user === userEmail || user === '你';
    var name = isMe ? '你' : (user.split('@')[0] || user);
    var d = document.createElement('div');
    d.className = isMe ? 'pier-chat-msg-me' : 'pier-chat-msg-other';
    d.innerHTML = '<div class="bubble">' + escapeHtml(text) + '</div><div class="pier-chat-msg-meta">' + name + ' · ' + time + '</div>';
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
  }

  window.toggleChat = function() {
    var overlay = document.getElementById('pier-chat-overlay');
    var panel = document.getElementById('pier-chat-panel');
    var btn = document.getElementById('pier-chat-btn');
    if (overlay.style.display === 'flex') {
      panel.style.transform = 'translateY(100%)';
      setTimeout(function(){ overlay.style.display = 'none'; }, 300);
      btn.style.display = 'flex';
    } else {
      overlay.style.display = 'flex';
      btn.style.display = 'none';
      setTimeout(function(){ panel.style.transform = 'translateY(0)'; }, 10);
      document.getElementById('pier-chat-input').focus();
    }
  };

  window.sendChatMsg = function() {
    var input = document.getElementById('pier-chat-input');
    var text = input.value.trim();
    if (!text) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addSystemMsg('连接中，请稍候...', 'error');
      connect();
      return;
    }
    ws.send(JSON.stringify({type:'message',text:text}));
    input.value = '';
    input.focus();
  };

  connect();
})();
</script>`;
    html = html.replace('</body>', `${chatHtml}</body>`);

    res.send(html);
  } catch (err) {
    console.error('Agent view error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/:slug/share', requireAuth, async (req: Request, res: Response) => {
  try {
    const agent = await pool.query(
      `SELECT * FROM agent_requests
       WHERE unique_slug = $1::uuid AND user_id = $2`,
      [req.params.slug, req.session.userId]
    );

    if (agent.rows.length === 0) {
      return res.status(404).send('Agent not found');
    }

    const share = await pool.query(
      'SELECT * FROM agent_shares WHERE agent_id = $1',
      [agent.rows[0].id]
    );

    res.render('agent/share', {
      title: 'Share Agent',
      agent: agent.rows[0],
      share: share.rows[0] || null,
      error: null,
      success: null,
    });
  } catch (err) {
    console.error('Share page error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/:slug/share', requireAuth, async (req: Request, res: Response) => {
  const { partnerEmail } = req.body;

  try {
    const agent = await pool.query(
      `SELECT * FROM agent_requests
       WHERE unique_slug = $1::uuid AND user_id = $2`,
      [req.params.slug, req.session.userId]
    );

    if (agent.rows.length === 0) {
      return res.status(404).send('Agent not found');
    }

    if (!partnerEmail || !partnerEmail.includes('@')) {
      return res.render('agent/share', {
        title: 'Share Agent', agent: agent.rows[0], share: null,
        error: 'Invalid email address.', success: null,
      });
    }

    const existing = await pool.query(
      'SELECT * FROM agent_shares WHERE agent_id = $1',
      [agent.rows[0].id]
    );

    if (existing.rows.length > 0) {
      return res.render('agent/share', {
        title: 'Share Agent', agent: agent.rows[0], share: existing.rows[0],
        error: 'Already shared with someone. Unshare first.', success: null,
      });
    }

    const partner = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [partnerEmail]
    );

    await pool.query(
      `INSERT INTO agent_shares (agent_id, partner_email, partner_user_id)
       VALUES ($1, $2, $3)`,
      [agent.rows[0].id, partnerEmail, partner.rows[0]?.id || null]
    );

    res.render('agent/share', {
      title: 'Share Agent', agent: agent.rows[0], share: { partner_email: partnerEmail },
      error: null,
      success: `Shared with ${partnerEmail}`,
    });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).send('Server error');
  }
});

// GET /:id/request-version — Show form for requesting a new version
router.get('/:id/request-version', requireAuth, async (req: Request, res: Response) => {
  try {
    const parent = await pool.query(
      `SELECT id, name, description, version_number, user_id
       FROM agent_requests WHERE id = $1::uuid AND status = 'completed'`,
      [req.params.id]
    );
    if (parent.rows.length === 0) {
      return res.status(404).send('Agent not found or not completed');
    }
    const p = parent.rows[0];
    if (p.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).send('Access denied');
    }
    // Check for existing pending version
    const pending = await pool.query(
      `SELECT id FROM agent_requests
       WHERE parent_id = $1 AND status IN ('pending_review','in_development','dev_review')
       LIMIT 1`,
      [req.params.id]
    );
    if (pending.rows.length > 0) {
      return res.status(400).send('该 agent 已有未完成的版本请求，请等待处理完成后再申请新版本');
    }
    res.render('agent/request-version', { title: 'Request New Version', parent: p, error: null });
  } catch (err) {
    console.error('Request version form error:', err);
    res.status(500).send('Server error');
  }
});

// POST /:id/request-version — Submit a new version request
router.post('/:id/request-version', requireAuth, async (req: Request, res: Response) => {
  try {
    const parent = await pool.query(
      `SELECT id, name, description, version_number, status, user_id
       FROM agent_requests WHERE id = $1::uuid AND status = 'completed'`,
      [req.params.id]
    );
    if (parent.rows.length === 0) {
      return res.status(404).send('Agent not found or not completed');
    }
    const p = parent.rows[0];
    if (p.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).send('Access denied');
    }
    // Check for existing pending version
    const pending = await pool.query(
      `SELECT id FROM agent_requests
       WHERE parent_id = $1 AND status IN ('pending_review','in_development','dev_review')
       LIMIT 1`,
      [req.params.id]
    );
    if (pending.rows.length > 0) {
      return res.status(400).send('该 agent 已有未完成的版本请求');
    }
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.render('agent/request-version', { title: 'Request New Version', parent: p, error: '名称不能为空' });
    }
    if (!description || !description.trim()) {
      return res.render('agent/request-version', { title: 'Request New Version', parent: p, error: '描述不能为空' });
    }
    if (name.trim().length > 50) {
      return res.render('agent/request-version', { title: 'Request New Version', parent: p, error: '名称不能超过50个字符' });
    }
    const newVersion = (p.version_number || 1) + 1;
    await pool.query(
      `INSERT INTO agent_requests (user_id, name, description, parent_id, version_number)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.session.userId, name.trim(), description.trim(), p.id, newVersion]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Request version error:', err);
    res.status(500).send('Server error');
  }
});

// POST /:id/rename — Rename an agent (owner or admin)
router.post('/:id/rename', requireAuth, async (req: Request, res: Response) => {
  try {
    const agent = await pool.query(
      'SELECT id, user_id FROM agent_requests WHERE id = $1::uuid',
      [req.params.id]
    );
    if (agent.rows.length === 0) return res.status(404).send('Agent not found');
    const a = agent.rows[0];
    if (a.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).send('Access denied');
    }
    const { name } = req.body;
    if (!name || !name.trim() || name.trim().length > 50) {
      return res.status(400).send('名称不能为空且不超过50个字符');
    }
    await pool.query(
      'UPDATE agent_requests SET name = $1, updated_at = NOW() WHERE id = $2',
      [name.trim(), req.params.id]
    );
    res.redirect('back');
  } catch (err) {
    console.error('Rename error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/:id/delete', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `DELETE FROM agent_requests
       WHERE id = $1::uuid AND user_id = $2
       RETURNING id`,
      [req.params.id, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Agent not found');
    }

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Agent delete error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/:slug/unshare', requireAuth, async (req: Request, res: Response) => {
  try {
    const agent = await pool.query(
      `SELECT id FROM agent_requests
       WHERE unique_slug = $1::uuid AND user_id = $2`,
      [req.params.slug, req.session.userId]
    );

    if (agent.rows.length === 0) {
      return res.status(404).send('Agent not found');
    }

    await pool.query('DELETE FROM agent_shares WHERE agent_id = $1', [agent.rows[0].id]);
    res.redirect(`/agent/${req.params.slug}/share`);
  } catch (err) {
    console.error('Unshare error:', err);
    res.status(500).send('Server error');
  }
});

export default router;
