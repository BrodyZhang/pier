---
name: auto-task-worker
description: Use when you need to continuously check for and process tasks on test and prod environments. Polls dev API for pending/rejected agents, develops them, uploads, and repeats.
---

# Auto Task Worker Skill

## Architecture

```
[poll loop] → GET /api/dev/pending → task found? → GET /api/dev/agents → develop HTML → POST /api/dev/upload/:id → status=dev_review → wait for admin → loop
                  ↓ no task
            GET /api/dev/rejected → rejected? → read review_comments → fix HTML → POST /api/dev/upload/:id → loop
```

Two environments to check:
- **test**: `https://test.ailaopo.online/api/dev/*`
- **prod**: `https://ailaopo.online/api/dev/*`

## API Endpoints

All require `Authorization: Bearer <DEV_API_KEY>` header.

| Method | Endpoint | Returns |
|--------|----------|---------|
| `GET` | `/api/dev/pending` | `{ pending: number, total: number }` — task counts |
| `GET` | `/api/dev/rejected` | `{ agents: [...] }` — agents needing rework (with `review_comments`) |
| `GET` | `/api/dev/agents` | `{ agents: [...] }` — all agents with `review_notes`, `review_comments` |
| `POST` | `/api/dev/upload/:id` | Upload HTML, body: `{ html: "<!DOCTYPE html>..." }` |

## Task Processing Flow

### Phase 1: Check for Work

```bash
# Check pending tasks on both environments
curl -sk "https://test.ailaopo.online/api/dev/pending" -H "Authorization: Bearer $DEV_API_KEY"
curl -sk "https://ailaopo.online/api/dev/pending" -H "Authorization: Bearer $DEV_API_KEY"

# Check rejected tasks (need rework)
curl -sk "https://ailaopo.online/api/dev/rejected" -H "Authorization: Bearer $DEV_API_KEY"
```

### Phase 2: Get Agent Details (for new pending tasks)

When `pending > 0`, fetch all agents to find those still `in_development`:

```bash
curl -sk "https://ailaopo.online/api/dev/agents" -H "Authorization: Bearer $DEV_API_KEY"
```

Look for: `"status":"in_development"` — these are approved by admin, ready to develop.
Look also: `"review_notes"` — admin's instructions for what to build.

### Phase 3: Develop the Agent

- Read `description` and `review_notes` (if any)
- Create full HTML page (mobile-friendly, all CSS inline, single file)
- Save to `dragon_game.html` or named file in repo root
- Test locally by opening in browser if possible

### Phase 4: Upload

Upload the HTML content:

```bash
# Create temp JSON
$json = @{ html = "<!DOCTYPE html>..." } | ConvertTo-Json -Compress
Set-Content -Path "upload.json" -Value $json

# Upload
curl.exe -k -s -X POST "https://ailaopo.online/api/dev/upload/<AGENT_ID>" `
  -H "Authorization: Bearer $DEV_API_KEY" `
  -H "Content-Type: application/json" `
  -d "@upload.json"
```

Expected success: `{"success":true,"status":"dev_review"}`

### Phase 5: Handle Rejected Tasks

When an agent appears in `/api/dev/rejected`:
- Read `review_comments` for specific fix instructions
- Read `review_notes` for overall direction
- Fix the HTML according to feedback
- Re-upload to same agent ID
- Status goes back to `dev_review` for admin to re-review

## Polling Loop Instructions

When the user invokes this skill, run a continuous loop:

1. Poll both test and prod `/api/dev/pending`
2. If any `pending > 0` or `/api/dev/rejected` has agents, process them
3. If no work, wait 120 seconds and poll again
4. Report status to the user every cycle

## Design Principles for Agent Development

- Single-file HTML (no external dependencies)
- Mobile-first (9:16 aspect ratio, touch support)
- All CSS inline in `<style>` tags
- Audio via Web Audio API (no external files)
- Canvas-based games should be responsive
- Include start screen, game over/restart
- Score display, particle effects for feedback

## Environment Variables in Use

| Variable | Value |
|----------|-------|
| `DEV_API_KEY` | `gE9Jupab3NW/H6/2QxkwMsD5lq7pRFWk+2lLGuAX3FQ=` |
| Test domain | `test.ailaopo.online` |
| Prod domain | `ailaopo.online` |

## Common Issues

| Symptom | Fix |
|---------|-----|
| `401 Unauthorized` | `DEV_API_KEY` env var might have expired/changed |
| Both envs return 0 pending | No work to do, wait and poll again |
| Upload returns 404 | Agent ID might be wrong, check `/api/dev/agents` |
| Rejected multiple times | Pay close attention to `review_comments`, iterate carefully |
