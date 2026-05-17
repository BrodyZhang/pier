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
const pool = new Pool({ connectionString: connStr });

export default pool;

const schemaSQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

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
    unique_slug UUID UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agent_requests(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    request_description TEXT NOT NULL,
    html_file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID UNIQUE NOT NULL REFERENCES agent_requests(id) ON DELETE CASCADE,
    partner_email VARCHAR(255) NOT NULL,
    partner_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
          await adminPool.query(`CREATE DATABASE "${dbName}" OWNER pier`);
          console.log(`Created database: ${dbName}`);
        }
      } finally {
        await adminPool.end();
      }
    }
  }

  await pool.query(schemaSQL);
  console.log('Database schema initialized');

  // Seed admin user from env var (if set)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (email, role) VALUES ($1, 'admin')`,
        [adminEmail]
      );
      console.log(`Admin user created: ${adminEmail}`);
    } else {
      await pool.query(
        `UPDATE users SET role = 'admin' WHERE email = $1`,
        [adminEmail]
      );
      console.log(`Admin role set for: ${adminEmail}`);
    }
  }
}
