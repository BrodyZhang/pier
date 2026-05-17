# Project Status

> **AI-maintained.** Update this file whenever product state, deployment, tasks, or blockers change.

---

## Product State

| Aspect | Status | Details |
|--------|--------|---------|
| Backend (TypeScript) | ✅ Complete | Express + routes (auth, dashboard, agent, admin) + services (db, mail) |
| Views (EJS) | ✅ Complete | 12 templates: layout, index, auth, dashboard, agent, admin |
| Database Schema | ✅ Complete | 5 tables: users, verification_codes, agent_requests, agent_versions, agent_shares |
| Docker Infrastructure | ✅ Complete | Dockerfile (pure Node), Dockerfile.router (nginx), docker-compose.yml (4 services) |
| CI/CD Pipeline | ✅ Complete | GitHub Actions: build → push → SSH → build router → pull app → up |
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
| **Status** | ✅ Deployed (build #41, image tag 20260517-00000041) |
| Last Deploy | 2026-05-17 04:09 UTC |

## Development Tasks

### Completed
- [x] Project structure & docs (architecture, requirements, tech-design, deployment-architecture)
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
- [x] Deployment architecture doc: docs/deployment-architecture.md

### Next (Priority Order)
1. ✅ ~~DNS configured for test.ailaopo.online~~ (done)
2. ✅ ~~Container debug: cp crash loop fix~~ (done)
3. ✅ ~~Image pull fix: use pre-built image from Docker Hub~~ (done)
4. ✅ ~~DB connection fix: DATABASE_URL not used by db.ts~~ (done)
5. 🔲 Test: register/login flow on test.ailaopo.online
6. 🔲 Test: admin approve/reject/upload flow
7. 🔲 Test: agent page view & share flow
8. 🔲 Optional: SSL for test.ailaopo.online via certbot
9. 🔲 Optional: SendGrid integration for email verification

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
