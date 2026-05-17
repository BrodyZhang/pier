# Project Requirements Document

## 1. Overview

| Item | Value |
|------|-------|
| **Project Name** | pier |
| **Domain** | ailaopo.online |
| **Mail Domain** | mail.ailaopo.online (self-hosted postfix/dovecot or mailcow) |
| **Tagline** | 爱老婆就为你的老婆设置专属 AI Agent |
| **Infrastructure** | 1 x Azure Linux VPS (Ubuntu 24.04 LTS) |
| **Container Runtime** | Docker + Docker Compose |
| **Deployment** | GitHub Actions CI/CD (existing) |
| **SSL** | Let's Encrypt (existing) |

## 2. Core Concept

The domain name `ailaopo.online` means "love your wife" in Chinese. The website allows users to submit a request for a personalized "AI Agent" for their partner. However, **AI is currently a conceptual/aspirational feature** -- there is no actual AI or automation. All agent pages are custom-developed manually by the development team after receiving and reviewing a user's request.

## 3. Architecture

```
User Browser
    ↓
Nginx Reverse Proxy (port 80 → 443)
    ↓
Docker Compose (multi-container)
    ├── webapp (Node.js backend)
    ├── postgres (PostgreSQL database)
    ├── nginx (reverse proxy)
    └── mail-server (Postfix/Dovecot on mail.ailaopo.online)
```

### Technology Stack

| Layer | Choice |
|-------|--------|
| **Backend** | Node.js (Express / Fastify) |
| **Database** | PostgreSQL (Docker container) |
| **Frontend** | Server-side templates (EJS/Pug) or simple SPA |
| **Mail Server** | Self-hosted Postfix + Dovecot (or mailcow as turnkey solution) |
| **AI** | None -- all pages are manually developed |

## 4. Legal & Disclaimer Requirements

**STRICT REQUIREMENT**: Every page of the application MUST include prominent disclaimers:

1. **Homepage footer** + **Registration page** + **Agent submission page**:
   > "This is a personal learning and testing project. No actual AI services are provided. All 'AI Agent' pages are custom-developed manually. We make no guarantees about availability, accuracy, or longevity of the service. DATA MAY BE CLEARED AT ANY TIME WITHOUT NOTICE. By using this service, you acknowledge these terms."

2. **Agent page footer** (on every generated agent page):
   > "This page was created as part of a personal learning project. It is for demonstration purposes only. The content may be modified or removed at any time."

3. **No sensitive data**: Users must not input any real personal information, passwords, financial data, or sensitive content.

4. **Age restriction**: Users must be 18+.

5. **Indemnification clause**: The operator is not liable for any damages arising from use of this service.

## 5. Functional Requirements

### 5.1 Public Pages

| # | Feature | Description |
|---|---------|-------------|
| FR-1 | **Homepage** | Simple, clean landing page. Title: "为你的爱人创建一个专属页面". Explains the concept. CTA to register. Must include legal disclaimer. |
| FR-2 | **Register** | Email + verification code. |
| FR-3 | **Login** | Email + verification code. |
| FR-4 | **Agent Showcase** | (Optional, P2) A few demo/example pages that are publicly viewable. |

### 5.2 Registration System

| # | Feature | Description |
|---|---------|-------------|
| FR-5 | **Email Verification** | Enter email → system sends 6-digit code → user enters code to verify |
| FR-6 | **Daily Registration Cap** | Maximum 100 new registrations per day (00:00-23:59 UTC+8). Once limit reached, registration disabled until next day. |
| FR-7 | **Rate Limiting** | Resend code cooldown: 60 seconds. Code expires after 10 minutes. |

### 5.3 User Dashboard

| # | Feature | Description |
|---|---------|-------------|
| FR-8 | **Dashboard** | After login, shows: list of submitted agent requests + status. |
| FR-9 | **Submit Agent Request** | Form: **Agent Name** (required), **Agent Description** (required, free text describing desired page/theme/message). |
| FR-10 | **Request Statuses** | `pending_review` → `approved (developing)` → `completed` / `rejected` |
| FR-11 | **Status Visibility** | User sees current status and any update messages. |

### 5.4 Review & Development System (Admin Side)

| # | Feature | Description |
|---|---------|-------------|
| FR-12 | **Admin Panel** | Protected admin route listing all requests. |
| FR-13 | **Review Process** | Admin opens request → reviews description → can send message to user for clarification → approves or rejects. |
| FR-14 | **Development** | After approval, the developer manually builds the static HTML page and deploys it under the agent's unique URL. Status changes to `completed`. |
| FR-15 | **Rejection** | If rejected, admin provides a reason visible to the user. |

### 5.5 Agent Page

| # | Feature | Description |
|---|---------|-------------|
| FR-16 | **Unique URL** | Each completed agent gets: `https://ailaopo.online/agent/<uuid>` |
| FR-17 | **Static HTML** | The page is a hand-crafted static HTML file stored on the server. |
| FR-18 | **Edit/Update** | User can submit a new description to request an update. Creates a new "version". |
| FR-19 | **Version History** | Previous versions are archived. User can request to revert to a prior version. |

### 5.6 Access Control

| # | Feature | Description |
|---|---------|-------------|
| FR-20 | **Two-Person Limit** | Each agent page is accessible to at most 2 logged-in users: the **creator** and **one partner**. |
| FR-21 | **Share with Partner** | Creator enters partner's email. Partner must register. After registration, partner sees the shared agent on their dashboard. |
| FR-22 | **Unauthorized Access** | Users who are neither creator nor partner see a 403 page with a login prompt. |
| FR-23 | **Unshare** | Creator can revoke sharing. Partner loses access. |

## 6. Mail Server (Self-Hosted)

| # | Feature | Description |
|---|---------|-------------|
| MS-1 | **Subdomain** | `mail.ailaopo.online` |
| MS-2 | **Protocols** | SMTP (port 25, 587), IMAP (port 143, 993), POP3 (optional) |
| MS-3 | **Container** | Use `mailcow-dockerized` or manual Postfix + Dovecot |
| MS-4 | **Certificate** | Let's Encrypt for mail.ailaopo.online |
| MS-5 | **Purpose** | Send verification codes, notifications to users |
| MS-6 | **SPF/DKIM/DMARC** | Must configure to avoid emails going to spam |
| MS-7 | **Storage** | Minimal -- only auth emails and notifications, no user mailboxes |

## 7. Data Model

```
User:
  - id (PK, UUID)
  - email (unique)
  - role (user | admin)
  - created_at
  - last_login_at

AgentRequest:
  - id (PK, UUID)
  - user_id (FK → User)
  - name
  - description
  - status (pending_review | approved | in_development | completed | rejected)
  - rejection_reason (nullable)
  - unique_slug (UUID, set when completed)
  - created_at
  - updated_at

AgentVersion:
  - id (PK, UUID)
  - agent_id (FK → AgentRequest)
  - version_number (int)
  - description (text, what was requested for this version)
  - html_file_path (path to stored HTML file, nullable until built)
  - created_at

AgentShare:
  - id (PK, UUID)
  - agent_id (FK → AgentRequest)
  - partner_email
  - partner_user_id (FK → User, nullable)
  - created_at

VerificationCode:
  - id (PK, UUID)
  - email
  - code (6-digit)
  - expires_at
  - used (boolean)
```

## 8. Access Rule

An agent page at `/agent/<slug>` is accessible if:
- Viewer is logged in AND
- (viewer.id == agent.user_id) OR (viewer.id == agent_share.partner_user_id)

If not logged in → redirect to `/auth/login`
If logged in but not authorized → return 403 page

## 9. Complete Request-to-Completion Flow

```
User opens website → sees homepage with disclaimer
    ↓
User registers (email + verification code)
    ↓
User logs in → Dashboard
    ↓
User fills in Agent Request form (name + description)
    ↓
Submit → status: pending_review
    ↓
Admin reviews request in admin panel
    ↓
[Optional] Admin messages user for clarification
    ↓
Admin approves → status: in_development
    ↓
Developer manually builds static HTML page
    ↓
Developer places HTML at /path/to/agents/<uuid>/index.html
    ↓
Status updated to: completed
    ↓
User notified → can now:
    ├── Share with partner (enter partner email)
    └── View agent page at /agent/<uuid>
```

## 10. Page Inventory

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Homepage + disclaimer |
| `/auth/login` | Public | Login (email + code) |
| `/auth/register` | Public | Register (email + code) |
| `/dashboard` | Login Required | List of user's agent requests + status |
| `/agent/new` | Login Required | Submit new agent request form |
| `/agent/<slug>` | Login + Permitted | Agent page (static HTML, with disclaimer) |
| `/agent/<slug>/requests` | Login + Creator | Request edit/update |
| `/agent/<slug>/share` | Login + Creator | Manage partner sharing |
| `/admin` | Login + Admin | Admin dashboard |
| `/admin/requests` | Login + Admin | All requests queue |
| `/admin/requests/<id>` | Login + Admin | Review specific request |

## 11. Hosting & Docker Setup

### Current (existing):
```
Single container: pier (nginx + static HTML)
Ports: 80 → 443
SSL: Let's Encrypt mounted from host
Auto-restart: --restart=always
```

### Future (proposed multi-container):
```
Docker Compose:
  services:
    nginx:        # Reverse proxy
    webapp:       # Node.js backend
    postgres:     # PostgreSQL database
    mail:         # Mail server

All behind same Let's Encrypt certs.
```

The mail server will need its own SSL cert for `mail.ailaopo.online`.

## 12. Constraints

| # | Constraint |
|---|-----------|
| C-1 | VPS is a single Azure B1s/B2s instance (limited RAM/CPU) |
| C-2 | VPS automatically reboots at 03:00 UTC+8 daily |
| C-3 | Only ports 80 and 443 are open on the firewall (mail server may need 25, 587, 993) |
| C-4 | Data may be cleared at any time -- this is declared in the disclaimer |
| C-5 | No real AI -- all work is manual development |

## 13. Priority Matrix

| Priority | Features |
|----------|----------|
| **P0** | Homepage + disclaimer, Registration/Login (email+code), Submit agent request, Admin review panel, Agent page display, Two-person access control |
| **P1** | Share/unshare partner, Request status updates, Agent version history |
| **P2** | Mail server setup, In-app notifications (email too eventually), Edit/update requests |
| **P3** | Public demo showcase, Admin communication with user, Rollback to previous version |

## 14. Open Questions

| # | Question | Context |
|---|----------|---------|
| Q-1 | **Mail server solution** | mailcow-dockerized vs manual Postfix + Dovecot setup |
| Q-2 | **Admin user creation** | Seed via environment variable? Hardcoded first admin? |
| Q-3 | **Agent page storage** | File system vs database? (File system is simpler for static HTML) |
| Q-4 | **Notification method** | Only in-app (dashboard badge) vs also send email? |
| Q-5 | **Docker Compose migration** | Refactor existing deploy.yml to use docker-compose? Or keep GitHub Actions pushing single image? |
