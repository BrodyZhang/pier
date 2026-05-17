---
name: deploy
description: Use when the user asks you to deploy, push, or release the project. Follows the full CI/CD pipeline: commit, push, wait for GitHub Actions, verify on VPS.
---

# Deploy Workflow

## Prerequisites

- GitHub Actions workflow at `.github/workflows/deploy.yml`
- Secrets set in GitHub: DOCKER_USERNAME, DOCKER_PASSWORD, VPS_HOST, VPS_USER, SSH_PRIVATE_KEY
- VPS has Docker and docker-compose installed (only requirements on VPS host)
- Domain ailaopo.online points to VPS IP
- Let's Encrypt certs exist on VPS at /etc/letsencrypt
- GitHub variable `PROD_VERSION` for production version pinning

## Everything Runs Inside Docker

**Never install anything on the VPS host directly.** Every component runs inside a container. See [`docs/deployment-architecture.md`](../../docs/deployment-architecture.md) for full infrastructure documentation.

| Component | Container | Notes |
|-----------|-----------|-------|
| nginx (reverse proxy) | `pier-router-1` | `Dockerfile.router`, nginx:alpine |
| Node.js (test) | `pier-app-test-1` | `app-test` service, always `:latest` |
| Node.js (prod) | `pier-app-prod-1` | `app-prod` service, pinned by `PROD_VERSION` |
| PostgreSQL | `pier-db-1` | `postgres:16-alpine` image |

- No nginx, Node.js, or PostgreSQL installed on VPS host
- All debugging via `sudo docker logs <container>` or `sudo docker exec -it <container> sh`
- All config changes: modify files in repo, rebuild and redeploy via GitHub Actions

## Architecture: 3 Environments

| Environment | Domain | DB | Deploy Trigger |
|-------------|--------|----|----------------|
| **Dev** | Local machine | `pier_dev` | Manual `npm run dev` |
| **Test** | `test.ailaopo.online` (HTTPS) | `pier_test` | Git push → CI/CD (auto) |
| **Prod** | `ailaopo.online` (HTTPS) | `pier_prod` | Manual SSH promote (only after test confirmed) |

- `app-test` always runs `:latest` (every push redeploys it)
- `app-prod` is NEVER restarted by push deploy
- Databases auto-created by `initDB()` in `db.ts`

## Steps

### 1. Commit and Push
```bash
git add -A
git commit -m "<type>: <description>"
git push origin master
```

### 2. Wait for Build
- GitHub Actions builds Docker image from `Dockerfile`
- Pushes to Docker Hub with two tags: `:latest` and `:YYYYMMDD-RUNNUMBER`
- SSHes to VPS, builds router image, pulls app-test only, runs `docker compose up -d router app-test db`

### 3. Verify on Test
- Check GitHub Actions tab for green checkmark
- Open `https://test.ailaopo.online/` to verify test deployment
- Test all features: register, login, submit agent, admin flows

## Production Promotion

**Only after you confirm test is working:**

### Automated (Recommended)

1. Update `PROD_VERSION` file in repo root with the build number (e.g. `20260517-00000069`)
2. Commit and push
3. `deploy-prod.yml` workflow auto-triggers, SSHes to VPS, updates `.env`, pulls image, restarts app-prod

```bash
echo "20260517-00000069" > PROD_VERSION
git add PROD_VERSION && git commit -m "prod: promote to build #69" && git push
```

This is the **only approved method**. It ensures the version is tracked in git and deployment is auditable.

### Manual (Fallback — only if workflow fails)

```bash
ssh azureuser@<VPS_IP>
cd ~/pier
git pull origin master
# Update .env
sed -i 's/^PROD_VERSION=.*/PROD_VERSION=v20260517-00000069/' .env
docker compose pull app-prod
docker compose up -d app-prod
```

### Revert

```bash
# 1. Update PROD_VERSION file to a previous known-good version
echo "20260517-00000042" > PROD_VERSION
git add PROD_VERSION && git commit -m "prod: revert to build #42" && git push
# deploy-prod.yml will handle the revert automatically
```

Or to pin to `latest` for emergency rollback:

```bash
# SSH to VPS and edit .env manually
sed -i 's/^PROD_VERSION=.*/PROD_VERSION=latest/' ~/pier/.env
cd ~/pier && docker compose pull app-prod && docker compose up -d app-prod
```

## Deploy to an Empty VPS (First Time)

### 1. SSH Setup
[MANUAL] The human must:
- `ssh azureuser@<VPS_IP>`
- Install Docker
- Clone repo: `git clone https://github.com/BrodyZhang/pier ~/pier`
- Run: `cd ~/pier && docker compose up -d`

### 2. SSL Certificate
[MANUAL] The human must:
- On VPS: `certbot certonly --standalone -d ailaopo.online -d www.ailaopo.online` (stop router first)
- For test domain: `certbot certonly --standalone -d test.ailaopo.online` (stop router first)
- Certs at `/etc/letsencrypt/live/` are mounted read-only into router container

### 3. GitHub Secrets & Variables
[MANUAL] The human must set these in GitHub repo Settings → Secrets and variables → Actions:
- **Secrets**: DOCKER_USERNAME, DOCKER_PASSWORD, VPS_HOST, VPS_USER, SSH_PRIVATE_KEY, SESSION_SECRET, ADMIN_EMAIL
- **Variables**: (none required — npm build args, etc.)
- **PROD_VERSION**: managed via `PROD_VERSION` file in repo root (no separate variable needed)
