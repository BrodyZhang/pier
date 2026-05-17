# Project Status

> **AI-maintained.** Update this file whenever product state, deployment, tasks, or blockers change.

---

## Product State

| Aspect | Status | Details |
|--------|--------|---------|
| Backend (TypeScript) | ✅ Complete | Express + routes (auth, dashboard, agent, admin) + services (db, mail) |
| Views (EJS) | ✅ Complete | 12 templates: layout, index, auth, dashboard, agent, admin |
| Database Schema | ✅ Complete | 5 tables: users, verification_codes, agent_requests, agent_versions, agent_shares |
| Docker Infrastructure | ✅ Complete | Dockerfile (two-stage), docker-compose.yml, nginx config, entrypoint.sh |
| CI/CD Pipeline | ✅ Complete | GitHub Actions: build → push → SSH → docker compose up |
| AI Config | ✅ Complete | opencode.json, AGENTS.md, REPO_INDEX.md, 3 skills |
| Admin Seed | ✅ Complete | ADMIN_EMAIL env var auto-creates admin on startup |
| Test Domain | ✅ Complete | nginx has separate HTTP-only server block for test.ailaopo.online |

## Deployment

| Item | Value |
|------|-------|
| Production Domain | `ailaopo.online` (SSL: Let's Encrypt) |
| Test Domain | `test.ailaopo.online` (HTTP only, no SSL) |
| VPS | Azure Ubuntu 24.04 |
| Method | docker compose (app + PostgreSQL 16) |
| Image | `brodyzhang2026/pier` (Docker Hub) |
| **Status** | ⏳ Partially deployed — containers created, app port 80 conflict (old container not stopped) |

## Development Tasks

### Completed
- [x] Project structure & docs (architecture, requirements, tech-design)
- [x] Backend: server.ts, types, middleware, all routes, all services
- [x] Views: all 12 EJS templates
- [x] Docker: two-stage build, compose with postgres, nginx reverse proxy
- [x] CI/CD: GitHub Actions workflow with auto-deploy
- [x] AI config: opencode.json, AGENTS.md, REPO_INDEX.md, skills
- [x] Bug fixes: admin route/view mismatch, upload middleware, layout engine, view locals
- [x] Admin seed: ADMIN_EMAIL env var
- [x] Test domain: test.ailaopo.online HTTP support
- [x] Status tracking: docs/STATUS.md created
- [x] CI monitor skill: .opencode/skills/ci-monitor/SKILL.md

### In Progress
- [ ] 🔄 Build #41 — fix port conflict, verify deploy

### Next (Priority Order)
1. ✅ ~~Push code to GitHub~~ (done)
2. 🔲 Manual: VPS SSH public key setup (instructions below)
3. 🔲 Manual: Set GitHub secrets
4. 🔲 GitHub Actions: first build & deploy
5. 🔲 Test: access test.ailaopo.online, register/login flow
6. 🔲 Fix: TypeScript compilation errors (if any, from Docker build log)
7. 🔲 Test: admin approve/reject/upload flow
8. 🔲 Test: agent page view & share flow
9. 🔲 Optional: SSL for test.ailaopo.online via certbot

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
| 1 | TypeScript compilation | ✅ Passed in build #40 |
| 2 | Docker image build & push | ✅ Passed in build #40 |
| 3 | Deploy step — port 80 conflict (old container) | 🔴 Fix: added stop/rm old containers in deploy.yml |
| 4 | test.ailaopo.online DNS not configured | 🔴 Blocking test access |

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
