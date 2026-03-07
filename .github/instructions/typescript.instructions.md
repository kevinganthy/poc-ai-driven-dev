---
applyTo: "**/*.ts"
---

# TypeScript Conventions

## Compiler Settings

- `strict: true` always — never disable strict mode or individual strict checks.
- Backend targets `ES2022` / `commonjs`. Frontend targets ES modules (SvelteKit).
- Use `sourceMap: true` in development/test builds.
- Use `esModuleInterop: true` for CommonJS/ESM interop.

## Naming

| Construct | Convention | Example |
|-----------|------------|---------|
| Files — services | `*.service.ts` | `ticket.service.ts` |
| Files — validators | `*.validator.ts` | `auth.validator.ts` |
| Files — stores | `*.svelte.ts` | `auth.svelte.ts` |
| Files — tests | `__tests__/*.test.ts` | `__tests__/auth.test.ts` |
| Functions / variables | camelCase | `getAll`, `currentUser` |
| Constants | UPPER_SNAKE_CASE or camelCase `as const` | `STATUS_LABELS`, `ticketStatusValues` |
| Interfaces / Types / Classes | PascalCase | `AuthUser`, `CreateTicketInput` |

## Imports

- Prefer namespace imports for service modules: `import * as ticketService from '../services/ticket.service'`.
- Use `import type` for type-only imports: `import type { Ticket } from '$lib/types'`.
- Use SvelteKit path aliases (`$lib/`, `$app/`) in the frontend.

## Type Patterns

- **Derive types from Zod schemas** rather than defining them manually:
  ```ts
  export type CreateTicketInput = z.infer<typeof createTicketSchema>;
  ```
- **Derive union types from `as const` arrays**:
  ```ts
  const ticketStatusValues = ['open', 'in-progress', 'closed'] as const;
  export type TicketStatus = (typeof ticketStatusValues)[number];
  ```
- **Extend Express `Request`** in `src/types/express.d.ts`, not inline.

## Services (Backend)

- Functional style — named exports, **no classes**.
- Each service function accepts typed parameters (never `any`).
- Throw errors via helper functions that set a `status` property:
  ```ts
  function notFound(): never {
    throw Object.assign(new Error('Ticket not found'), { status: 404 });
  }
  ```

## Middleware (Backend)

- Return `void`, call `next()` to continue, or send a response to terminate.
- Use factory functions for parameterised middleware:
  ```ts
  export function authorize(role: Role) {
    return (req: Request, res: Response, next: NextFunction): void => { ... };
  }
  ```

## Validation (Zod)

- All request bodies are validated via a `validate(schema)` middleware **before** reaching the route handler.
- All env vars are validated at startup with `envSchema.safeParse`; exit with code 1 on failure.
- Validation errors return `400` with `{ error: 'Validation failed', details: [...] }`.

## Error Handling

- Route handlers catch and respond: `res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' })`.
- Never swallow errors silently.
- Never expose raw stack traces to the client.

## Tests

### Backend (Jest + supertest)
- Files: `src/__tests__/*.test.ts`
- Mock Prisma: `jest.mock('../lib/prisma', () => ({ prisma: { ... } }))`
- Reset mocks in `beforeEach`: `jest.clearAllMocks()`
- Follow AAA (Arrange / Act / Assert) structure.

### Frontend (Vitest + Testing Library)
- Files: `src/**/__tests__/*.test.ts`
- Use `render()` from `@testing-library/svelte` and assert via `screen`.
- Use `userEvent.setup()` for user interaction simulations.
- Mock API calls with `vi.mock()`.

## Anti-patterns to Avoid

- ❌ `any` type — use `unknown` and narrow, or derive from Zod.
- ❌ Class-based services on the backend — use plain named exports.
- ❌ Inline Express type augmentation — always use `src/types/express.d.ts`.
- ❌ Manual type duplication when Zod inference is available.
- ❌ `catch (err)` without typing or checking — always access `.message` / `.status` safely.
- ❌ Raw `process.env.VAR` access outside `config/env.ts`.
