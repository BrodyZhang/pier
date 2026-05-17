# Pier — Repository Index

> **AI-maintained project.** Update this file whenever files are added/removed/renamed.

## Directory Structure

```
pier/
├── .github/
│   └── workflows/
│       └── deploy.yml                  # CI/CD: build Docker → push → SSH → docker compose up
│
├── .opencode/
│   └── skills/
│       ├── repo-index/SKILL.md         # Skill: maintain REPO_INDEX.md
│       ├── deploy/SKILL.md             # Skill: deployment workflow
│       └── code-style/SKILL.md         # Skill: code conventions
│
├── app/                                # Node.js + TypeScript application
│   ├── package.json                    # Dependencies: express, pg, ejs, sendgrid, etc.
│   ├── tsconfig.json                   # TypeScript config: ES2022, commonjs, strict
│   ├── src/
│   │   ├── server.ts                   # Entry point: Express, session, EJS, routes
│   │   ├── types/
│   │   │   └── index.ts                # Session augmentation, shared interfaces
│   │   ├── middleware/
│   │   │   └── auth.ts                 # requireAuth, requireAdmin middleware
│   │   ├── routes/
│   │   │   ├── auth.ts                 # Register/login with email + 6-digit code
│   │   │   ├── dashboard.ts            # GET /dashboard — user's agents & shared
│   │   │   ├── agent.ts                # Create, view, share/unshare agent pages
│   │   │   └── admin.ts                # Admin: approve/reject/upload/review
│   │   └── services/
│   │       ├── db.ts                   # pg Pool + schema init (users, agent_requests, etc.)
│   │       └── mail.ts                 # SendGrid with NODE_ENV=dev console.log fallback
│   └── views/
│       ├── layout.ejs                  # Shared shell: nav, disclaimer, watermark
│       ├── index.ejs                   # Homepage — CTA to register
│       ├── dashboard.ejs               # User dashboard — agent list + shared agents
│       ├── auth/
│       │   ├── login.ejs               # Email → code → verify
│       │   └── register.ejs            # Email → code → verify
│       ├── agent/
│       │   ├── new.ejs                 # Submit agent request form
│       │   ├── view.ejs                # Agent page wrapper (standalone, no layout)
│       │   ├── share.ejs               # Share/unshare with partner
│       │   ├── not-ready.ejs           # "In Development" placeholder
│       │   └── 404.ejs                 # Not found
│       └── admin/
│           ├── requests.ejs            # Queue: pending, in_dev, completed
│           └── review.ejs              # Review/approve/reject/upload HTML
│
├── docs/
│   ├── architecture.md                 # System context, user flow, security perimeter
│   ├── requirements.md                 # Feature spec, legal disclaimers, priorities
│   ├── tech-design.md                  # Schema, routes, stack, deployment plan
│   └── STATUS.md                       # Product state, deployment, tasks, blockers
│
├── nginx/
│   └── nginx.conf                      # Reverse proxy: SSL termination → Node :3000
│
├── Dockerfile                          # Two-stage: TypeScript build → node:20 + nginx
├── docker-compose.yml                  # Services: app (Node+nginx) + db (PostgreSQL 16)
├── entrypoint.sh                       # Start nginx + Node, auto-detect SSL certs
├── opencode.json                       # AI config: instructions, skills paths, commands
├── AGENTS.md                           # AI behavior rules (0 manual code)
├── REPO_INDEX.md                       # THIS FILE — file index
├── .gitignore                          # node_modules, dist, .env, data/agents, ssl/
├── LICENSE                             # MIT License
└── README.md                           # Project overview
```

## Route Map

| Method | Path | Middleware | View | Purpose |
|--------|------|-----------|------|---------|
| GET | `/` | — | `index.ejs` | Homepage |
| GET | `/auth/register` | — | `auth/register.ejs` | Register form |
| POST | `/auth/register` | — | — | Send verification code |
| POST | `/auth/register/verify` | — | — | Verify code, create user |
| GET | `/auth/login` | — | `auth/login.ejs` | Login form |
| POST | `/auth/login` | — | — | Send verification code |
| POST | `/auth/login/verify` | — | — | Verify code, start session |
| POST | `/auth/logout` | — | — | Destroy session |
| GET | `/dashboard` | requireAuth | `dashboard.ejs` | User dashboard |
| GET | `/agent/new` | requireAuth | `agent/new.ejs` | Submit request form |
| POST | `/agent/new` | requireAuth | — | Create agent request |
| GET | `/agent/:slug` | requireAuth | `agent/view.ejs` | View agent page |
| GET | `/agent/:slug/share` | requireAuth | `agent/share.ejs` | Manage sharing |
| POST | `/agent/:slug/share` | requireAuth | — | Share with partner |
| POST | `/agent/:slug/unshare` | requireAuth | — | Revoke share |
| GET | `/admin/requests` | requireAuth+requireAdmin | `admin/requests.ejs` | Pending/dev/completed |
| GET | `/admin/requests/:id` | requireAuth+requireAdmin | `admin/review.ejs` | Review one request |
| POST | `/admin/requests/:id/approve` | requireAuth+requireAdmin | — | Approve → in_development |
| POST | `/admin/requests/:id/reject` | requireAuth+requireAdmin | — | Reject with reason |
| POST | `/admin/requests/:id/upload` | requireAuth+requireAdmin | — | Upload HTML, mark complete |

## Database Tables

Defined in `app/src/services/db.ts:initDB()`:

| Table | Columns | Purpose |
|-------|---------|---------|
| `users` | id (UUID PK), email (unique), role, registration_date, created_at, last_login_at | User accounts |
| `verification_codes` | id (UUID PK), email, code (6-digit), expires_at, used, created_at | Login/register codes |
| `agent_requests` | id (UUID PK), user_id (FK), name, description, status, rejection_reason, unique_slug, created_at, updated_at | Agent requests |
| `agent_shares` | id (UUID PK), agent_id (FK unique), partner_email, partner_user_id (FK), created_at | Two-person access |
| `user_sessions` | (managed by connect-pg-simple) | Express sessions |

## Environment Variables

| Var | Required | Default | Source |
|-----|----------|---------|--------|
| `DATABASE_URL` | Yes | `postgres://pier:pier@db:5432/pier` | docker-compose |
| `SESSION_SECRET` | Yes | (none) | VPS .env or GitHub secret |
| `SENDGRID_API_KEY` | No | (dev fallback) | GitHub secret |
| `ADMIN_EMAIL` | No | (none) | GitHub secret — seeds admin user on startup |
| `NODE_ENV` | No | production | docker-compose |
