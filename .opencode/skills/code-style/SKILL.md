---
name: code-style
description: Use when writing new TypeScript files, EJS templates, or fixing coding style issues. Covers import patterns, error handling, naming conventions, and project-specific patterns.
---

# Code Style Guide

## TypeScript Conventions

### Imports
```typescript
// Standard library first
import path from 'path';

// Third-party packages next
import express from 'express';
import { Pool } from 'pg';

// Local modules last
import { requireAuth } from './middleware/auth';
import pool, { initDB } from './services/db';
```

### Route Pattern
```typescript
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.render('template', { key: 'value' });
});

export default router;
```

### Error Handling
- Use try/catch in route handlers
- Return meaningful error messages
- Log errors to console
- Never expose stack traces to users

### Session Types
```typescript
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    email?: string;
    isAdmin?: boolean;
  }
}
```

## EJS Conventions

1. Always extend `layout.ejs` for pages within the app shell
2. Agent view pages (`agent/view.ejs`) use a standalone HTML template (no layout) since they embed custom HTML
3. Include disclaimer blocks where required
4. Use gradient backgrounds (purple: `#667eea → #764ba2`)
5. Card pattern: `.card` with white background, rounded corners, shadow

## Naming

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `auth.ts`, `user-settings.ts` |
| Routes | kebab-case | `/agent/new`, `/admin/requests` |
| EJS views | kebab-case | `login.ejs`, `not-ready.ejs` |
| Functions | camelCase | `sendVerificationCode`, `requireAuth` |
| Tables | snake_case | `agent_requests`, `verification_codes` |
| Columns | snake_case | `unique_slug`, `rejection_reason` |

## Database

- All schema SQL in `app/src/services/db.ts` → `initDB()` function
- Use UUID primary keys via `gen_random_uuid()` (pgcrypto extension)
- Always use `TIMESTAMPTZ` for timestamps
