---
name: deploy
description: Use when the user asks you to deploy, push, or release the project. Follows the full CI/CD pipeline: commit, push, wait for GitHub Actions, verify on VPS.
---

# Deploy Workflow

## Prerequisites

- GitHub Actions workflow at `.github/workflows/deploy.yml`
- Secrets set in GitHub: DOCKER_USERNAME, DOCKER_PASSWORD, VPS_HOST, VPS_USER, SSH_PRIVATE_KEY
- VPS has Docker and docker-compose installed
- Domain ailaopo.online points to VPS IP
- Let's Encrypt certs exist on VPS at /etc/letsencrypt

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
- Or SSH to VPS: `docker compose -f /root/pier/docker-compose.yml ps`

## Deploy to an Empty VPS (First Time)

### 1. SSH Setup
[MANUAL] The human must:
- `ssh root@<VPS_IP>`
- Install Docker
- Clone repo: `git clone https://github.com/BrodyZhang/pier /root/pier`
- Run: `docker compose -f /root/pier/docker-compose.yml up -d`

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
