# AI Development & Maintenance Rules

This project is **100% AI-maintained**. No human writes code manually.
All changes must be made by AI agents. You (the AI) are the sole developer.

## Core Principles

1. **0 Manual Code** — Never ask the human to write code. You write everything.
2. **Document First** — Before coding, check REPO_INDEX.md and existing docs.
3. **Keep Index Updated** — After adding/removing/renaming files, update REPO_INDEX.md.
4. **Manual Steps** — If a step truly requires human action (e.g. VPS SSH key setup, SendGrid API key creation, domain DNS config), say: `[MANUAL] <exact step>` at the start of your response. Then provide the command/instruction the human should run.
5. **Skills** — When you see a recurring task pattern (deploy, review, DB migration), ask: "Should I create a skill for this?" and create `.opencode/skills/<name>/SKILL.md`.
6. **Console Output** — If any command fails, show the error and fix it. Never ask the human to debug.

## Development Workflow

1. Read opencode.json + AGENTS.md + REPO_INDEX.md first.
2. Understand the full context before writing code.
3. Use existing patterns (same imports, same error handling, same styling).
4. Always verify: TypeScript compiles (via Docker build since no local node).
5. Commit with clear messages. Push to trigger deploy.

## Auto Task Worker

Use `.\scripts\poll-tasks.ps1 -Continuous` to continuously poll for pending/rejected tasks on both test and prod. When work is found, load the `auto-task-worker` skill to process tasks. The GitHub Actions `task-monitor` workflow also checks every 30 min and reports in the Actions tab.

## When Making Changes

- **New routes**: Use `/add-routes` command pattern. Register in server.ts.
- **New models**: Add SQL to `initDB()` in `db.ts`. Create model file.
- **New views**: Follow `layout.ejs` pattern. Include disclaimers where needed.
- **Docker**: After changing Dockerfile/docker-compose, note that image rebuild is needed.
- **Deploy**: After push, monitor via CI monitor skill. Wait for build, check status, verify website.

## Manual Steps Reference

These are the ONLY things the human must do themselves:

| Step | When | Command |
|------|------|---------|
| Set up VPS | First time only | `ssh root@<VPS_IP>` then install Docker |
| DNS config | First time only | Point ailaopo.online A record to VPS IP |
| DNS for test domain | First time only | Point test.ailaopo.online A record to VPS IP |
| SendGrid API key | Register + paste key | Create at sendgrid.com, set as GitHub secret |
| VPS SSH key | Add deploy key | Add SSH_PRIVATE_KEY to GitHub secrets |
| Let's Encrypt cert | First time or renewal | `certbot --nginx -d ailaopo.online -d test.ailaopo.online` on VPS |
| GitHub secrets | Before first deploy | Set SESSION_SECRET, ADMIN_EMAIL, DOCKER_USERNAME, DOCKER_PASSWORD, VPS_HOST, VPS_USER, SSH_PRIVATE_KEY |
| Quit/restart opencode | After config change | Close terminal, reopen opencode |

## Status Tracking

`docs/STATUS.md` tracks product state, deployment status, tasks, blockers, and env vars. **Update it on every change** that affects:
- Product state (new features, completed components)
- Deployment (version deployed, domain changes)
- Task progress (started, completed, blocked)
- Known issues (new blockers, resolved issues)
- Environment variables (added, changed, removed)

## Repo Index Maintenance

`REPO_INDEX.md` is the single source of truth for file locations. Update it whenever:
- A file is added or removed
- A route or endpoint changes
- The directory structure changes
