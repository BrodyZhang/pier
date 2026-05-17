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

## Everything Runs Inside Docker

**Never install anything on the VPS host directly.** Every component runs inside a container. See [`docs/deployment-architecture.md`](../../docs/deployment-architecture.md) for full infrastructure documentation.

| Component | Container | Notes |
|-----------|-----------|-------|
| nginx (reverse proxy) | `pier-app-1` | Built from Dockerfile, managed by entrypoint.sh |
| Node.js (Express) | `pier-app-1` | Started in background by entrypoint.sh |
| PostgreSQL | `pier-db-1` | `postgres:16-alpine` image |
| User HTML agents | `pier-app-1` | Stored at `/app/data/agents/` (Docker volume) |

- No nginx, Node.js, or PostgreSQL installed on VPS host
- All debugging: `sudo docker exec -it pier-app-1 sh` or `sudo docker logs pier-app-1`
- All config changes: modify files in repo, rebuild and redeploy via GitHub Actions

## Steps

### 1. Commit and Push
```bash
git add -A
git commit -m "<type>: <description>"
git push origin master
```

### 2. Wait for Build
- GitHub Actions builds Docker image
- Pushes to Docker Hub with two tags: `:latest` and `:YYYYMMDD-RUNNUMBER`
- SSHes to VPS, pulls new image, runs `docker compose up -d`

### 3. Verify
- Check GitHub Actions tab for green checkmark
- Or SSH to VPS: `cd ~/pier && docker compose ps`

## Deploy to an Empty VPS (First Time)

### 1. SSH Setup
[MANUAL] The human must:
- `ssh root@<VPS_IP>`
- Install Docker
- Clone repo: `git clone https://github.com/BrodyZhang/pier ~/pier`
- Run: `cd ~/pier && docker compose up -d`

### 2. SSL Certificate
[MANUAL] The human must:
- On VPS: `certbot --nginx -d ailaopo.online -d www.ailaopo.online`

### 3. GitHub Secrets
[MANUAL] The human must set these in GitHub repo Settings → Secrets and variables → Actions:
- DOCKER_USERNAME
- DOCKER_PASSWORD
- VPS_HOST
- VPS_USER
- SSH_PRIVATE_KEY
