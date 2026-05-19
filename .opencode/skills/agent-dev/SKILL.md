# Agent Development Skill

Use this skill when you need to process agent development tasks (develop HTML pages for agents).

## ⚠️ CRITICAL: Chinese Text Encoding

**The database does NOT support direct UTF-8 Chinese text.** You MUST use base64 encoding for ALL Chinese text in API calls.

### Base64 Encoding Rules

| Field | API Key | Encoding |
|-------|---------|----------|
| Agent name | `name_base64` | Base64 of UTF-8 string |
| Agent description | `description_base64` | Base64 of UTF-8 string |
| Game HTML | `html_base64` | Base64 of UTF-8 HTML content |

### Example

- Name `飞机大战` → Base64 → `6K665Lq66aKF5oiY`
- Description `太空小游戏 - 实战` → Base64 → `5aSq56m65bCP5bCE5Ye6IOWPkeS4huekvuWunuaImA==`

Generate base64 using: PowerShell `[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("飞机大战"))`

## Agent Versioning

Agents can have versions. A new version is created when a user requests an improvement to an existing agent.

### Key Rules

1. **Parent agents**: If an agent has `parent_id`, the AI must fetch the parent agent's HTML as the starting template. Download the parent's game from `/g/<parent_slug>` to get the base HTML.
2. **Only `in_development` agents can be developed**. If an agent is `pending_review`, wait for admin approval. If `dev_review`, wait for admin feedback or approval.
3. **Access control**: Never develop agents that are not in `in_development` status. Never release agents that are not in `completed` status.

## Workflow

### 1. Check for Tasks

```
GET https://test.ailaopo.online/api/dev/pending
Authorization: Bearer <DEV_API_KEY>
```

Response: `{ counts: { pending_review: N, in_development: N, dev_review: N }, total: N }`

- `pending_review`: New agent requests waiting for admin approval (you should wait, not act)
- `in_development`: Agents ready for you to develop
- `dev_review`: Agents waiting for admin review

### 2. Check for Rejected Agents

```
GET https://test.ailaopo.online/api/dev/rejected
Authorization: Bearer <DEV_API_KEY>
```

These are `in_development` agents with `review_comments` (feedback from admin on what to fix).

### 3. Fetch an Agent's Details

```
GET https://test.ailaopo.online/api/dev/agents
Authorization: Bearer <DEV_API_KEY>
```

Finds all agents needing development. Choose one or iterate through them.

### 4. Get the Game HTML (for versioned agents)

If the agent has a `parent_id`, fetch the parent's HTML:

```
GET https://test.ailaopo.online/g/<parent_slug>
```

This will serve the HTML. Use it as the starting template for the new version.

### 5. Upload Completed HTML

```
POST https://test.ailaopo.online/api/dev/upload/<agent_id>
Authorization: Bearer <DEV_API_KEY>
Content-Type: application/json

{
  "html_base64": "<base64-encoded HTML>"
}
```

### 6. Approve (final step)

After uploading, the agent is in `dev_review` status. Admin must approve it before it becomes `completed` and is served to users.

## Agent Status Flow

```
pending_review → (admin approves) → in_development → (AI uploads) → dev_review → (admin approves) → completed
                                                                          ↘ (admin rejects) → in_development (fix and re-upload)
```

- **pending_review**: DO NOT develop. Wait for admin approval.
- **in_development**: DEVELOP NOW. You can create HTML and upload it.
- **dev_review**: WAIT for admin feedback. If rejected, check `review_comments` and fix.
- **completed**: Published. No further action needed.

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dev/pending` | GET | Check pending task counts |
| `/api/dev/agents` | GET | List agents needing development |
| `/api/dev/rejected` | GET | Agents with review feedback to fix |
| `/api/dev/create` | POST | Create new agent (use `_base64` fields) |
| `/api/dev/upload/:id` | POST | Upload developed HTML |
| `/api/dev/update/:id` | POST | Update agent name/description (use `_base64` fields) |
| `/api/dev/approve/:id` | POST | (AI auto-approve after upload) |
| `/api/dev/lookup/:slug` | GET | Lookup agent by unique_slug |
| `/g/:slug` | GET | Public game serving endpoint |
