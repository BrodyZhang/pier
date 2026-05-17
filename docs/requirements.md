# Project Requirements Document

## 1. Overview

| Item | Value |
|------|-------|
| **Project Name** | pier |
| **Domain** | ailaopo.online |
| **Tagline** | 爱老婆就为你的老婆设置专属 AI Agent |

## 2. Core Concept

The domain name `ailaopo.online` translates to "love your wife" in Chinese. The website lets users request a personalized "AI Agent" page for their partner. **There is no actual AI** -- all pages are custom-built manually by the development team. "AI Agent" is a conceptual/aspirational description.

## 3. Legal & Disclaimer

**Mandatory on every page**: All pages must include prominent disclaimers.

### 3.1 Homepage / Register / Agent Submission
> This is a personal learning and testing project. No actual AI services are provided. All "AI Agent" pages are custom-developed manually. We make no guarantees about availability, accuracy, or longevity of the service. **DATA MAY BE CLEARED AT ANY TIME WITHOUT NOTICE.** By using this service, you acknowledge these terms.

### 3.2 Agent Page Footer
> This page was created as part of a personal learning project. It is for demonstration purposes only. The content may be modified or removed at any time.

### 3.3 Additional Rules
- **No sensitive data**: Users must not input real personal info, passwords, financial data, or sensitive content.
- **Age restriction**: Users must be 18+.
- **Indemnification**: The operator is not liable for any damages arising from use of this service.

## 4. Functional Requirements

### 4.1 Public Pages

| # | Feature | Description |
|---|---------|-------------|
| FR-1 | **Homepage** | Clean landing page. Title: "为你的爱人创建一个专属页面". CTA to register. Includes legal disclaimer. |
| FR-2 | **Register** | Email + 6-digit verification code. |
| FR-3 | **Login** | Email + verification code. |
| FR-4 | **Agent Showcase** | (P2) Public demo pages. |

### 4.2 Registration System

| # | Feature | Description |
|---|---------|-------------|
| FR-5 | **Email Verification** | Enter email → receive 6-digit code → verify to complete registration |
| FR-6 | **Daily Cap** | Max 100 new registrations/day (00:00-23:59 UTC+8). Disabled when reached. |
| FR-7 | **Rate Limiting** | Resend code cooldown: 60s. Code expires: 10min. |

### 4.3 User Dashboard

| # | Feature | Description |
|---|---------|-------------|
| FR-8 | **Dashboard** | After login: list of agent requests + status. |
| FR-9 | **Submit Request** | Form: **Agent Name** (required), **Agent Description** (required, free text describing desired page). |
| FR-10 | **Statuses** | `pending_review` → `in_development` → `completed` / `rejected` |
| FR-11 | **Status Visibility** | User sees current status and any admin notes. |

### 4.4 Admin Review

| # | Feature | Description |
|---|---------|-------------|
| FR-12 | **Admin Panel** | Protected route listing all requests. |
| FR-13 | **Review** | Admin reviews description → can message user → approves or rejects. |
| FR-14 | **Development** | After approval, developer manually creates the HTML page and deploys it. Status set to `completed`. |
| FR-15 | **Rejection** | Admin provides reason, visible to user. |

### 4.5 Agent Page

| # | Feature | Description |
|---|---------|-------------|
| FR-16 | **Unique URL** | `https://ailaopo.online/agent/<uuid>` |
| FR-17 | **Static HTML** | Hand-crafted .html file, served directly. |
| FR-18 | **Edit** | User can submit new description to request update. Creates new version. |
| FR-19 | **Version History** | Previous versions archived. User can request revert. |

### 4.6 Access Control

| # | Feature | Description |
|---|---------|-------------|
| FR-20 | **Two-Person Limit** | Each agent visible to at most 2 logged-in users: creator + one partner. |
| FR-21 | **Share** | Creator enters partner's email. Partner registers → sees agent on their dashboard. |
| FR-22 | **Unauthorized** | 403 page with login prompt. |
| FR-23 | **Unshare** | Creator can revoke. Partner loses access. |

## 5. Access Rules

- Not logged in → redirect to `/auth/login`
- Logged in but not authorized → 403
- Authorized: `viewer.id == agent.user_id OR viewer.id == agent_share.partner_user_id`

## 6. Request-to-Completion Flow

```
Homepage (disclaimer)
    ↓ Register/Login
Dashboard
    ↓ Submit Agent Request (name + description)
pending_review
    ↓ Admin reviews + approves
in_development → developer builds HTML → deploys
    ↓
completed → creator shares with partner → both can view
```

## 7. Page Inventory

| Route | Access | What it does |
|-------|--------|-------------|
| `/` | Public | Homepage |
| `/auth/login` | Public | Login |
| `/auth/register` | Public | Register |
| `/dashboard` | Login | Agent list + create |
| `/agent/new` | Login | Submit request |
| `/agent/<slug>` | Login + Permitted | Agent page |
| `/agent/<slug>/share` | Creator | Manage sharing |
| `/agent/<slug>/edit` | Creator | Request update |
| `/agent/<slug>/history` | Creator | Version history |
| `/admin` | Admin | Admin dashboard |
| `/admin/requests` | Admin | Review queue |

## 8. Constraints

| # | Constraint |
|---|-----------|
| C-1 | Single Azure VPS (B1s/B2s, limited RAM/CPU) |
| C-2 | VPS reboots at 03:00 UTC+8 daily |
| C-3 | Only ports 80, 443 open on firewall |
| C-4 | Data may be cleared at any time (per disclaimer) |
| C-5 | No real AI -- all pages manually developed |

## 9. Priority Matrix

| Priority | Features |
|----------|----------|
| **P0** | Homepage + disclaimer, Register/Login, Submit request, Admin review, Agent page view, Two-person access |
| **P1** | Share/unshare, Status updates, Version history |
| **P2** | Email notifications (SendGrid), Edit/update requests, Agent showcase |
| **P3** | Admin-user messaging, Version rollback |
