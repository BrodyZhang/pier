import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import session from 'express-session';
import fileUpload from 'express-fileupload';
import path from 'path';
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
