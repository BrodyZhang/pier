# Architecture Overview

## System Context

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
    ailaopo.online:443         mail.ailaopo.online
           │                          │
           ▼                          ▼
    ┌──────────────────────────────────────────────┐
    │         Azure VPS (Ubuntu 24.04)              │
    │                                               │
    │  ┌─────────────────────────────────────────┐  │
    │  │         Docker Compose                   │  │
    │  │                                          │  │
    │  │  ┌──────┐    ┌──────────┐               │  │
    │  │  │nginx ├────►  webapp  │               │  │
    │  │  │:80   │    │ (Node.js │               │  │
    │  │  │:443  │◄───│ + TS)    │               │  │
    │  │  └──┬───┘    └────┬─────┘               │  │
    │  │     │             │                      │  │
    │  │     │      ┌──────▼───────┐              │  │
    │  │     └──────►  PostgreSQL  │              │  │
    │  │            └──────────────┘              │  │
    │  │                                          │  │
    │  └──────────────────────────────────────────┘  │
    │                                               │
    │  Data: /data/agents/<uuid>/index.html          │
    │  SSL: /etc/letsencrypt (host mount)            │
    │                                               │
    └───────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────────┐
    │    SendGrid API      │  ← Email verification codes
    │    (cloud, no VPS)   │     (no mail server on VPS)
    └──────────────────────┘
```

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
| **Deploy** | Manual docker-compose | Phase 1: simple. Phase 2: CI/CD |

## Container Boundaries

```
         ┌─────────────────────────────────┐
         │           nginx:alpine           │
         │  Ports: 80→443                   │
         │  SSL terminator                  │
         │  Proxies /api/* to webapp        │
         │  Serves /agent/<slug> → file     │
         └────────────┬────────────────────┘
                      │
         ┌────────────▼────────────────────┐
         │        webapp (Node.js + TS)     │
         │  Port: 3000                      │
         │  Auth, CRUD, review flow         │
         │  Disclaimer injection            │
         └────────────┬────────────────────┘
                      │
         ┌────────────▼────────────────────┐
         │     postgres:16-alpine           │
         │  Port: 5432                      │
         │  Persistent volume: pgdata       │
         └─────────────────────────────────┘

Volumes:
  pgdata     → PostgreSQL data
  agent_data → Static agent HTML files
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
