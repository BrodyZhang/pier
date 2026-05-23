# AI Development & Maintenance Rules

This project is **100% AI-maintained**. No human writes code manually.
All changes must be made by AI agents. You (the AI) are the sole developer.

## Mandatory Workflow

**Every task MUST follow this exact sequence:**

1. **Read & understand** — Read relevant files, check docs, understand the context
2. **Plan** — Lay out the implementation steps before writing any code
3. **Execute** — Implement changes, verify each step
4. **Summarize** — After completion, give a concise summary of what was done

Never skip the planning step. Never start coding without first explaining the plan.

## Core Principles

1. **0 Manual Code** — Never ask the human to write code. You write everything.
2. **Document First** — Before coding, check REPO_INDEX.md, existing docs, and the deploy skill.
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

## ⚠️ CRITICAL: Deployment Rules (Test-First, Human-Confirm)

**Violating these rules caused prod outages. They MUST be followed EVERY time.**

### The Mandatory Flow

```
Code Change → Push → Auto-deploy test → Verify on test.ailaopo.online → Human says "OK" → Promote to prod
```

### Step-by-Step

1. **Make code changes → commit → push** (auto-triggers `deploy-test.yml`)
2. **Wait for deploy-test.yml to complete** (build + deploy to test)
3. **Verify test**: `curl.exe -sI https://test.ailaopo.online/` returns 200, content is correct
4. **Ask human**: "Test is ready at test.ailaopo.online. Deploy to prod?" — WAIT for explicit "OK"
5. **Update PROD_VERSION** in a SEPARATE commit, push
6. **Verify prod**: `curl.exe -sI https://ailaopo.online/` returns 200

### Absolute Prohibitions

- ❌ **NEVER deploy prod without test verification**
- ❌ **NEVER deploy prod without human confirmation**
- ❌ **NEVER update PROD_VERSION in the same commit as code changes**
- ❌ **NEVER let test be older than prod** — if test is behind, fix deploy-test.yml first
- ❌ **NEVER use deploy-prod.yml as a workaround for deploy-test.yml failures**

### deploy-test.yml (Test Deploy) Fails Often

If the SSH deploy step fails but build-and-push succeeded:
- The image IS on Docker Hub (build succeeded)
- Fix the script, commit, push again
- DO NOT promote to prod as a workaround
- DO NOT manually SSH into VPS to deploy

If the SSH deploy step fails but build-and-push succeeded:
- The image IS on Docker Hub (build succeeded)
- Fix the script, commit, push again
- DO NOT promote to prod as a workaround
- DO NOT manually SSH into VPS to deploy

## Auto Task Worker

Use `.\scripts\poll-tasks.ps1 -Continuous` to continuously poll for pending/rejected tasks on both test and prod. When work is found, load the `auto-task-worker` skill to process tasks. The GitHub Actions `task-monitor` workflow also checks every 30 min and reports in the Actions tab.

## When Making Changes

- **New routes**: Use `/add-routes` command pattern. Register in server.ts.
- **New models**: Add SQL to `initDB()` in `db.ts`. Create model file.
- **New views**: Follow `layout.ejs` pattern. Include disclaimers where needed.
- **Docker**: After changing Dockerfile/docker-compose, note that image rebuild is needed.
- **Deploy (test)**: After push, monitor via CI monitor skill. Wait for build, check status, verify website.
- **Deploy (prod)**: Only after test verification + human OK. Update `PROD_VERSION` file in a SEPARATE commit. `deploy-prod.yml` handles the rest.

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
