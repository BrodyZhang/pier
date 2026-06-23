# Pier — Refactoring Tasks

> **AI-maintained.** Check off tasks as completed. Update status after each task.

---

## Phase 1: Security Hardening (1-2 days)

### 1.1 Fix SQL Injection Risk
- **Status**: ✅ Done
- **Priority**: 🔴 P0
- **File**: `app/src/routes/dev.ts`
- **Issue**: `ALLOWED_DEV_STATUSES` string directly interpolated into SQL
- **Fix**: Use parameterized queries or enum constants
- **Acceptance**: No string concatenation in SQL queries

### 1.2 Add Rate Limiting
- **Status**: ✅ Done
- **Priority**: 🔴 P0
- **New File**: `app/src/middleware/rate-limit.ts`
- **Package**: `express-rate-limit`
- **Rules**:
  - Auth endpoints: 5 requests/minute per IP
  - API endpoints: 100 requests/minute per IP
- **Acceptance**: Rate limit headers returned, 429 on excess

### 1.3 Strengthen XSS Protection
- **Status**: ✅ Done
- **Priority**: 🔴 P0
- **File**: `app/src/server.ts`
- **Package**: `helmet`
- **Fix**: Add Content-Security-Policy headers
- **Acceptance**: CSP headers present in responses

### 1.4 Remove Hardcoded Secrets
- **Status**: ✅ Done
- **Priority**: 🔴 P0
- **File**: `app/src/services/db.ts:132`
- **Issue**: Hardcoded admin email `296068994@qq.com`
- **Fix**: Move to `ADMIN_EMAIL_BUILTIN` env var with fallback
- **Acceptance**: No hardcoded emails in source code

---

## Phase 2: Architecture Refactoring (3-5 days)

### 2.1 Introduce Service Layer
- **Status**: ✅ Done
- **Priority**: 🟠 P1
- **New Files**:
  - `app/src/services/agent.service.ts` — AgentService class
  - `app/src/services/auth.service.ts` — AuthService class
  - `app/src/services/user.service.ts` — UserService class
- **Methods (AgentService)**:
  - `getById(id)`, `getBySlug(slug)`, `create(data)`, `update(id, data)`, `delete(id)`
  - `getFiles(agentId)`, `uploadFile(agentId, content)`
  - `getShared(userId)`, `share(agentId, email)`, `unshare(agentId)`
- **Acceptance**: Routes contain no direct SQL queries

### 2.2 Unified Error Handling
- **Status**: ✅ Done
- **Priority**: 🟠 P1
- **New Files**:
  - `app/src/errors/app-error.ts` — Custom error classes
  - `app/src/middleware/error-handler.ts` — Global error handler
- **Error Classes**:
  - `NotFoundError` (404)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `ValidationError` (400)
- **Acceptance**: No `res.status(500).send('Server error')` in routes

### 2.3 Input Validation Standardization
- **Status**: ✅ Done
- **Priority**: 🟠 P1
- **Package**: `zod`
- **New Files**:
  - `app/src/validators/agent.validator.ts`
  - `app/src/validators/auth.validator.ts`
- **Acceptance**: All route inputs validated via Zod schemas

### 2.4 Complete Type Definitions
- **Status**: ✅ Done
- **Priority**: 🟠 P1
- **File**: `app/src/types/index.ts`
- **Missing Fields in AgentRequest**:
  - `review_notes: string | null`
  - `review_comments: string | null`
  - `review_log: ReviewLogEntry[]`
  - `showcased: boolean`
  - `is_public: boolean`
  - `parent_id: string | null`
  - `version_number: number`
- **Also**: Create `CreateAgentDTO`, `UpdateAgentDTO` types
- **Acceptance**: No `any` types in route handlers

---

## Phase 3: Code Quality (2-3 days)

### 3.1 Extract Shared Utilities
- **Status**: ✅ Done
- **Priority**: 🟡 P2
- **New Files**:
  - `app/src/utils/html.ts` — `decodeBase64Html()`, `injectDisclaimer()`, `injectChatWidget()`
  - `app/src/utils/validation.ts` — `isValidEmail()`, `isValidUuid()`
- **Duplicated In**: `agent.ts`, `server.ts`, `dev.ts`, `admin.ts`
- **Acceptance**: DRY — single source for HTML decoding

### 3.2 WebSocket Security
- **Status**: ✅ Done
- **Priority**: 🟡 P2
- **File**: `app/src/server.ts:148-200`
- **New File**: `app/src/ws/chat.ts`
- **Fixes**:
  - Add session token verification on connect
  - Add message rate limiting (3s cooldown exists, add connection rate limit)
  - Add message length validation server-side
- **Acceptance**: WebSocket requires valid session

### 3.3 Extract Inline Frontend Code
- **Status**: ✅ Done
- **Priority**: 🟡 P2
- **Current**: 150+ lines CSS/JS inline in `agent.ts` route
- **New Files**:
  - `app/public/js/chat.js`
  - `app/public/css/chat.css`
- **Acceptance**: Route handler < 50 lines for chat injection

### 3.4 Database Query Centralization
- **Status**: ✅ Done
- **Priority**: 🟡 P2
- **New Files**:
  - `app/src/repositories/agent.repository.ts`
  - `app/src/repositories/user.repository.ts`
- **Acceptance**: All SQL in repository files, not in routes/services

---

## Phase 4: Maintainability (2-3 days)

### 4.1 Database Migrations
- **Status**: ✅ Done
- **Priority**: ⚪ P3
- **Package**: `node-pg-migrate`
- **New Dir**: `migrations/`
- **Action**: Convert `initDB()` SQL to versioned migration files
- **Acceptance**: Schema changes tracked, reversible

### 4.2 Structured Logging
- **Status**: ✅ Done
- **Priority**: ⚪ P3
- **Package**: `pino`, `pino-http`
- **New File**: `app/src/utils/logger.ts`
- **Acceptance**: JSON logs with correlation IDs

### 4.3 Testing Framework
- **Status**: ✅ Done
- **Priority**: ⚪ P3
- **Package**: `jest`, `@types/jest`, `ts-jest`
- **New Files**:
  - `jest.config.js`
  - `tests/services/agent.test.ts`
  - `tests/routes/auth.test.ts`
- **Acceptance**: >50% code coverage for services

### 4.4 Session Cleanup
- **Status**: ✅ Done
- **Priority**: ⚪ P3
- **File**: `app/src/server.ts`
- **Action**: Add `pgSession` cleanup configuration
- **Acceptance**: Expired sessions auto-deleted

---

## Phase 5: DevOps (1-2 days)

### 5.1 Docker Optimization
- **Status**: ✅ Done
- **Priority**: ⚪ P3
- **New File**: `.dockerignore`
- **Changes**:
  - Add health check endpoint `GET /health`
  - Optimize layer caching
- **Acceptance**: `docker build` < 60s on cache hit

### 5.2 Environment Variable Management
- **Status**: ✅ Done
- **Priority**: ⚪ P3
- **New Files**:
  - `app/src/config/index.ts` — Centralized config
  - `.env.example` — Documented template
- **Acceptance**: Startup fails fast on missing required vars

### 5.3 API Versioning
- **Status**: ✅ Done
- **Priority**: ⚪ P3
- **Change**: `/api/dev/*` → `/api/v1/dev/*`
- **Acceptance**: Versioned routes, backward compatible

---

## Completion Checklist

- [ ] All P0 tasks completed
- [ ] All P1 tasks completed
- [ ] `npm run build` passes
- [ ] No `any` types in new code
- [ ] No direct SQL in route handlers
- [ ] All env vars documented in `.env.example`

---

## Notes

- Complete tasks in order within each phase
- Run `npm run build` after each task to verify
- Update `REPO_INDEX.md` when adding new files
- Update `STATUS.md` after completing each phase
