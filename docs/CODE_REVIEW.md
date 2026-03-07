# Code Review — Ticket Management System

**Date**: 7 mars 2026  
**Reviewer**: GitHub Copilot (code-reviewer agent)  
**Scope**: Full repository — backend (Express/TypeScript/Prisma), frontend (SvelteKit/Svelte 5/TypeScript), Docker infrastructure  
**Sprints covered**: 1 → 4 (full implementation)

---

## Summary

The codebase is well-structured and demonstrates a clean separation of concerns: validators, services, routes, and middleware each have a distinct responsibility. The Svelte 5 migration is correctly carried out—no legacy rune patterns detected. Auth logic is sound, and the JWT authentication/RBAC flow is coherent end to end.

The most critical finding is a **TypeScript compilation failure across all frontend test files**: `npx tsc --noEmit` reports errors in every `*.test.ts` file due to `@testing-library/jest-dom` matchers not being typed in the Vitest context. Tests pass at runtime, but the CI type-check gate is compromised. This should be fixed immediately.

The second priority is hardening for any non-local deployment: the CORS wildcard, the JWT-in-localStorage pattern, and the hardcoded API URL all need attention before the application leaves the developer's machine.

---

## Security Findings

### 🟡 Medium — CORS wildcard origin
**File**: [backend/src/app.ts](../backend/src/app.ts#L9)

```ts
app.use(cors({ origin: '*' }));
```

Any domain can make credentialed requests to the API. Acceptable in local dev, but this must be an explicit allowlist before staging/production deployment.

**Fix**: Replace with `cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' })` and add `CORS_ORIGIN` to `.env`.

---

### 🟡 Medium — JWT stored in `localStorage` (XSS risk)
**File**: [frontend/src/lib/stores/auth.svelte.ts](../frontend/src/lib/stores/auth.svelte.ts#L1-L3)

```ts
let _token = $state<string | null>(
    typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
);
```

`localStorage` is readable by any JavaScript running on the page. A successful XSS attack anywhere in the app would allow an attacker to steal the JWT and impersonate the user.

**Fix for production**: Use `httpOnly; Secure; SameSite=Strict` cookies set by the backend. The frontend never touches the token directly. This requires rearchitecting the auth flow but is the industry standard for token security.

**Short-term mitigation**: Ensure Content Security Policy headers are in place on the backend (currently absent).

---

### 🟡 Medium — Raw error messages sent to clients
**Files**: [backend/src/routes/auth.ts](../backend/src/routes/auth.ts#L12), [backend/src/routes/tickets.ts](../backend/src/routes/tickets.ts#L17)

```ts
res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' });
```

This pattern propagates `err.message` for any uncaught exception — including Prisma connection errors, undefined reference errors, etc. A Prisma error message may expose the DB DSN, table names, or query structure.

**Fix**: Distinguish known app errors (tagged with `{ status, message }`) from unknown ones:

```ts
} catch (err: unknown) {
    const appError = err as { status?: number; message?: string };
    if (appError.status) {
        res.status(appError.status).json({ error: appError.message });
    } else {
        console.error('[UNHANDLED]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
```

---

### 🔵 Low — Client-side token decoding used to determine admin UI
**File**: [frontend/src/lib/utils.ts](../frontend/src/lib/utils.ts), used in [frontend/src/routes/tickets/+page.svelte](../frontend/src/routes/tickets/+page.svelte#L5)

```ts
export function decodeTokenPayload(token: string) {
    try {
        return JSON.parse(atob(token.split('.')[1]));  // no signature check
    } catch { return null; }
}
```

This decodes the JWT payload **without verifying the signature**. It is used to determine `isAdmin` and show/hide admin UI elements. A user could craft a fake JWT to reveal admin controls. The backend correctly validates every request, so there's no actual privilege escalation — but the UI could be misleading.

**Fix**: This is acceptable for display-only purposes, but document the intent explicitly and verify the backend rejects invalid tokens (it does).

---

### 🔵 Low — `entrypoint.sh` uses `--accept-data-loss`
**File**: [backend/entrypoint.sh](../backend/entrypoint.sh#L4)

```sh
npx prisma db push --accept-data-loss
```

This flag authorizes Prisma to drop columns, rename types, or delete data when a schema change is incompatible. Used on any environment with real data, a schema migration could silently destroy records.

**Fix**: Remove `--accept-data-loss` for all non-local environments. Use proper `prisma migrate deploy` in production.

---

## Performance Findings

### 🟡 Medium — No pagination on `GET /tickets`
**File**: [backend/src/services/ticket.service.ts](../backend/src/services/ticket.service.ts#L31-L38)

```ts
const tickets = await prisma.ticket.findMany({ where, orderBy: { createdAt: 'desc' } });
```

This is an unbounded query. With 10,000 tickets, this serializes the entire table, transfers all data over the wire, and renders all cards in the browser. The frontend's `TicketCard` already truncates descriptions to 150 characters — the data is over-fetched even visually.

**Fix**: Add `take` / `skip` parameters or cursor-based pagination. As a minimum: `findMany({ where, orderBy, take: 50 })`.

---

### 🔵 Low — Missing index on `Ticket.authorId`
**File**: [backend/prisma/schema.prisma](../backend/prisma/schema.prisma)

The `getAll()` query filters by `authorId` for regular users. A foreign key constraint in PostgreSQL does **not** create a B-tree index automatically. Without an index, user-scoped queries are full table scans.

**Fix**:
```prisma
model Ticket {
  // ...
  @@index([authorId])
  @@index([status])   // also useful for the status filter
}
```

---

### 🔵 Low — Tickets list fetches full `description` field
**File**: [backend/src/services/ticket.service.ts](../backend/src/services/ticket.service.ts#L35)

The list endpoint returns the full `description` (up to 1000 characters) for every ticket. The `TicketCard` component truncates it to 150 characters of display anyway.

**Fix**: Add `select` to the list query to omit `description`, and only return it in `getOne()`.

---

## Durability Findings

### `mapTicket` uses `any` — breaks type safety on the hot path
**Category**: Weak abstraction  
**File**: [backend/src/services/ticket.service.ts](../backend/src/services/ticket.service.ts#L18)

```ts
function mapTicket(ticket: any) {
    return { ...ticket, status: fromPrismaStatus(ticket.status) };
}
```

`mapTicket` is called on every ticket returned from the DB. Using `any` silences TypeScript for the most critical transformation in the service. A Prisma return type change would not be caught.

**Fix**:
```ts
import type { Ticket } from '@prisma/client';
function mapTicket(ticket: Ticket): Ticket & { status: TicketStatus } {
    return { ...ticket, status: fromPrismaStatus(ticket.status) };
}
```

---

### `Ticket.status` typed as `string` in shared types
**Category**: Fragile assumption  
**File**: [frontend/src/lib/types.ts](../frontend/src/lib/types.ts#L4)

```ts
export interface Ticket {
    status: string;  // should be 'open' | 'in-progress' | 'closed'
    ...
}
```

This propagates `string` throughout the entire frontend. The `STATUS_LABELS` map in `TicketCard.svelte` uses `Record<string, string>`, the CSS class `status-{ticket.status}` is unchecked, and filter comparisons are unchecked. An API contract change (e.g., a new status) would silently pass through.

**Fix**:
```ts
export type TicketStatus = 'open' | 'in-progress' | 'closed';
export interface Ticket {
    status: TicketStatus;
    ...
}
```

---

### TypeScript errors across all frontend test files
**Category**: Test hostility / observability gap  
**Files**: All `src/**/__tests__/*.test.ts`

`npx tsc --noEmit` reports 67 errors across all frontend test files. The root cause is that `@testing-library/jest-dom` matchers (`toBeInTheDocument`, `toHaveValue`, `toHaveAttribute`, etc.) are not typed in the Vitest assertion context. The runtime setup (`vitest.setup.ts` imports `@testing-library/jest-dom/vitest`) works, but TypeScript doesn't see the type augmentation.

**Symptom**: Tests pass at runtime; `tsc` fails globally.

**Fix**: Add a `vitest.d.ts` (or `src/vitest.d.ts`) file to explicitly declare the augmented matchers:
```ts
// src/vitest.d.ts
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
declare module 'vitest' {
    interface Assertion<R = unknown> extends TestingLibraryMatchers<R, void> {}
    interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, void> {}
}
```

Alternatively, add to `tsconfig.json`:
```json
"compilerOptions": {
    "types": ["@testing-library/jest-dom"]
}
```

---

### Hardcoded API URL prevents multi-environment deployment
**Category**: Fragile assumption  
**Files**: [frontend/src/lib/api/auth.ts](../frontend/src/lib/api/auth.ts#L1), [frontend/src/lib/api/tickets.ts](../frontend/src/lib/api/tickets.ts#L1)

```ts
const API = 'http://localhost:3000';
```

This URL is hardcoded in two files. Deploying to staging or production requires a code change, not just a config change.

**Fix**: Use SvelteKit's public env variable:
```ts
import { PUBLIC_API_URL } from '$env/static/public';
const API = PUBLIC_API_URL;
```
Add `PUBLIC_API_URL=http://localhost:3000` to `.env` and `.env.example`.

---

### Missing `/tickets/[id]` detail page
**Category**: Resistance to change  
**Directory**: `frontend/src/routes/tickets/[id]/`

There is no `+page.svelte` for `GET /tickets/:id`. The `[id]/` directory only contains `edit/`. Users can list and edit tickets, but there's no dedicated read-only view for a single ticket. The backend provides `GET /tickets/:id`, the API client `getOne()` is implemented, but no page consumes it.

This is a functional gap if a detail view is part of the UX requirements.

---

### Silent delete failure — user gets no feedback
**Category**: Observability  
**File**: [frontend/src/routes/tickets/+page.svelte](../frontend/src/routes/tickets/+page.svelte#L35-L42)

```ts
try {
    await remove(token, id);
} catch {
    tickets = prev;  // rolls back optimistically — good
    // but no error message is set!
}
```

When a delete fails (e.g., 403, 404, network error), the UI silently reverts to the previous state. The user sees the ticket reappear without any explanation.

**Fix**:
```ts
} catch (err: unknown) {
    tickets = prev;
    const e = err as { error?: string };
    error = e.error ?? 'La suppression a échoué.';
}
```

---

### `authorize` middleware is implemented but never used
**Category**: Dead code / confusion  
**File**: [backend/src/middleware/authorize.ts](../backend/src/middleware/authorize.ts)

The `authorize(role)` middleware is implemented and correctly checks `req.user?.role`. However, it is imported nowhere in the routes — RBAC is handled at the service level instead. This creates confusion about where authorization happens and could lead a future developer to bypass the service layer (thinking the middleware handles it) or miss that the middleware was never wired up.

**Recommendation**: Either: (a) add a comment explaining the design decision ("RBAC is data-level in ticket.service.ts; this middleware is reserved for future route-level isolation"), or (b) use it for admin-only routes like a future `DELETE /users/:id`.

---

### `$app/stores` used alongside Svelte 5 runes (mixed APIs)
**Category**: Fragile assumption  
**File**: [frontend/src/routes/+layout.svelte](../frontend/src/routes/+layout.svelte#L3)

```ts
import { page } from '$app/stores';  // Svelte 4 store API
```

The rest of the app uses Svelte 5 runes exclusively, but the layout imports from `$app/stores` — the Svelte 4 store-based API. This still works, but mixes paradigms and will need to be updated as SvelteKit moves toward `$app/state`.

**Fix**:
```ts
import { page } from '$app/state';  // Svelte 5 rune-based
// Then use page.url.pathname directly (no $page dereference needed)
```

---

### `entrypoint.sh` re-seeds on every container start
**Category**: Fragile assumption  
**File**: [backend/entrypoint.sh](../backend/entrypoint.sh)

On every container restart, the seed script runs. The `upsert` operation is safe (no data loss), but the unconditional DB push + seed on every startup is slow and fragile. In a multi-replica deployment it creates concurrent seed races.

**Recommendation**: Separate the seed from the entrypoint. Add a `seed` make target or docker compose `profiles` hook. For migrations in production, use `prisma migrate deploy` in a one-shot init container.

---

### Backend `runner` Dockerfile: `npx prisma generate` with missing CLI
**Category**: Fragile assumption  
**File**: [backend/Dockerfile](../backend/Dockerfile#L40-L48)

```dockerfile
RUN npm ci --omit=dev          # removes `prisma` CLI (devDependency)
# ...
RUN npx prisma generate        # <-- prisma CLI not installed!
```

The `prisma` CLI is in `devDependencies`. After `npm ci --omit=dev`, it is not in `node_modules`. `npx prisma generate` may succeed by downloading from npm on the fly, but this is non-deterministic and fails in air-gapped environments.

**Fix**: Copy the pre-generated Prisma client from the `builder` stage instead of regenerating:
```dockerfile
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
```
Remove the `RUN npx prisma generate` line from the runner stage.

---

## What's Done Well

1. **Environment validation at startup** ([backend/src/config/env.ts](../backend/src/config/env.ts)) — Zod schema validates all required env vars at boot, with `process.exit(1)` on failure. No silent misconfiguration.

2. **Clean middleware chain** — `validate` → `authenticate` → route handler is strictly ordered. The `validate` middleware assigns the Zod-parsed body back to `req.body`, ensuring downstream code only sees validated data.

3. **Svelte 5 runes used correctly throughout** — All components and pages use `$state`, `$derived`, `$props`. `untrack` in `TicketForm.svelte` is correct and documented with an inline comment. No `export let`, `$:`, or Svelte stores in component code.

4. **Consistent RBAC at the right layer** — Status changes are gated by role at the service level (before touching the DB), not in route handlers. Ownership checks consistently use 403 (not 404) to avoid leaking resource existence.

5. **Multi-stage Dockerfiles** — Both Dockerfiles use `development → builder → runner` stages. The runner stage runs as a non-root `appuser`, installs only production dependencies, and is separated from development tooling.

6. **Test coverage is behavioral, not structural** — Tests verify HTTP contracts (status codes, response bodies, header requirements) and Svelte component behavior (what the user sees and can do), not implementation details. Backend tests correctly mock Prisma rather than hitting a real DB.

7. **`in-progress` ↔ `in_progress` mapping is centralized** — The API-facing / Prisma enum translation is isolated in `ticket.service.ts` and never leaks into routes or validators.

---

## Priority Action Plan

### 1. Fix immediately

- 🔴 **TypeScript errors in all test files** — The CI type-check gate is broken. Add `vitest.d.ts` or extend `tsconfig.json` types. (See: *TypeScript errors across all frontend test files*)

### 2. Fix before any non-local deployment

- 🟠 **Restrict CORS origin** — Replace `origin: '*'` with an env-configured allowlist.
- 🟠 **Isolate internal error messages** — Prevent raw `err.message` from leaking to clients. Add structured error handling in route catch blocks.
- 🟠 **Externalize API URL** — Replace hardcoded `http://localhost:3000` with `$env/static/public` variable.
- 🟠 **Fix runner Dockerfile Prisma generation** — Copy `.prisma` from builder instead of `npx prisma generate` post-`npm ci --omit=dev`.

### 3. Fix in the next sprint

- 🟡 **Add pagination to `GET /tickets`** — Prevent unbounded queries; start with `take: 50`.
- 🟡 **Add `Ticket.status` union type** — Replace `string` with `'open' | 'in-progress' | 'closed'` in `types.ts`.
- 🟡 **Fix `mapTicket: any`** — Type the function properly using Prisma's generated `Ticket` type.
- 🟡 **Fix silent delete failure** — Set `error` state in the `catch` block of `handleDelete`.
- 🟡 **Add DB indexes** — `@@index([authorId])` and `@@index([status])` on the `Ticket` model.

### 4. Backlog / nice to have

- 🔵 **JWT in `httpOnly` cookies** — Architectural rework for production hardening.
- 🔵 **Migrate `$app/stores` to `$app/state`** — Layout uses Svelte 4 store API.
- 🔵 **Clarify `authorize` middleware intent** — Dead code or document the design decision.
- 🔵 **Separate seed from entrypoint** — Don't re-seed on every container start.
- 🔵 **Remove `--accept-data-loss` from entrypoint** — Use `prisma migrate deploy` for production.
- 🔵 **Add `/tickets/[id]` detail page** — Currently missing; backend supports it.
