# Deploy Skill — Test-First Deployment Workflow

## Critical Rule: NEVER deploy to prod before test verification + human confirmation

This is the **most important rule** in the project. Violating it causes prod outages.

## Deployment Flow (Mandatory)

```
Code Change → Push → Test Deploy (auto) → Verify on test.ailaopo.online → Human says "OK" → Prod Deploy (manual PROD_VERSION update)
```

### Step 1: Make code changes
- Commit with clear message
- Push to master

### Step 2: Wait for Deploy to VPS workflow (deploy.yml)
- GitHub Actions will build-and-push the image AND deploy to test
- Monitor the workflow to completion
- **If the deploy (SSH) step fails**: fix it, commit and push again
- **If the build step fails**: fix the compilation error, commit and push again

### Step 3: Verify on test.ailaopo.online
- After the workflow succeeds, verify: `curl https://test.ailaopo.online/`
- Check: page loads (200 OK), content looks correct, login/register works
- If anything is wrong: fix locally, commit, push again (back to Step 1)

### Step 4: Ask human for confirmation
- Report what was deployed and what changed
- State clearly: `"Test is verified at https://test.ailaopo.online/. Ready for prod? [MANUAL] Please confirm."`
- **Wait for the human to explicitly say "OK" or "deploy prod"**
- Do NOT update PROD_VERSION without human confirmation

### Step 5: Promote to prod
- After human confirms: update `PROD_VERSION` file with the build number (e.g. `v20260519-00000081`)
- Commit and push
- Monitor `Deploy Prod` workflow (deploy-prod.yml) to completion

### Step 6: Verify prod
- Check: `curl https://ailaopo.online/` returns 200
- Verify the feature works on production

## What NOT to Do

- ❌ NEVER push to prod while test is on an older version
- ❌ NEVER skip test verification
- ❌ NEVER deploy prod without explicit human confirmation
- ❌ NEVER update PROD_VERSION in the same commit as code changes (always separate commits)
- ❌ NEVER assume a build succeeded without checking the workflow status

## deploy.yml SSH Failure Recovery

The deploy.yml (test deploy) SSH step has been known to fail. If it does:

1. Check if the build-and-push succeeded (it usually does)
2. The image IS on Docker Hub even if SSH deploy failed
3. Fix the SSH script → commit → push again → new build triggers

DO NOT manually run deploy-prod to work around a deploy.yml failure. Only deploy-prod after test verification is complete AND human confirms.

## Version Tracking

- `build number` = `github.run_number` from GitHub Actions
- `PROD_VERSION` = selected build number (promoted manually)
- Build tags: `brodyzhang2026/pier:v20260519-000000NN`
- `latest` tag always points to the most recent build (test uses this)
