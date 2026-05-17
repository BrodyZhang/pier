# Technical Design Document

## 1. Architecture

```
User Browser (https://ailaopo.online)
    ↓
Cloudflare / DNS → Azure VPS (Ubuntu 24.04)
    ↓
Nginx (port 80 → 443, Let's Encrypt)
    ↓
Docker Compose
    ├── webapp (Node.js + Express)  :3000
    ├── postgres (PostgreSQL 16)    :5432
    └── nginx                       :80, 443
```

### Phase 1 (Current)
```
Same host, docker-compose up, one machine:
- Node.js serves both API + static pages
- PostgreSQL as Docker container
- nginx as reverse proxy (single container or host nginx)
- Static agent HTML files stored on host filesystem
- SendGrid via HTTPS API (no mail server container)
```

## 2. Technology Choices & Rationale

| Layer | Choice | Why |
|-------|--------|-----|
| **Runtime** | Node.js 20 LTS | Per user request |
| **Framework** | Express.js | Simple, well-known, minimal abstraction |
| **Template Engine** | EJS | Server-side rendering (no SPA complexity needed) |
| **Database** | PostgreSQL 16 | Docker container, reliable, JSON support |
| **Database Driver** | `pg` (node-postgres) | Native PostgreSQL driver |
| **Session** | `express-session` + `connect-pg-simple` | Server-side sessions in PostgreSQL |
| **Email** | SendGrid Web API v3 | Free tier (100/day), HTTPS API (no SMTP containers) |
| **Auth Codes** | `crypto` (built-in) | Generate secure 6-digit codes, stored in DB |
| **CSS** | Minimal custom CSS | No framework dependency for MVP |
| **Process Manager** | Docker native | Restart policy handles crashes |

## 3. Directory Structure

```
pier/
├── docker-compose.yml          # Multi-container setup
├── Dockerfile                  # Node.js app container
├── nginx/                      # Nginx configs
│   ├── nginx.conf
│   └── entrypoint.sh
├── src/
│   └── index.html              # Old static homepage (to be replaced)
├── app/                        # Node.js application
│   ├── package.json
│   ├── server.js               # Entry point
│   ├── routes/
│   │   ├── auth.js             # Register/Login/Verify
│   │   ├── dashboard.js        # User dashboard
│   │   ├── agent.js            # Agent CRUD
│   │   └── admin.js            # Admin review panel
│   ├── views/
│   │   ├── layout.ejs          # Base layout (includes disclaimer + watermark)
│   │   ├── index.ejs           # Homepage
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
│   ├── models/
│   │   ├── user.js
│   │   ├── agent.js
│   │   ├── version.js
│   │   ├── share.js
│   │   └── verification.js
│   ├── middleware/
│   │   ├── auth.js             # Session/auth middleware
│   │   └── admin.js            # Admin role check
│   └── services/
│       ├── mail.js             # SendGrid integration
│       └── registration.js     # Daily cap logic
├── data/
│   └── agents/                 # Static HTML files
│       └── <uuid>/
│           ├── index.html
│           └── v1.html         # Version archives
├── docs/
│   ├── requirements.md
│   └── tech-design.md
├── .env                        # Not committed (secrets)
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
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review',  -- pending_review | in_development | completed | rejected
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

## 5. API / Route Design

### Auth Routes (`/auth`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/register` | Show register form |
| POST | `/auth/register` | Send verification code |
| POST | `/auth/register/verify` | Submit code to complete registration |
| GET | `/auth/login` | Show login form |
| POST | `/auth/login` | Send verification code |
| POST | `/auth/login/verify` | Submit code to login |
| POST | `/auth/logout` | Logout |

### Dashboard Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | User dashboard |

### Agent Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agent/new` | New request form |
| POST | `/agent/new` | Submit request |
| GET | `/agent/<slug>` | View agent page (requires auth + access) |
| GET | `/agent/<slug>/edit` | Request edit form |
| POST | `/agent/<slug>/edit` | Submit edit request |
| GET | `/agent/<slug>/share` | Share management page |
| POST | `/agent/<slug>/share` | Share with partner email |
| POST | `/agent/<slug>/unshare` | Revoke share |

### Admin Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin` | Admin dashboard |
| GET | `/admin/requests` | All requests queue |
| GET | `/admin/requests/<id>` | Review specific request |
| POST | `/admin/requests/<id>/review` | Approve/reject with optional reason |
| POST | `/admin/requests/<id>/complete` | Mark as completed (after deploying HTML) |

### Serving Agent Pages

When an agent is `completed`, the static HTML at `data/agents/<uuid>/index.html` is served at `/agent/<slug>`. The Node.js app:
1. Verifies auth + access permission
2. Reads the `.html` file from disk
3. Injects the disclaimer footer
4. Serves the modified HTML to the user

## 6. Docker Compose Setup

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
      - agent_data:/usr/share/nginx/agents:ro
    depends_on:
      - app
    restart: always

volumes:
  pgdata:
  agent_data:
```

## 7. Email (SendGrid)

### Setup Steps (done once)

1. Register at https://sendgrid.com (free tier)
2. Create API Key with "Mail Send" permission
3. Verify sender email or domain
4. Add DNS record in ailaopo.online domain settings

### Integration

```javascript
// services/mail.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendCode(email, code) {
  await sgMail.send({
    to: email,
    from: 'noreply@ailaopo.online',
    subject: '你的验证码 / Your Verification Code',
    html: `<p>你的验证码是: <b>${code}</b></p>`
  });
}
```

> No SMTP containers needed. No mail server on VPS. Just an HTTPS API call.

## 8. Deployment Strategy

### Phase 1 (Current)
```
1. VPS has Docker + docker-compose
2. SSH into VPS
3. git clone/pull on VPS
4. docker-compose up -d
5. Nginx terminates SSL, proxies to Node app
```

### Phase 2 (Future - GitHub Actions CD)
```
1. Push to master → build Docker image → push to registry
2. SSH to VPS → docker-compose pull && docker-compose up -d
```

For now, Phase 1 keeps things simple.

## 9. Initial Setup (One-Time)

```bash
# 1. Install Docker + docker-compose (if not already)
sudo apt update && sudo apt install docker.io docker-compose-v2

# 2. Clone repo on VPS
git clone https://github.com/BrodyZhang/pier.git /opt/pier
cd /opt/pier

# 3. Create .env file
cat > .env << 'EOF'
DB_PASSWORD=generate_a_strong_password
SESSION_SECRET=generate_a_random_secret
SENDGRID_API_KEY=your_sendgrid_api_key
EOF

# 4. Setup Let's Encrypt (already done for ailaopo.online)

# 5. Start services
docker compose up -d
```

## 10. Important Development Notes

### Disclaimer Injection
Agent pages should have the disclaimer injected programmatically, not manually added to each HTML file. The Node app wraps the static HTML with a disclaimer footer before serving.

### Session Security
- Use `express-session` with PostgreSQL store
- Session secret in `.env`, never in code
- HTTP-only cookies
- Session expiration: 24h

### Registration Cap
```sql
-- Check daily registration count
SELECT COUNT(*) FROM users WHERE registration_date = CURRENT_DATE;
```
If >= 100, reject new registrations for the day.

### Watermark
Every served page must include: "AI 自动化学习中..." watermark + legal disclaimer.
