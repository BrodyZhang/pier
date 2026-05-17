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
| Agent Storage | ✅ Complete | Date-based subdirs: `/app/data/agents/YYYY-MM-DD/{slug}/index.html` |

## Deployment

| Item | Value |
|------|-------|
| Production Domain | `ailaopo.online` (HTTPS, Let's Encrypt) |
| Test Domain | `test.ailaopo.online` (HTTPS, Let's Encrypt) |
| VPS | Azure Ubuntu 24.04 |
| Method | docker compose (4 services: router, app-test, app-prod, db) |
| Image | `brodyzhang2026/pier` (Docker Hub) |
| **Status** | ✅ Deployed (build #51, date-based agent storage) |
| Last Deploy | 2026-05-17 13:21 UTC |

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

### Next (Priority Order)
1. ✅ ~~Register/login flow~~ (tested on test.ailaopo.online)
2. ✅ ~~Admin approve/reject/upload flow~~ (tested)
3. ✅ ~~Agent page view & share flow~~ (tested)
4. ✅ ~~SSL for test.ailaopo.online~~ (certbot done)
5. 🔲 SendGrid integration for email verification (production)

### Future (Backlog)
- [ ] Email notifications (SendGrid integration)
- [ ] Version history / edit requests
- [ ] Admin-user messaging
- [ ] Rate limiting on auth endpoints
- [ ] Database migration strategy
- [ ] Backup strategy

## Known Issues / Blockers

| # | Issue | Status |
|---|-------|--------|
| 1 | None currently | ✅ All resolved |

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
| `SENDGRID_API_KEY` | ❌ (optional) | GitHub secret |

**Format note:** Docker Hub password/token is passed via stdin in the SSH script (line in deploy.yml). Consider using a read-only token for pull-only operations to minimize risk.
