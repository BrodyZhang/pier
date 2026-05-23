# Project Status

> **AI-maintained.** Update this file whenever product state, deployment, tasks, or blockers change.

---

## Product State

| Aspect | Status | Details |
|--------|--------|---------|
| Backend (TypeScript) | ✅ Complete | Express + routes (auth, dashboard, agent, admin) + services (db, mail) |
| Views (EJS) | ✅ Complete | 12 templates: layout, index, auth, dashboard, agent, admin |
| Database Schema | ✅ Complete | 6 tables: users, verification_codes, agent_requests, agent_versions, agent_shares, user_sessions |
| Docker Infrastructure | ✅ Complete | Dockerfile (pure Node), Dockerfile.router (nginx), docker-compose.yml (4 services) |
| CI/CD Pipeline | ✅ Complete | GitHub Actions: build → push → SSH → build router → pull app-test → up (never touches prod) |
| AI Config | ✅ Complete | opencode.json, AGENTS.md, REPO_INDEX.md, 3 skills |
| Admin Seed | ✅ Complete | ADMIN_EMAIL env var auto-creates admin on startup |
| Test Domain | ✅ Complete | HTTPS (Let's Encrypt), proxies to app-test |
| Session | ✅ Fixed | trust proxy + secure: 'auto' for cookie behind nginx |
| Agent Storage | ✅ Complete | PostgreSQL `agent_files` table (DB storage, no filesystem) |
| Built-in Admin | ✅ Complete | `296068994@qq.com` hard-coded in `ensureAdmin()` |
| Dev Review Flow | ✅ Complete | AI upload → `dev_review` → admin approve/reject with comments |
| AI Dev API | ✅ Complete | `GET /api/dev/agents`, `GET /api/dev/pending`, `GET /api/dev/rejected`, `POST /api/dev/create` (direct agent creation), `POST /api/dev/upload/:id`, `POST /api/dev/approve/:id` (approve dev_review → completed) |
| Email (Resend) | ✅ Complete | Resend HTTPS API (port 443, no SMTP), auto-detected from `smtp.resend.com` host, fallback to console.log |

## Deployment

| Item | Value |
|------|-------|
| Production Domain | `ailaopo.online` (HTTPS, Let's Encrypt) |
| Test Domain | `test.ailaopo.online` (HTTPS, Let's Encrypt) |
| VPS | Azure Ubuntu 24.04 |
| Method | docker compose (4 services: router, app-test, app-prod, db) |
| Image | `brodyzhang2026/pier` (Docker Hub) |
| **Status** | ✅ Deployed (test: build #153, prod: build #153) |
| Last Deploy | 2026-05-23 (build #153) |
| Prod Version File | `PROD_VERSION` — push changes to auto-promote via deploy-prod.yml |

## Development Tasks

### Completed
- [x] Project structure & docs (architecture, requirements, tech-design, deployment-architecture)
- [x] Backend: server.ts, types, middleware, all routes, all services
- [x] Views: all 12 EJS templates (Chinese localization)
- [x] Docker: two-stage build, compose with postgres, nginx reverse proxy
- [x] CI/CD: GitHub Actions workflow with auto-deploy (test-first, never touches prod)
- [x] AI config: opencode.json, AGENTS.md, REPO_INDEX.md, skills
- [x] Bug fixes: admin route/view mismatch, upload middleware, layout engine, view locals
- [x] Admin seed: ADMIN_EMAIL env var
- [x] Test domain: test.ailaopo.online HTTP support
- [x] Status tracking: docs/STATUS.md created
- [x] CI monitor skill: .opencode/skills/ci-monitor/SKILL.md
- [x] Deployment architecture doc: docs/deployment-architecture.md
- [x] DB separation: pier_test + pier_prod, auto-created by initDB()
- [x] Test-first deploy: push only updates app-test, prod stays untouched
- [x] Session fix: user_sessions table + trust proxy + secure: 'auto'
- [x] SSL for test domain: certbot --standalone -d test.ailaopo.online
- [x] Agent HTML storage: date-based subdirs (YYYY-MM-DD/{slug}/index.html)
- [x] Full flow test: register → login → create agent → admin approve → upload → view → share
- [x] Admin delete agents
- [x] Agent HTML stored in PostgreSQL (agent_files table)
- [x] Dev API secured with DEV_API_KEY Bearer token
- [x] Review workflow: review_notes (admin→AI) + review_comments (admin→AI on reject)
- [x] POST /api/dev/upload/:id for AI HTML upload
- [x] Email via Resend HTTPS API (port 443, no SMTP), fallback to console.log
- [x] Resend domain verification + DKIM
- [x] Promote to production: build #66 (v20260517-00000066) pinned via PROD_VERSION
- [x] Agent "小飞龙" dragão game: HTML5 Canvas mobile game, uploaded to prod
- [x] Dashboard dev_review bug: fixed showing "已拒绝" → "开发中" (build #67)
- [x] Agent "小飞龙" UX v2: 20 flowers (up from 12), 4 butterflies (+2pts), 3 bees (+3pts)
- [x] Auto task worker skill: .opencode/skills/auto-task-worker/SKILL.md
- [x] Polling script: scripts/poll-tasks.ps1 (single check or -Continuous loop)
- [x] Task monitor workflow: .github/workflows/task-monitor.yml (scheduled every 30min)
- [x] Admin backend UI redesign: dark glass-morphism theme across all views (layout, admin, dashboard, auth, agent)
- [x] Auto prod promote: PROD_VERSION file + deploy-prod.yml workflow (push file to promote)
- [x] Dragon game v4: fix flickering, more bees, dragon grows, 100pt victory
- [x] Consistent v prefix for version tags (deploy.yml + PROD_VERSION + deploy-prod.yml)
- [x] Review history log (JSONB review_log column, full audit trail on admin review page)
- [x] User self-delete agents (delete button on dashboard for own agents)
- [x] Improved admin requests UI: one-layer tabs with inline actions
- [x] Character limits: name 50, description 500, review notes/comments 200
- [x] Registration daily limit: 100 → 20
- [x] Light theme: soft pink gradient background, white cards, pink accents
- [x] Floating heart bubbles: 35 animated hearts in layout.ejs
- [x] User email in nav header (from session)
- [x] Homepage "开始创建" redirects to /agent/new if logged in
- [x] Sync middleware fix: store userEmail in session instead of DB query
- [x] Homepage rich content: emoji steps (📝🎨💝), 为什么选择我们, CTA section
- [x] Light theme text colors: rgba→#hex for homepage visibility
- [x] COALESCE null fix: review_log wrapped in all 5 SQL queries
- [x] deploy.yml SSH error handling: `|| echo "WARN"` + set -x
- [x] Mobile responsive: @media 640px breakpoint, table→card stacking, data-label attributes
- [x] Dev API endpoints: POST /api/dev/create, POST /api/dev/approve/:id
- [x] Spaceshooter game: 飞机大战 HTML5 Canvas game deployed to prod
- [x] Delete fix: use agent id instead of slug for delete action
- [x] Spaceshooter freeze fix: level transition guard, stale wave guard, keyboard focus
- [x] Delete fix: use agent id instead of slug for delete action
- [x] Dev API: POST /api/dev/delete/:id for agent cleanup
- [x] Game Chinese text fix: use ReadAllText UTF-8 instead of Get-Content ANSI
- [x] Created new 飞机 agent on prod with correct name and fixed game
- [x] Fix approve 500: build review_log JSON in app code instead of SQL to avoid PG type inference error (build #146)
- [x] Git reset origin/master: deploy.yml uses fetch + reset to handle divergent branches on VPS (build #153)
- [x] YAML multi-line secret fix: pass SSH_PRIVATE_KEY via `env:` to avoid YAML block scalar parsing failure
- [x] Prod promote to build #153 (v20260523-00000153)

### Next (Priority Order)
1. ✅ ~~Register/login flow~~ (tested on test.ailaopo.online)
2. ✅ ~~Admin approve/reject/upload flow~~ (tested)
3. ✅ ~~Agent page view & share flow~~ (tested)
4. ✅ ~~SSL for test.ailaopo.online~~ (certbot done)
5. ✅ ~~Email verification~~ (Resend HTTPS API, working)
6. ✅ ~~Promote to production~~ (build #66 on ailaopo.online)

### Future (Backlog)
- [ ] Rate limiting on auth endpoints
- [ ] Database migration strategy
- [ ] Backup strategy
- [ ] Auto-reply to rejected tasks (webhook/action to auto-fix + re-upload)
- [ ] Windows Scheduled Task for polling script (runs outside opencode session)
- [ ] Public access for completed agents (no login required to view)
- [ ] Admin dashboard with user management
- [ ] Game showcase page

## Known Issues / Blockers

| # | Issue | Status |
|---|-------|--------|
| 1 | ~~**PROD 502 Bad Gateway** — async middleware with DB query caused container crash. Fixed in build #81.~~ | ✅ Resolved |
| 2 | ~~**Test deploy SSH fails (#132-#139)** — `docker compose up -d router app-test db` triggered `depends_on: app-prod`, which tried to resolve `${PROD_VERSION:-latest}` tag that didn't exist on Docker Hub. Fixed in build #140 by using `--no-deps`.~~ | ✅ Resolved |
| 3 | ~~**Approve endpoint 500** — caused by PG type inference on null $2 inside jsonb_build_object. Fixed by building JSON in app code.~~ | ✅ Resolved |
| 4 | **deploy-prod verify step timeout** — `sleep 10` not enough after app-prod restart; container starts a few seconds after check. Prod actually deployed successfully. | Verify step 7 failed but deploy worked |

## Environment Variables

| Var | Set? | Where |
|-----|------|-------|
| `DOCKER_USERNAME` | ✅ | GitHub secret |
| `DOCKER_PASSWORD` | ✅ | GitHub secret |
| `VPS_HOST` | ✅ | GitHub secret |
| `VPS_USER` | ✅ | GitHub secret |
| `SSH_PRIVATE_KEY` | ✅ | GitHub secret |
| `SESSION_SECRET` | ✅ | GitHub secret + VPS `.env` |
| `ADMIN_EMAIL` | ✅ | GitHub secret + VPS `.env` |
| `SMTP_HOST` | ✅ | GitHub secret — `smtp.resend.com` |
| `SMTP_PORT` | ✅ | `465` (ignored, Resend uses HTTPS API) |
| `SMTP_USER` | ✅ | GitHub secret — `resend` |
| `SMTP_PASS` | ✅ | GitHub secret — Resend API key |
| `SMTP_FROM` | ✅ | GitHub secret — `noreply@ailaopo.online` |
| `DEV_API_KEY` | ✅ | GitHub secret — Bearer token for AI dev API |
| `PROD_VERSION` | ✅ | File in repo — `v20260523-00000153` (with `v` prefix) |

**Format note:** Docker Hub password/token is passed via stdin in the SSH script (line in deploy.yml). Consider using a read-only token for pull-only operations to minimize risk.
