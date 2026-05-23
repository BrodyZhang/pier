# Deploy Skill — Architecture & Workflows

## Overview

Three GitHub Actions workflows handle deployment:

| Workflow | Trigger | Deploys To |
|----------|---------|------------|
| `Deploy: Test` | Code push to `app/`, `nginx/`, Dockerfile, docker-compose.yml, deploy-test.yml | test.ailaopo.online |
| `Deploy: Prod` | Push to `PROD_VERSION` file | ailaopo.online |
| `Build: Router` | Push to `nginx/` or `Dockerfile.router` | Docker Hub (router image) |

## Version Tracking

Two files in the git repo track deployed versions:

| File | Purpose | Updated By |
|------|---------|------------|
| `TEST_VERSION` | Current test image tag | CI (auto) — deploy-test.yml writes, commits, pushes |
| `PROD_VERSION` | Current prod image tag | Human (manual) — push to promote |

**Never use `:latest` as a fallback.** Both environments always use a specific version tag.

Format: `vYYYYMMDD-NNNNNNNN` (e.g. `v20260523-00000004`)

## Image Tags

Every build is pushed with two tags:
- `brodyzhang2026/pier:vYYYYMMDD-NNNNNNNN` (specific)
- `brodyzhang2026/pier:latest` (convenience, never used by CI for deployment)

## Flow: Test Deploy

```
Code Change → Build Image → Write TEST_VERSION (git commit+push) → SSH: git pull → read TEST_VERSION → docker compose pull/up
```

### Step-by-step

1. **Make code changes** → commit → push to master
2. **CI runs** `Deploy: Test`:
   - Builds and pushes image to Docker Hub
   - Writes version to `TEST_VERSION` file
   - `git add` / `git commit` / `git push` TEST_VERSION
   - SSHes to VPS:
     - `git fetch origin && git reset --hard origin/master`
     - `export TEST_VERSION="$(cat ~/pier/TEST_VERSION)"`
     - `docker compose pull app-test`
     - `docker compose up -d app-test --no-deps`
     - `docker compose up -d router --no-deps`
3. **Verify**: `curl.exe -sI https://test.ailaopo.online/` → 200 OK
4. **Report**: summarize what changed

## Flow: Prod Deploy

```
Update PROD_VERSION → git commit+push → CI: SSH → read PROD_VERSION → docker compose pull/up
```

### Step-by-step

1. **Update** `PROD_VERSION` file with the target version tag
2. **git commit + push** (separate commit from code changes)
3. **CI runs** `Deploy: Prod`:
   - Reads `PROD_VERSION` via `cat PROD_VERSION`
   - SSHes to VPS:
     - Writes `PROD_VERSION=<ver>` to `.env`
     - `docker compose pull app-prod`
     - `docker compose down app-prod`
     - `docker compose up -d app-prod`
     - Health check loop (up to 30s)
4. **Verify**: `curl.exe -sI https://ailaopo.online/` → 200 OK

## VPS Configuration

- `~/pier/` = git clone of the repo
- `.env` = secrets only (SESSION_SECRET, SMTP_*, ADMIN_EMAIL, DEV_API_KEY) — no version info
- `TEST_VERSION` = read from repo file at deploy time
- `PROD_VERSION` = written to `.env` by deploy-prod.yml
- `docker compose` on VPS always runs with `--no-deps` to avoid restarting unrelated services

## CI Failure Recovery

### SSH deploy step fails (build succeeded)

The image IS on Docker Hub. Fix the SSH script → commit → push again → new build triggers.

DO NOT manually run deploy-prod or manually SSH to work around a deploy-test failure.

### Build step fails

Fix the compilation/TypeScript error → commit → push again.

## Known Root Causes

### `docker compose up` fails with "image not found" for PROD_VERSION tag

**Root cause:** `docker compose up -d router app-test db` triggers dependency resolution. Router has `depends_on: app-prod`. If PROD_VERSION tag doesn't exist yet, `docker compose` tries to resolve it and fails.

**Fix:** Use `--no-deps` flag:
```bash
docker compose up -d app-test --no-deps
docker compose up -d router --no-deps
```

### Git divergent branches on VPS

**Root cause:** CI commits TEST_VERSION and pushes, then SSH runs `git pull` which may conflict with divergent history.

**Fix:** Use `git fetch origin && git reset --hard origin/master` instead of `git pull`.

## Database Configuration (CRITICAL)

| Environment | Database URL |
|-------------|-------------|
| app-test | `postgres://pier:pier@db:5432/pier_test` |
| app-prod | `postgres://pier:pier@db:5432/pier_prod` |

Prod and test MUST use separate databases. NEVER change prod's `DATABASE_URL` without explicit confirmation.
