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

## Auto-Pilot Mode (Continuous Loop)

When the user says "auto" or "开始工作" or "continuous", enter a **self-sustaining loop** within this opencode session:

```
loop:
  poll all envs (prod + test) for tasks
  if work found:
    for each in_development agent:
      read description + review_notes
      develop HTML content
      upload via POST /api/dev/upload/:id
    for each rejected agent:
      read review_comments
      fix HTML
      re-upload
  wait 120 seconds
  goto loop
```

The loop runs **until the terminal is closed**. Steps to implement:

### 1. Fetch Agents
```powershell
$tmp=[System.IO.Path]::GetTempFileName(); curl.exe -k -s -o $tmp "https://ailaopo.online/api/dev/agents" -H "Authorization: Bearer gE9Jupab3NW/H6/2QxkwMsD5lq7pRFWk+2lLGuAX3FQ="; $content=Get-Content $tmp -Raw -Encoding UTF8 | ConvertFrom-Json; Remove-Item $tmp
```

### 2. Process New Tasks (in_development)
For each agent with `status: "in_development"`:
- Use `review_notes` as primary requirements
- Use `description` as secondary reference
- Create a full HTML single-file page
- Upload using Dev API

### 3. Handle Rejected Tasks
For each rejected agent (check `/api/dev/rejected`):
- Read `review_comments` carefully
- Update existing HTML file with fixes
- Re-upload to same agent ID

### 4. Upload
```powershell
$json = @{ html = $html } | ConvertTo-Json -Depth 1
Set-Content -Path "upload.json" -Value $json
curl.exe -k -s -X POST "https://ailaopo.online/api/dev/upload/<AGENT_ID>" `
  -H "Authorization: Bearer gE9Jupab3NW/H6/2QxkwMsD5lq7pRFWk+2lLGuAX3FQ=" `
  -H "Content-Type: application/json" `
  -d "@upload.json"
```

### 5. Logging
After each cycle, print:
```
[auto-worker] YYYY-MM-DD HH:MM:SS — processed X tasks, uploaded Y agents, next check in 120s
```

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
