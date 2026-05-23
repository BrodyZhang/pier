import { Pool } from 'pg';

function getConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const user = process.env.DB_USER || 'pier';
  const pw = process.env.DB_PASSWORD || '';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const db = process.env.DB_NAME || 'pier';
  return `postgres://${user}:${pw}@${host}:${port}/${db}`;
}

const connStr = getConnectionString();

// Pool created lazily — pg does not connect until first query
const pool = new Pool({
  connectionString: connStr,
});

// Ensure UTF-8 client encoding on every new connection
pool.on('connect', (client) => {
  client.query("SET client_encoding TO 'UTF8'").catch((err: Error) => {
    console.error('Failed to set client_encoding:', err.message);
  });
});

export default pool;

const schemaSQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100) DEFAULT '';

CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review',
    rejection_reason TEXT,
    review_notes TEXT,
    review_comments TEXT,
    unique_slug UUID UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS review_comments TEXT;
ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS review_log JSONB DEFAULT '[]'::jsonb;
ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES agent_requests(id);
ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS version_number INT DEFAULT 1;
ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS showcased BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agent_requests(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    request_description TEXT NOT NULL,
    html_file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_files (
    id SERIAL PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES agent_requests(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID UNIQUE NOT NULL REFERENCES agent_requests(id) ON DELETE CASCADE,
    partner_email VARCHAR(255) NOT NULL,
    partner_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session store for connect-pg-simple
CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions (expire);
`;

export async function initDB(): Promise<void> {
  // Ensure the target database exists (separate from default postgres db)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const adminUrl = dbUrl.replace(/\/[^/]+$/, '/postgres');
    const dbName = dbUrl.split('/').pop();
    if (dbName && dbName !== 'postgres') {
      const adminPool = new Pool({ connectionString: adminUrl });
      try {
        const result = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (result.rows.length === 0) {
          await adminPool.query(`CREATE DATABASE "${dbName}" OWNER pier ENCODING 'UTF8'`);
          console.log(`Created database: ${dbName}`);
        }
      } finally {
        await adminPool.end();
      }
    }
  }

  await pool.query(schemaSQL);
  console.log('Database schema initialized');

  // Seed built-in admin (always present regardless of config)
  await ensureAdmin('296068994@qq.com');

  // Seed additional admin from env var (if set)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && adminEmail !== '296068994@qq.com') {
    await ensureAdmin(adminEmail);
  }
}

async function ensureAdmin(email: string): Promise<void> {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO users (email, role) VALUES ($1, 'admin')`,
      [email]
    );
    console.log(`Admin user created: ${email}`);
  } else {
    await pool.query(
      `UPDATE users SET role = 'admin' WHERE email = $1`,
      [email]
    );
    console.log(`Admin role set for: ${email}`);
  }
}
