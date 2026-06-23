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
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { initDB } from './services/db';
import pool from './services/db';
import { requireAuth, requireAdmin, requireDevApiKey } from './middleware/auth';
import { authLimiter, apiLimiter } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';
import { AgentService } from './services/agent.service';
import { decodeBase64Html, injectDisclaimer } from './utils/html';
import { setupWebSocket } from './ws/chat';
import { logger } from './utils/logger';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import agentRoutes, { publicRouter } from './routes/agent';
import adminRoutes from './routes/admin';
import profileRoutes from './routes/profile';
import devRoutes from './routes/dev';

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '3000');

app.use(pinoHttp({ logger }));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

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
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 60, // 1 hour in seconds
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
  _res.locals.adminEmail = process.env.ADMIN_EMAIL || '';
  _res.locals.contactEmail = process.env.CONTACT_EMAIL || '';
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authLimiter, authRoutes);
app.use('/dashboard', requireAuth, dashboardRoutes);
app.use('/agent', agentRoutes);
app.use('/admin', requireAuth, requireAdmin, adminRoutes);
app.use('/profile', profileRoutes);
// API v1 routes (versioned)
app.use('/api/v1/dev', apiLimiter, requireDevApiKey, devRoutes);
// Legacy API routes (backward compatible, redirect to v1)
app.use('/api/dev', apiLimiter, requireDevApiKey, devRoutes);
app.use('/', publicRouter);

app.get('/', async (_req, res, next) => {
  try {
    const showcasedAgents = await AgentService.getShowcased(12);
    res.render('index', { user: null, showcasedAgents });
  } catch (err) {
    next(err);
  }
});

// Serve game HTML from database by slug (public, no auth)
app.get('/g/:slug', async (req, res, next) => {
  try {
    const agent = await pool.query(
      `SELECT id FROM agent_requests WHERE unique_slug = $1::uuid AND status IN ('completed','dev_review')`,
      [req.params.slug]
    );
    if (agent.rows.length === 0) {
      return res.status(404).send('Game not found');
    }
    const file = await AgentService.getLatestFile(agent.rows[0].id);
    if (!file) return res.status(404).send('Game content not found');
    const html = injectDisclaimer(decodeBase64Html(file.content));
    res.send(html);
  } catch (err) {
    next(err);
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

// Error handling middleware (must be after all routes)
app.use(errorHandler);

// Setup WebSocket
setupWebSocket(server);

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
