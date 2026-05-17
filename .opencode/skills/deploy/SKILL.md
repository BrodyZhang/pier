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

## CRITICAL: Test-First Deploy

**Push to master NEVER touches production.** The flow is:

```
push → build :latest → deploy to app-test only (test.ailaopo.online)
      ↓
      user tests on http://test.ailaopo.online/
      ↓
      if OK → manually promote to production
      ↓
      if not OK → fix + push again (still only affects test)
```

- `app-test` always runs `:latest` (every push redeploys it)
- `app-prod` is NEVER restarted by push deploy

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
- Open `http://test.ailaopo.online/` to verify test deployment
- Test all features: register, login, submit agent, admin flows

## Production Promotion

**Only after you confirm test is working:**

```bash
# Via SSH:
# 1. Pull the specific version that was tested (from GitHub Actions build output)
ssh azureuser@<VPS_IP>
cd ~/pier
docker compose pull app-prod    # pulls :${PROD_VERSION} or :latest
docker compose up -d app-prod
```

Or to pin a specific version:

```bash
# 1. Edit .env on VPS
echo 'PROD_VERSION=v20260517-00000042' >> ~/pier/.env

# 2. Pull and restart prod
cd ~/pier
docker compose pull app-prod
docker compose up -d app-prod
```

**To revert:** change `PROD_VERSION` back to `latest` and `docker compose up -d app-prod`

## Deploy to an Empty VPS (First Time)

### 1. SSH Setup
[MANUAL] The human must:
- `ssh azureuser@<VPS_IP>`
- Install Docker
- Clone repo: `git clone https://github.com/BrodyZhang/pier ~/pier`
- Run: `cd ~/pier && docker compose up -d`

### 2. SSL Certificate
[MANUAL] The human must:
- On VPS: `certbot --nginx -d ailaopo.online -d www.ailaopo.online`

### 3. GitHub Secrets & Variables
[MANUAL] The human must set these in GitHub repo Settings → Secrets and variables → Actions:
- **Secrets**: DOCKER_USERNAME, DOCKER_PASSWORD, VPS_HOST, VPS_USER, SSH_PRIVATE_KEY, SESSION_SECRET, ADMIN_EMAIL
- **Variables**: PROD_VERSION (default: `latest`)
