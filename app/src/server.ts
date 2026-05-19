import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import session from 'express-session';
import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import expressLayouts from 'express-ejs-layouts';
import pgSession from 'connect-pg-simple';
import pool, { initDB } from './services/db';
import { requireAuth, requireAdmin, requireDevApiKey } from './middleware/auth';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import agentRoutes from './routes/agent';
import adminRoutes from './routes/admin';
import devRoutes from './routes/dev';

const app = express();

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
  next();
});

app.use('/auth', authRoutes);
app.use('/dashboard', requireAuth, dashboardRoutes);
app.use('/agent', agentRoutes);
app.use('/admin', requireAuth, requireAdmin, adminRoutes);
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
    // Content may be base64-encoded (new format) or plain text (legacy)
    let html: string;
    try {
      html = Buffer.from(raw, 'base64').toString('utf-8');
      if (!html.includes('<!DOCTYPE') && !html.includes('<html')) html = raw; // not actually base64
    } catch { html = raw; }
    const disclaimer = `<div style="position:fixed;bottom:10px;right:10px;font-size:12px;color:rgba(255,255,255,0.3);z-index:9999;pointer-events:none;">AI 自动化学习中...</div>
<div style="position:fixed;bottom:10px;left:10px;font-size:11px;color:rgba(0,0,0,0.2);z-index:9999;pointer-events:none;">This page is for demonstration purposes only.</div>`;
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

async function start(): Promise<void> {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
