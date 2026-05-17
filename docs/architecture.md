# Architecture Overview

> **Note:** For the current deployed infrastructure (containers, networking, CI/CD), see [`deployment-architecture.md`](./deployment-architecture.md). This doc covers application-level architecture and user flows.

## System Context

```
┌──────────────────────────────────────────────────────┐
│                    Internet                            │
└──────────┬──────────────────────────┬─────────────────┘
           │                          │
           ▼                          ▼
    ailaopo.online             test.ailaopo.online
    (443 HTTPS)                 (80 HTTP)
           │                          │
           └──────────┬───────────────┘
                      ▼
        ┌────────────────────────────────────┐
        │   Azure VPS (Ubuntu 24.04)         │
        │                                    │
        │   ┌────────────────────────────┐   │
        │   │  pier-app-1 (nginx+Node)    │   │
        │   │  Ports 80,443 → nginx      │   │
        │   │  → proxy to :3000 (Node)   │   │
        │   └──────────┬─────────────────┘   │
        │              │                      │
        │   ┌──────────▼──────────────────┐   │
        │   │  pier-db-1 (PostgreSQL 16)  │   │
        │   └─────────────────────────────┘   │
        │                                    │
        │  SSL: /etc/letsencrypt (host mount) │
        │  Data: agent-data volume            │
        └────────────────────────────────────┘
```

> For detailed deployment architecture, see [`deployment-architecture.md`](./deployment-architecture.md).

## User Flow

```
Visitor ──► Homepage (disclaimer)
              │
              ├── Register ──► Email verification
              │                    │
              │              ┌─────┴─────┐
              │              │  Daily?   │── cap: 100/day
              │              │  < 100?   │
              │              └─────┬─────┘
              │                    ▼
              │              Account created
              │                    │
              ├── Login ───────────┘
              │
              ▼
         Dashboard
              │
              ├── Submit Agent Request (name + description)
              │         │
              │    [status: pending_review]
              │         │
              │    ┌─────▼──────┐
              │    │  Admin     │── AI-assisted (conceptual)
              │    │  Review    │── Human must approve
              │    └─────┬──────┘
              │         │
              │    ┌─────▼──────┐
              │    │  Approved? │
              │    └──┬────┬───┘
              │     No │    │ Yes
              │       │    ▼
              │    Reason  in_development
              │       │    │
              │       │    ▼
              │    [rejected]  Developer builds .html
              │       │       │
              │       │       ▼
              │       │   completed ──► /agent/<uuid>
              │       │                 │
              │       │            Share with partner
              │       │            [max 2 viewers]
              │
              └── View Agent Page
```

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| **Language** | TypeScript | Type safety, better DX |
| **Framework** | Express.js | Simple, well-known |
| **Rendering** | Server-side (EJS) | No SPA complexity for MVP |
| **Database** | PostgreSQL | Docker, reliable |
| **Email** | Resend HTTPS API (auto-detected) or SMTP or console.log | Resend API on port 443 (no SMTP port blocked on Azure); falls back to console.log on failure |
| **Agent pages** | HTML in PostgreSQL `agent_files` table | Simple, no filesystem management, auto-CASCADE on delete |
| **Access control** | Middleware per route | Simple enforcement |
| **Deploy** | CI/CD via GitHub Actions | Push to master → build → deploy |

## Container Boundaries

```
┌──────────────────────────────────────────────────┐
│  pier-app-1 (single container)                    │
│                                                   │
│  ┌──────────────┐     ┌──────────────────────┐   │
│  │   nginx       │────►  Node.js (Express)    │   │
│  │   Ports       │     │  Port 3000           │   │
│  │   80, 443     │◄────│  Auth, CRUD, views   │   │
│  │   SSL term    │     │  Disclaimer inject   │   │
│  └──────────────┘     └──────────────────────┘   │
│         │                    │                    │
│         │         ┌──────────▼────────────────┐   │
│         └─────────►  pier-db-1 (PostgreSQL)   │   │
│                   │  Port 5432 (internal)     │   │
│                   │  Volume: pg-data          │   │
│                   └───────────────────────────┘   │
│                                                   │
│  Volume: agent-data           SSL: host mount     │
└──────────────────────────────────────────────────┘
```

## Security Perimeter

```
Public (no auth):     / , /auth/* , /favicon.ico
User (login required): /dashboard, /agent/new, /agent/<slug>
Creator only:          /agent/<slug>/share, /agent/<slug>/edit
Admin only:            /admin/*
```

## Data Lifecycle

```
Register → User record in PostgreSQL (daily cap: 100)
Submit   → AgentRequest record (status: pending_review)
Review   → Admin updates status → notify user
Build    → Developer writes .html → saves to /data/agents/<uuid>/
Serve    → Node reads .html, injects disclaimer, serves
Share    → AgentShare record in PostgreSQL
Update   → New AgentVersion record, new .html file
Delete   → Admin soft-deletes or cleans old data
```

## Email Configuration

### Strategy

`app/src/services/mail.ts` supports three modes, checked in order:

1. **Resend HTTPS API** — Auto-detected when `SMTP_HOST` contains `resend.com`. Uses `fetch()` to POST `https://api.resend.com/emails` (port 443). Preferred for Azure VPS where SMTP port 465 may be blocked.
2. **Generic SMTP (nodemailer)** — Falls back to nodemailer SMTP for non-Resend providers.
3. **Console.log (dev mode)** — When no SMTP env vars are set, logs verification code to stdout. Check via `docker logs pier-app-test-1 --tail 20`.

### Setup (Resend)

1. Register at https://resend.com
2. Verify domain: add TXT record from Resend (domain verification)
3. Configure DKIM: add `resend._domainkey` TXT record, enable DKIM + sending in Resend dashboard
4. Create API Key in Resend dashboard → API Keys
5. Set GitHub secrets (see env vars table below)

### Environment Variables

| Var | Required | Example | Notes |
|-----|----------|---------|-------|
| `SMTP_HOST` | Yes (to send) | `smtp.resend.com` | If contains `resend.com`, uses HTTPS API |
| `SMTP_PORT` | No | `465` | Only used for generic SMTP |
| `SMTP_USER` | Yes (to send) | `resend` | |
| `SMTP_PASS` | Yes (to send) | `re_xxxxxx` | Resend API key or SMTP password |
| `SMTP_FROM` | No | `noreply@ailaopo.online` | Defaults to `SMTP_USER` |

### Behavior

- **Init**: On startup, verifies SMTP connection (or skips verify for Resend API). If verify fails, falls back to dev mode.
- **Send**: Wraps delivery in 10-second timeout. Always logs code to console as fallback.
- **Failure**: Logs error to console; page response is not blocked (code still usable from `docker logs`).

## Known Constraints

- VPS: Azure B1s/B2s (1-2 vCPU, 1-4GB RAM)
- Daily reboot at 03:00 UTC+8 (Docker restart policy handles this)
- Resend: 100 free emails/day (sufficient for MVP)
- Azure blocks outbound SMTP port 465 — Resend HTTPS API on port 443 works around this
- No automated backups initially (data may be cleared per disclaimer)
