# Ticket Manager

Ticket management SaaS built with Express API, SvelteKit frontend, and PostgreSQL — containerised with Docker Compose.

## Requirements

- Docker and Docker Compose
- Node.js 20+ (for local development without Docker)

## Quick Start

```bash
cp .env.example .env        # copy environment variables
docker compose up --build   # start all services
```

The stack starts three services:

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:5173  |
| Backend  | http://localhost:3000  |
| Database | localhost:5432         |

On first start, `entrypoint.sh` runs `prisma db push`, seeds the database, and creates the default admin account.

Default admin credentials (from `.env`):

```
Email:    admin@example.com
Password: Admin1234!
```

## Environment Variables

Copy `.env.example` to `.env` before running. All variables are required.

| Variable            | Description                                 | Example value                                              |
|---------------------|---------------------------------------------|------------------------------------------------------------|
| `POSTGRES_USER`     | PostgreSQL username                         | `postgres`                                                 |
| `POSTGRES_PASSWORD` | PostgreSQL password                         | `postgres`                                                 |
| `POSTGRES_DB`       | Database name                               | `ticketmanager`                                            |
| `DATABASE_URL`      | Prisma connection string                    | `postgresql://postgres:postgres@db:5432/ticketmanager`     |
| `JWT_SECRET`        | Secret for signing JWT tokens (min 32 chars)| `change_me_in_production_min_32_chars`                     |
| `PORT`              | Backend port                                | `3000`                                                     |
| `ADMIN_EMAIL`       | Default admin account email                 | `admin@example.com`                                        |
| `ADMIN_PASSWORD`    | Default admin account password              | `Admin1234!`                                               |

## API Endpoints

### Auth

| Method | Route            | Auth | Description              |
|--------|------------------|------|--------------------------|
| POST   | `/auth/register` | No   | Create a user account    |
| POST   | `/auth/login`    | No   | Authenticate, get a JWT  |
| GET    | `/health`        | No   | Health check             |

### Tickets

| Method | Route            | Auth   | Role         | Description                                 |
|--------|------------------|--------|--------------|---------------------------------------------|
| GET    | `/tickets`       | Bearer | any          | List tickets (users see their own; admins see all) |
| POST   | `/tickets`       | Bearer | any          | Create a ticket                             |
| GET    | `/tickets/:id`   | Bearer | owner/admin  | Get a ticket by ID                          |
| PUT    | `/tickets/:id`   | Bearer | owner/admin  | Update a ticket (only admins can set status) |
| DELETE | `/tickets/:id`   | Bearer | owner/admin  | Delete a ticket                             |

`GET /tickets` accepts optional query parameters:

- `?status=open|in-progress|closed` — filter by status
- `?categories=1,3` — filter by category ID (OR logic; comma-separated)

### Categories (public)

| Method | Route          | Auth   | Description                             |
|--------|----------------|--------|-----------------------------------------|
| GET    | `/categories`  | No     | List active categories (for selectors)  |

### Categories (admin)

These endpoints require a JWT from an account with the `admin` role.

| Method | Route                      | Auth   | Description                                   |
|--------|----------------------------|--------|-----------------------------------------------|
| GET    | `/categories/all`          | Bearer | List all categories including soft-deleted    |
| POST   | `/categories`              | Bearer | Create a category                             |
| PUT    | `/categories/:id`          | Bearer | Rename a category                             |
| DELETE | `/categories/:id`          | Bearer | Soft-delete a category (204 No Content)       |
| POST   | `/categories/:id/restore`  | Bearer | Restore a soft-deleted category               |

The full OpenAPI specification is at [`docs/openapi.yaml`](docs/openapi.yaml).

## Authentication

All protected endpoints require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are valid for 24 hours. Obtain one via `POST /auth/login`.

## Category Management

Categories are pre-seeded at startup (Bug, Feature, Improvement, Question, Documentation, Security, Performance). Admins can create, rename, soft-delete, and restore categories via the `/admin/categories` page or the admin API endpoints.

**Soft delete behaviour:** deleting a category sets `deletedAt` to the current timestamp. The category no longer appears in ticket creation selectors (`GET /categories`), but existing ticket associations are preserved. Restoring a category clears `deletedAt` and makes it active again.

## RBAC

| Action                        | `user` | `admin` |
|-------------------------------|--------|---------|
| Register / login              | Yes    | Yes     |
| Create a ticket               | Yes    | Yes     |
| View own tickets              | Yes    | Yes     |
| View all tickets              | No     | Yes     |
| Update own ticket (title/desc/category) | Yes | Yes  |
| Change ticket status          | No     | Yes     |
| Delete own ticket             | Yes    | Yes     |
| Delete any ticket             | No     | Yes     |
| Manage categories             | No     | Yes     |

Admin accounts are created via the seed script only — the register endpoint always creates `user` role accounts.

## Data Model

```
User
  id        String   (cuid)
  email     String   (unique)
  password  String   (bcrypt hash)
  role      Role     (user | admin)
  tickets   Ticket[]
  createdAt DateTime

Ticket
  id          String       (cuid)
  title       String
  description String
  status      TicketStatus (open | in_progress | closed)
  author      User
  authorId    String
  category    Category?    (optional, via TicketCategory junction)
  createdAt   DateTime
  updatedAt   DateTime

Category
  id        Int      (autoincrement)
  name      String   (unique)
  deletedAt DateTime? (null = active)
```

## Development Commands

```bash
# Docker (recommended)
docker compose up --build        # start and rebuild all services
docker compose down              # stop all services
docker compose logs -f backend   # tail backend logs
docker compose exec backend bash # open shell in backend container

# Backend (local)
cd backend
npm run dev                      # start dev server on port 3000
npm test                         # run Jest tests
npm run test:coverage            # run tests with coverage report
npm run seed                     # re-seed the database

# Frontend (local)
cd frontend
npm run dev                      # start dev server on port 5173
npm run build                    # production build
npm test                         # run Vitest tests
```

## Project Structure

```
backend/
  prisma/
    schema.prisma                # data model
    seed.ts                      # seed script
  src/
    config/env.ts                # typed env vars (Zod)
    lib/prisma.ts                # Prisma singleton
    middleware/                  # authenticate, authorize, validate
    validators/                  # Zod request schemas
    services/                    # business logic (functional)
    routes/                      # Express route handlers
    __tests__/                   # Jest + supertest integration tests

frontend/
  src/
    lib/
      api/                       # fetch wrappers (categories, tickets, auth)
      components/                # reusable Svelte 5 components
      stores/                    # auth store (Svelte 5 runes)
      types.ts                   # shared TypeScript types
    routes/                      # SvelteKit file-system routes
      admin/categories/          # admin category management page
      tickets/                   # ticket list, create, edit pages
```
