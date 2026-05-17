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
| **Email** | SendGrid API (cloud) | No mail server containers needed |
| **Agent pages** | Static .html files on disk | Simple, fast, versionable |
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

## Known Constraints

- VPS: Azure B1s/B2s (1-2 vCPU, 1-4GB RAM)
- Daily reboot at 03:00 UTC+8 (Docker restart policy handles this)
- SendGrid: 100 free emails/day (sufficient for MVP)
- No automated backups initially (data may be cleared per disclaimer)
