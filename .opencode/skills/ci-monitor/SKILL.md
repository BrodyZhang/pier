---
name: ci-monitor
description: Use AFTER pushing code to monitor the GitHub Actions workflow run. Poll the API to check build status, analyze failures, and verify the website is running after successful deployment.
---

# CI/CD Monitor Skill

Use this after every `git push` to master.

## 1. Get the Latest Run

```bash
# Fetch the latest workflow run
curl -s "https://api.github.com/repos/BrodyZhang/pier/actions/runs?per_page=1" | \
  python3 -c "import sys,json; r=json.load(sys.stdin)['workflow_runs'][0]; print(f'ID: {r[\"id\"]}, Status: {r[\"status\"]}, Conclusion: {r[\"conclusion\"]}')"
```

Or use the `webfetch` tool:
```
GET https://api.github.com/repos/BrodyZhang/pier/actions/runs?per_page=1
```

## 2. Poll Until Complete

Poll every 30 seconds while `status` is `"queued"` or `"in_progress"`.

## 3. On Success (conclusion: "success")

### 3a. Check job details
```bash
# Get the job list, look for deploy job
curl -s "https://api.github.com/repos/BrodyZhang/pier/actions/runs/<RUN_ID>/jobs"
```

### 3b. Verify website
```bash
# From GitHub Actions runner
curl -s -o /dev/null -w "%{http_code}" http://test.ailaopo.online/
```

### 3c. Update STATUS.md
- Mark deployment as successful
- Update deployed version
- Mark pending tasks as complete

## 4. On Failure (conclusion: "failure")

### 4a. Find which job failed
Check `jobs` array for `conclusion: "failure"`. There are 2 jobs:
- `build-and-push` — TypeScript compilation or Docker build
- `deploy` — SSH to VPS or docker compose

### 4b. Get annotations (error hints)
```bash
curl -s "https://api.github.com/repos/BrodyZhang/pier/check-runs/<JOB_ID>/annotations"
```

### 4c. Get step logs
If the job is `deploy`, the appleboy/ssh-action output is in the step "Deploy to VPS" or "Restart container on VPS". Logs require GitHub auth, so if the API returns 403:
- Ask the user to check the Actions page: `https://github.com/BrodyZhang/pier/actions/runs/<RUN_ID>`
- Or ask them to paste the error output

### 4d. Common failures & fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Bind for 0.0.0.0:80 failed: port is already allocated` | Old container still running | Add `docker stop/rm` before `docker compose up -d` |
| `Permission denied` for `/root/pier` | SSH user can't write to /root | Use `~/pier` instead |
| `no configuration file provided` | docker compose can't find compose file | Ensure `cd` to correct directory before running |
| `Could not find a declaration file for module` | Missing @types package | Add to `app/package.json` devDependencies |
| `An object literal cannot have multiple properties with the same name` | Duplicate key in TS object | Fix the duplicate key |
| `docker: 'compose' is not a docker command` | Docker Compose v2 not installed | Use `docker-compose` (v1) instead, or install plugin |

## 5. Website Verification Checklist

After successful deploy, verify:
- [ ] `http://test.ailaopo.online/` returns 200 (or DNS not configured yet)
- [ ] Register page loads
- [ ] Login page loads
- [ ] Dashboard redirects to login (no session)
