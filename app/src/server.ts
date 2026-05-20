import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import session from 'express-session';
import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import expressLayouts from 'express-ejs-layouts';
import pgSession from 'connect-pg-simple';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import pool, { initDB } from './services/db';
import { requireAuth, requireAdmin, requireDevApiKey } from './middleware/auth';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import agentRoutes from './routes/agent';
import adminRoutes from './routes/admin';
import profileRoutes from './routes/profile';
import devRoutes from './routes/dev';

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '3000');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.set('trust proxy', 1);
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 } }));

const PgStore = pgSession(session);

app.use(session({
  store: new PgStore({
    pool,
    tableName: 'user_sessions',
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: 'auto',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Make session data available to all views
app.use((req, _res, next) => {
  _res.locals.userId = req.session.userId;
  _res.locals.role = req.session.role;
  _res.locals.isAdmin = req.session.role === 'admin';
  _res.locals.userEmail = req.session.userEmail || '';
  _res.locals.userName = req.session.userName || '';
  _res.locals.adminEmail = process.env.ADMIN_EMAIL || 'ailaopoonline@yeah.net';
  _res.locals.contactEmail = process.env.CONTACT_EMAIL || 'ailaopoonline@yeah.net';
  next();
});

app.use('/auth', authRoutes);
app.use('/dashboard', requireAuth, dashboardRoutes);
app.use('/agent', agentRoutes);
app.use('/admin', requireAuth, requireAdmin, adminRoutes);
app.use('/profile', profileRoutes);
app.use('/api/dev', requireDevApiKey, devRoutes);

app.get('/', (_req, res) => {
  res.render('index', { user: null });
});

// Serve game HTML from database by slug (public, no auth)
app.get('/g/:slug', async (req, res) => {
  try {
    const agent = await pool.query(
      `SELECT id FROM agent_requests WHERE unique_slug = $1::uuid AND status IN ('completed','dev_review')`,
      [req.params.slug]
    );
    if (agent.rows.length === 0) {
      return res.status(404).send('Game not found');
    }
    const file = await pool.query(
      'SELECT content FROM agent_files WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1',
      [agent.rows[0].id]
    );
    if (file.rows.length === 0) return res.status(404).send('Game content not found');
    let raw = file.rows[0].content;
    let html: string;
    try {
      html = Buffer.from(raw, 'base64').toString('utf-8');
      if (!html.includes('<!DOCTYPE') && !html.includes('<html')) html = raw;
    } catch { html = raw; }
    const disclaimer = `<div style="position:fixed;bottom:10px;left:10px;right:10px;font-size:11px;color:rgba(0,0,0,0.2);z-index:9999;pointer-events:none;text-align:center;">本页面由 AI 自动生成，为个人学习实验项目，内容仅供展示，不构成任何承诺或保证。</div>`;
    html = html.replace('</body>', `${disclaimer}</body>`);
    res.send(html);
  } catch (err) {
    console.error('Game serve error:', err);
    res.status(500).send('Server error');
  }
});

// Serve pre-built game files directly from filesystem
app.get('/g/file/:name', (req, res) => {
  const { name } = req.params;
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return res.status(400).send('Invalid name');
  const filePath = path.join(__dirname, '../games', `${name}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Not found');
  }
});

// --- WebSocket Chat ---
interface ChatClient {
  ws: WebSocket;
  userEmail: string;
  lastMessageTime: number;
}

const rooms = new Map<string, Map<WebSocket, ChatClient>>();

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', 'http://localhost');
  const slug = url.searchParams.get('slug');
  if (!slug) { ws.close(1008, 'slug required'); return; }

  if (!rooms.has(slug)) rooms.set(slug, new Map());
  const room = rooms.get(slug)!;

  const client: ChatClient = { ws, userEmail: '', lastMessageTime: 0 };
  room.set(ws, client);

  ws.send(JSON.stringify({ type: 'users', count: room.size }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'join') {
        client.userEmail = msg.userEmail || 'Anonymous';
        broadcast(room, { type: 'join', user: client.userEmail, users: room.size }, ws);
        return;
      }

      if (msg.type === 'message') {
        const now = Date.now();
        if (now - client.lastMessageTime < 3000) {
          ws.send(JSON.stringify({ type: 'error', message: '消息发送太快，请等待 3 秒' }));
          return;
        }
        client.lastMessageTime = now;

        const wordCount = msg.text.trim().length;
        if (wordCount === 0) return;
        if (wordCount > 500) {
          ws.send(JSON.stringify({ type: 'error', message: '消息不能超过 500 字' }));
          return;
        }

        const safeText = msg.text.substring(0, 500);
        broadcast(room, { type: 'message', text: safeText, user: client.userEmail, time: now }, null);
        return;
      }
    } catch { /* ignore malformed */ }
  });

  ws.on('close', () => {
    const email = client.userEmail;
    room.delete(ws);
    if (room.size === 0) rooms.delete(slug);
    else if (email) broadcast(room, { type: 'leave', user: email, users: room.size }, null);
  });
});

function broadcast(room: Map<WebSocket, ChatClient>, message: object, exclude: WebSocket | null) {
  const data = JSON.stringify(message);
  for (const [ws] of room) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

async function start(): Promise<void> {
  try {
    await initDB();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
