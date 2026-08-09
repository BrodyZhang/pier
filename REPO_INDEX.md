# Pier — Repository Index

> **AI-maintained project.** Update this file whenever files are added/removed/renamed.

## Directory Structure

```
pier/
├── .github/
│   └── workflows/
│       ├── deploy-test.yml             # Build app → push → SSH → test deploy
│       ├── deploy-prod.yml             # Promote prod by version tag
│       ├── build-router.yml            # Build router image
│       └── task-monitor.yml            # Scheduled check for pending tasks
│
├── .opencode/
│   └── skills/
│       ├── auto-task-worker/SKILL.md   # Skill: continuous task polling
│       ├── repo-index/SKILL.md         # Skill: maintain REPO_INDEX.md
│       ├── deploy/SKILL.md             # Skill: deployment architecture
│       ├── ci-monitor/SKILL.md         # Skill: monitor CI/CD
│       ├── code-style/SKILL.md         # Skill: code conventions
│       └── agent-dev/SKILL.md          # Skill: AI agent development
│
├── app/                                # Node.js + TypeScript application
│   ├── games/
│   │   └── spaceshooter.html           # 飞机大战 - HTML5 Canvas game
│   ├── package.json                    # Dependencies
│   ├── tsconfig.json                   # TypeScript config
│   ├── jest.config.ts                  # Jest testing config
│   ├── .node-pg-migraterc.json         # Database migration config
│   ├── migrations/
│   │   └── 001_initial_schema.ts       # Initial DB schema migration
│   ├── public/
│   │   ├── css/
│   │   │   └── chat.css                # Chat widget styles
│   │   └── js/
│   │       └── chat.js                 # Chat widget client-side logic
│   ├── src/
│   │   ├── server.ts                   # Entry point: Express, session, EJS
│   │   ├── config/
│   │   │   └── index.ts                # Centralized env config
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript interfaces & DTOs
│   │   ├── errors/
│   │   │   └── app-error.ts            # Custom error classes
│   │   ├── middleware/
│   │   │   ├── auth.ts                 # requireAuth, requireAdmin, requireDevApiKey
│   │   │   ├── error-handler.ts        # Global error handler
│   │   │   └── rate-limit.ts           # Rate limiting middleware
│   │   ├── routes/
│   │   │   ├── auth.ts                 # Register/login with email + code
│   │   │   ├── dashboard.ts            # GET /dashboard
│   │   │   ├── agent.ts                # Create, view, share/unshare agent
│   │   │   ├── admin.ts                # Admin: approve/reject/upload
│   │   │   ├── profile.ts              # User profile management
│   │   │   ├── dev.ts                  # Dev API (DEV_API_KEY)
│   │   │   ├── html-preview.ts         # HTML 在线预览 (/html)
│   │   │   └── markdown-preview.ts     # Markdown 在线预览 (/md)
│   │   ├── services/
│   │   │   ├── db.ts                   # pg Pool + schema init
│   │   │   ├── mail.ts                 # Email: Resend API or SMTP
│   │   │   ├── agent.service.ts        # Agent business logic
│   │   │   ├── auth.service.ts         # Auth business logic
│   │   │   ├── user.service.ts         # User business logic
│   │   │   ├── html-preview.service.ts # HTML preview business logic
│   │   │   ├── markdown-preview.service.ts  # Markdown preview business logic
│   │   │   ├── settings.service.ts     # App settings (admin controllable)
│   │   │   ├── usage.service.ts        # Daily usage / storage counters
│   │   │   └── preview-access.service.ts   # Preview limit/cap guard + admin alert
│   │   ├── repositories/
│   │   │   ├── agent.repository.ts     # Agent DB queries
│   │   │   ├── user.repository.ts      # User DB queries
│   │   │   ├── html-preview.repository.ts  # HTML preview DB queries
│   │   │   └── markdown-preview.repository.ts  # Markdown preview DB queries
│   │   ├── validators/
│   │   │   ├── agent.validator.ts      # Agent Zod schemas
│   │   │   ├── auth.validator.ts       # Auth Zod schemas
│   │   │   ├── html-preview.validator.ts  # HTML preview Zod schemas
│   │   │   └── markdown-preview.validator.ts  # Markdown preview Zod schemas
│   │   ├── utils/
│   │   │   ├── html.ts                 # HTML decode/escape utilities
│   │   │   ├── preview-nav.ts          # Preview nav bar (home/copy/print)
│   │   │   ├── logger.ts               # Pino structured logging
│   │   │   └── validation.ts           # Email/UUID/code validators
│   │   ├── ws/
│   │   │   └── chat.ts                 # WebSocket chat server
│   │   └── __tests__/
│   │       ├── html.test.ts            # HTML utils tests
│   │       ├── validation.test.ts      # Validation utils tests
│   │       ├── html-preview.test.ts    # HTML preview validator tests
│   │       └── markdown-preview.test.ts    # Markdown validator + render tests
│   └── views/
│       ├── layout.ejs                  # Shared shell
│       ├── index.ejs                   # Homepage
│       ├── dashboard.ejs               # User dashboard
│       ├── profile.ejs                 # User profile
│       ├── auth/
│       │   ├── login.ejs
│       │   └── register.ejs
│       ├── agent/
│       │   ├── new.ejs
│       │   ├── view.ejs
│       │   ├── share.ejs
│       │   ├── not-ready.ejs
│       │   ├── public.ejs
│       │   ├── request-version.ejs
│       │   └── 404.ejs
│       ├── html/
│       │   └── index.ejs               # HTML 粘贴 + 预览生成页
│       ├── md/
│       │   └── index.ejs               # Markdown 粘贴 + 预览生成页
│       └── admin/
│           ├── requests.ejs
│           ├── review.ejs
│           ├── html-previews.ejs       # 管理所有 HTML 预览（查看/删除）
│           ├── markdown-previews.ejs   # 管理所有 Markdown 预览（查看/删除）
│           └── preview-settings.ejs    # 预览功能设置（清理/限额/存储上限）
│
├── docs/
│   ├── architecture.md
│   ├── deployment-architecture.md
│   ├── requirements.md
│   ├── tech-design.md
│   └── STATUS.md
│
├── nginx/
│   └── router.conf                     # nginx reverse proxy config
│
├── scripts/
│   └── poll-tasks.ps1                  # Task polling script
│
├── Dockerfile                          # Two-stage Node.js build
├── Dockerfile.router                   # nginx router image
├── docker-compose.yml                  # Services: router, app-test, app-prod, db
├── .dockerignore                       # Docker build exclusions
├── .env.example                        # Environment variables template
├── .gitignore
├── AGENTS.md                           # AI behavior rules
├── REFACTORING_TASKS.md                # Refactoring task tracker
├── REPO_INDEX.md                       # THIS FILE
├── PROD_VERSION                        # Current prod version
├── TEST_VERSION                        # Current test version
├── LICENSE
└── README.md
```

## Architecture Layers

```
Route → Validator (zod) → Service → Repository → Database
                ↓
           Error Handler
```

## Route Map

| Method | Path | Middleware | Purpose |
|--------|------|-----------|---------|
| GET | `/` | — | Homepage |
| GET | `/health` | — | Health check |
| GET | `/auth/register` | — | Register form |
| POST | `/auth/register` | rate-limit | Send code |
| POST | `/auth/register/verify` | rate-limit | Verify & create user |
| GET | `/auth/login` | — | Login form |
| POST | `/auth/login` | rate-limit | Send code |
| POST | `/auth/login/verify` | rate-limit | Verify & login |
| POST | `/auth/logout` | — | Destroy session |
| GET | `/dashboard` | requireAuth | User dashboard |
| GET | `/profile` | requireAuth | User profile |
| POST | `/profile` | requireAuth | Update name |
| GET | `/agent/new` | requireAuth | Create form |
| POST | `/agent/new` | requireAuth | Create agent |
| GET | `/agent/:slug` | requireAuth | View agent |
| GET | `/agent/:slug/share` | requireAuth | Share form |
| POST | `/agent/:slug/share` | requireAuth | Share agent |
| POST | `/agent/:slug/unshare` | requireAuth | Unshare agent |
| GET | `/p/:slug` | — | Public view |
| GET | `/g/:slug` | — | Serve game HTML |
| GET | `/admin/requests` | auth+admin | Admin queue |
| GET | `/admin/requests/:id` | auth+admin | Review agent |
| POST | `/admin/requests/:id/approve` | auth+admin | Approve |
| POST | `/admin/requests/:id/reject` | auth+admin | Reject |
| POST | `/admin/requests/:id/upload` | auth+admin | Upload HTML |
| POST | `/admin/requests/:id/delete` | auth+admin | Delete |
| GET | `/admin/html-previews` | auth+admin | HTML 预览列表 |
| POST | `/admin/html-previews/:id/delete` | auth+admin | 删除 HTML 预览 |
| GET | `/admin/markdown-previews` | auth+admin | Markdown 预览列表 |
| POST | `/admin/markdown-previews/:id/delete` | auth+admin | 删除 Markdown 预览 |
| GET | `/admin/preview-settings` | auth+admin | 预览功能设置（清理/限额/存储上限） |
| POST | `/admin/preview-settings` | auth+admin | 保存预览功能设置 |
| GET | `/api/v1/dev/agents` | devApiKey | List agents |
| GET | `/api/v1/dev/pending` | devApiKey | Pending counts |
| POST | `/api/v1/dev/create` | devApiKey | Create agent |
| POST | `/api/v1/dev/upload/:id` | devApiKey | Upload HTML |
| POST | `/api/v1/dev/approve/:id` | devApiKey | Approve |
| POST | `/api/v1/dev/delete/:id` | devApiKey | Delete |
| GET | `/html` | — | HTML 粘贴预览表单 |
| POST | `/html` | rate-limit | 生成 HTML 预览 |
| GET | `/html/p/:id` | — | 纯净预览页（原样展示，无 CSP，支持 CDN 外部库） |
| GET | `/md` | — | Markdown 粘贴预览表单 |
| POST | `/md` | rate-limit | 生成 Markdown 预览 |
| GET | `/md/p/:id` | — | Markdown 渲染预览页（marked，支持 MathJax） |

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `verification_codes` | Login/register codes |
| `agent_requests` | Agent requests with versioning |
| `agent_versions` | Version history |
| `agent_files` | Agent HTML content (base64) |
| `agent_shares` | Two-person access |
| `user_sessions` | Express sessions |
| `html_previews` | HTML 在线预览内容（base64） |
| `markdown_previews` | Markdown 在线预览内容（base64） |
| `settings` | 键值对应用设置（管理员可配置） |
| `preview_usage` | 预览每日使用计数（按 IP+日期） |

## Environment Variables

| Var | Required | Default |
|-----|----------|---------|
| `DATABASE_URL` | Yes | `postgres://pier:pier@db:5432/pier` |
| `SESSION_SECRET` | Yes | `dev-secret` |
| `SMTP_HOST` | No | — |
| `SMTP_PORT` | No | `465` |
| `SMTP_USER` | No | — |
| `SMTP_PASS` | No | — |
| `SMTP_FROM` | No | `noreply@ailaopo.online` |
| `ADMIN_EMAIL` | No | — |
| `ADMIN_EMAIL_BUILTIN` | No | — |
| `CONTACT_EMAIL` | No | — |
| `DEV_API_KEY` | Yes (for AI) | — |
| `APP_ENV` | No | `prod` |
| `NODE_ENV` | No | `production` |
| `HTML_PREVIEW_TTL_DAYS` | No | `7` |
