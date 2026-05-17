# Technical Design Document

## 1. Architecture

```
User Browser (https://ailaopo.online)
    ↓
Azure VPS (Ubuntu 24.04) → Docker Compose
    │
    ├── nginx [:80 → :443]  (SSL termination, reverse proxy)
    ├── webapp [:3000]      (Node.js + TypeScript + Express)
    │       │                (EJS templates, SendGrid API)
    │       └── reads from /data/agents/<uuid>/index.html
    │
    └── postgres [:5432]    (PostgreSQL 16, persistent volume)
```

## 2. Technology Stack

| Layer | Choice | Purpose |
|-------|--------|---------|
| **Language** | TypeScript 5.x | Type safety, cleaner code |
| **Runtime** | Node.js 20 LTS | Per user request |
| **Web Framework** | Express.js 4.x | Minimal, well-known |
| **Template Engine** | EJS | Server-side render (no SPA) |
| **Database** | PostgreSQL 16 in Docker | Reltable, JSON support |
| **DB Driver** | `pg` + `@types/pg` | Native PostgreSQL for TS |
| **Session** | `express-session` + `connect-pg-simple` | Server-side sessions |
| **Email** | SendGrid Web API v3 | 100 free emails/day |
| **Build** | `tsc` (TypeScript compiler) | .ts → .js at build time |
| **Process** | Docker restart policy | Crash recovery + daily reboot |

## 3. Directory Structure

```
pier/
├── docker-compose.yml          # Multi-container setup
├── Dockerfile                  # Node.js + TypeScript build
├── nginx/
│   ├── nginx.conf
│   └── entrypoint.sh
├── app/
│   ├── package.json
│   ├── tsconfig.json           # TS compiler config
│   ├── src/                    # TypeScript source
│   │   ├── server.ts           # Entry point
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── agent.ts
│   │   │   └── admin.ts
│   │   ├── models/
│   │   │   ├── user.ts
│   │   │   ├── agent.ts
│   │   │   ├── version.ts
│   │   │   ├── share.ts
│   │   │   └── verification.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── admin.ts
│   │   ├── services/
│   │   │   └── mail.ts
│   │   └── types/
│   │       └── index.ts        # Shared type definitions
│   ├── views/                  # EJS templates (unchanged)
│   │   ├── layout.ejs
│   │   ├── index.ejs
│   │   ├── auth/
│   │   │   ├── login.ejs
│   │   │   └── register.ejs
│   │   ├── dashboard.ejs
│   │   ├── agent/
│   │   │   ├── new.ejs
│   │   │   └── detail.ejs
│   │   └── admin/
│   │       ├── requests.ejs
│   │       └── review.ejs
│   └── dist/                   # Compiled JS output (gitignored)
├── data/
│   └── agents/                 # Agent static HTML files
│       └── <uuid>/
│           ├── index.html
│           └── v1.html
├── docs/
│   ├── architecture.md         # High-level overview
│   ├── requirements.md         # Feature requirements
│   └── tech-design.md          # This document
├── .env                        # Secrets (not committed)
├── .gitignore
└── opencode.json
```

## 4. Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_requests (
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

CREATE TABLE agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agent_requests(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    request_description TEXT NOT NULL,
    html_file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID UNIQUE NOT NULL REFERENCES agent_requests(id) ON DELETE CASCADE,
    partner_email VARCHAR(255) NOT NULL,
    partner_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 5. Route / API Design

### Public Routes

| Method | Path | Action |
|--------|------|--------|
| GET | `/` | Render homepage |
| GET | `/auth/register` | Show register form |
| POST | `/auth/register` | Send verification code |
| POST | `/auth/register/verify` | Submit code → create user |
| GET | `/auth/login` | Show login form |
| POST | `/auth/login` | Send verification code |
| POST | `/auth/login/verify` | Submit code → start session |
| POST | `/auth/logout` | Destroy session |

### User Routes (auth required)

| Method | Path | Action |
|--------|------|--------|
| GET | `/dashboard` | List user's agent requests |
| GET | `/agent/new` | Show submission form |
| POST | `/agent/new` | Submit new request |
| GET | `/agent/:slug` | View agent page (auth + permission) |
| GET | `/agent/:slug/edit` | Request edit form |
| POST | `/agent/:slug/edit` | Submit edit request |
| GET | `/agent/:slug/share` | Share management |
| POST | `/agent/:slug/share` | Share with partner email |
| POST | `/agent/:slug/unshare` | Revoke share |

### Admin Routes (auth + admin role)

| Method | Path | Action |
|--------|------|--------|
| GET | `/admin` | Admin dashboard |
| GET | `/admin/requests` | Queue of all pending requests |
| GET | `/admin/requests/:id` | Review specific request |
| POST | `/admin/requests/:id/review` | Approve or reject |
| POST | `/admin/requests/:id/complete` | Mark as completed (after deploying HTML) |

### Agent Page Serving

When an agent is `completed`:
1. User requests `GET /agent/:slug`
2. Middleware checks: logged-in + (user is creator or partner)
3. If authorized, read `data/agents/<uuid>/index.html` from disk
4. Inject disclaimer footer into the HTML
5. Return the modified HTML

## 6. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
COPY views/ ./views/
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## 7. Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: pier
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: pier
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pier"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_USER: pier
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: pier
      SESSION_SECRET: ${SESSION_SECRET}
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
      SITE_URL: https://ailaopo.online
    volumes:
      - agent_data:/app/data/agents
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app
    restart: always

volumes:
  pgdata:
  agent_data:
```

## 8. Email (SendGrid Integration)

```typescript
// app/src/services/mail.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<void> {
  await sgMail.send({
    to: email,
    from: 'noreply@ailaopo.online',
    subject: '你的验证码 / Your Verification Code',
    html: `<p>你的验证码是: <b>${code}</b></p>
           <p>有效期10分钟 / Valid for 10 minutes</p>`,
  });
}
```

Setup (one-time): register on SendGrid, create API key, verify sender.

## 9. Deployment

### Phase 1 (manual)
```bash
# On VPS
git pull origin master
docker compose up -d --build
```

### Key `docker compose up -d --build`
- `--build` recompiles TypeScript inside the Dockerfile
- `-d` runs in background
- Containers auto-restart on reboot (restart: always)

## 10. Key Implementation Notes

### Disclaimer Injection
Agent pages are served **through** Node so it can inject the disclaimer. The flow: authenticate → authorize → read file → inject footer → respond.

### Registration Daily Cap
```typescript
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const count = await pool.query(
  'SELECT COUNT(*) FROM users WHERE registration_date = CURRENT_DATE'
);
if (parseInt(count.rows[0].count) >= 100) {
  return res.status(403).send('Daily registration limit reached');
}
```

### Session Security
- `express-session` backed by PostgreSQL
- Session secret from `.env`, never hardcoded
- HTTP-only cookies, secure in production
- Session TTL: 24 hours

### Watermark
Every served page must include bottom-right watermark: "AI 自动化学习中..."

### Middleware Pattern
```typescript
// middleware/auth.ts
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.redirect('/auth/login');
  next();
}

// middleware/admin.ts
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session.role !== 'admin') return res.status(403).send('Forbidden');
  next();
}
```

## 11. .env File Format

```bash
# Required (create on VPS, never commit)
DB_PASSWORD=<random_strong_password>
SESSION_SECRET=<random_string>
SENDGRID_API_KEY=<sendgrid_api_key>

# Optional with defaults
PORT=3000
DB_HOST=postgres
DB_USER=pier
DB_NAME=pier
SITE_URL=https://ailaopo.online
```

## 12. Open Technical Questions

| # | Question |
|---|----------|
| T-1 | Nginx config: should nginx serve agent static files directly (faster), or always proxy through Node? (Decision: proxy through Node for auth check + disclaimer injection) |
| T-2 | How to create first admin user? (seed from .env ADMIN_EMAIL variable on first startup) |
| T-3 | Database migration strategy? (manual .sql files + node script, or use a migration library like `node-pg-migrate`) |
