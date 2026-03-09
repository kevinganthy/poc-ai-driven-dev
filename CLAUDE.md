# CLAUDE.md — poc-ai-driven-dev

Ticket management SaaS — **Express API + SvelteKit frontend + PostgreSQL**, containerisé avec Docker Compose.

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend | Express + TypeScript | 5.x / 5.6 |
| ORM | Prisma | 5.x |
| Base de données | PostgreSQL | 16 Alpine |
| Auth | jsonwebtoken + bcrypt | 9.x / 5.x |
| Validation | Zod | 3.x |
| Frontend | SvelteKit + Svelte 5 | 2.x / 5.x |
| Tests backend | Jest + supertest | 29.x |
| Tests frontend | Vitest + @testing-library/svelte | 4.x |
| Conteneurs | Docker Compose | — |

---

## Commandes essentielles

```bash
# Docker (méthode principale)
docker compose up --build        # Démarrer et reconstruire
docker compose down              # Arrêter
docker compose logs -f backend   # Logs backend
docker compose exec backend bash # Shell container backend

# Backend (local)
cd backend && npm run dev        # Port 3000
npm test && npm run test:coverage
npm run seed                     # Seed DB (admin user)

# Frontend (local)
cd frontend && npm run dev       # Port 5173
npm run build && npm test
```

---

## Architecture

```
Frontend SvelteKit (5173) → fetch + Bearer JWT
    ↓
Backend Express API (3000) → Prisma ORM
    ↓
PostgreSQL (5432)
```

**Couches backend :** `config/env.ts` · `lib/prisma.ts` · `middleware/` · `validators/` · `services/` · `routes/` · `__tests__/`

**Couches frontend :** `lib/api/` · `lib/stores/` · `lib/components/` · `lib/types.ts` · `routes/`

**Auth flow :** register → bcrypt hash → login → JWT 24h → `Authorization: Bearer <token>` → middleware `authenticate` → `req.user`

**RBAC :** `user` = CRUD ses tickets · `admin` = read-all + modifier statut de tout ticket

---

## Environnement (.env)

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ticketmanager
DATABASE_URL=postgresql://postgres:postgres@db:5432/ticketmanager
JWT_SECRET=dev_jwt_secret_change_in_production
PORT=3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin1234!
```

`entrypoint.sh` exécute `prisma db push` + seed au démarrage des containers.

**URLs :** Frontend http://localhost:5173 · Backend http://localhost:3000 · `GET /health` → `{ "status": "ok" }`

---

## Conventions de code

Les règles détaillées sont dans `.claude/rules/` — Claude Code les charge automatiquement selon le fichier ouvert :

| Rule | Scope | Contenu |
|------|-------|---------|
| `.claude/rules/typescript.md` | `**/*.ts` | Naming, imports, types Zod, services, middleware, erreurs, tests |
| `.claude/rules/svelte.md` | `**/*.svelte` | Runes ($state/$derived/$props), composants, formulaires, stores |
| `.claude/rules/docker.md` | `**/Dockerfile, **/compose.yml` | Multi-stage builds, sécurité, réseaux, secrets, healthcheck |
| `.claude/rules/database.md` | `**/schema.prisma, **/migrations/**` | IDs cuid, index, relations, enums, pagination, seed |
| `.claude/rules/prisma.md` | `**/prisma/seed.ts, **/lib/prisma.ts` | Singleton, seed idempotent |

**Règles transversales :** `strict: true` · jamais `any` · Zod obligatoire · services = fonctions nommées (pas de classes) · `clearAllMocks()` dans `beforeEach` · `process.env` uniquement via `config/env.ts`

---

## Pièges courants

**Backend :** Prisma singleton (`lib/prisma.ts` uniquement) · `prisma migrate deploy` en prod · CORS `'*'` = dev only · masquer les erreurs Prisma côté client

**Frontend :** `localStorage` vulnérable XSS (→ cookie httpOnly en prod) · `decodeTokenPayload()` = UI only · URL API hardcodée à externaliser via `$env/static/public` · `$effect` ≠ initialisation (→ `onMount`)

---

## Équipes et agents

### Workflow standard
```
client-<domaine>
      ↓
plan-product-owner → plan-software-architect → plan-scrum-master
                                                      ↙      ↘
                                  tech-qa-automation-expert ↔ tech-software-engineer
                                                      ↓
                                              tech-code-reviewer
                                                      ↓
                                              prod-tech-writer
```

**Agents transversaux** (tout moment) : `prod-debugger` · `prod-devops` · `prod-tech-debt-cleaner`

### Agents disponibles (`.claude/agents/`)

| Agent | Rôle |
|-------|------|
| `client-support` | Expert métier ITIL — formalise les besoins support |
| `plan-product-owner` | Clarifie besoins, écrit user stories |
| `plan-software-architect` | Conçoit l'architecture |
| `plan-scrum-master` | Découpe sprints, estime, crée sprint memory |
| `tech-software-engineer` | Implémente le code |
| `tech-qa-automation-expert` | Écrit et améliore les tests |
| `tech-code-reviewer` | Revue sécurité, perf, durabilité |
| `prod-tech-writer` | README, OpenAPI, PR de fin de sprint |
| `prod-debugger` | Diagnostique et corrige les bugs |
| `prod-devops` | Docker, CI/CD, infrastructure |
| `prod-tech-debt-cleaner` | Supprime code mort, migre conventions |

---

## Skills disponibles (`.claude/skills/`)

| Skill | Usage |
|-------|-------|
| `agent-handover` | Transférer le contexte entre agents |
| `client-template` | Créer un agent `client-<domaine>` |
| `feedback-loop` | Enregistrer et exploiter les feedbacks |
| `sprint-init` | Initialiser le fichier mémoire d'un sprint |
| `sprint-memory` | Créer et maintenir la mémoire de sprint |
| `sprint-resume` | Reprendre un sprint en cours |
| `svelte-new-component` | Scaffolding composant Svelte 5 |
| `docker-compose` | Générer/valider un compose.yml sécurisé |
| `docker-optimizer` | Optimiser Dockerfiles |
| `git-smart-commit` | Messages de commit sémantiques |

---

## Mémoire persistante (`.github/memories/`)

- **`feedback.md`** — feedback par agent (accepted/modified/rejected + lessons learned)
- **`sprints/sprint_[N]_[nom].md`** — backlog, statuts, log d'activité, contexte de reprise
- **`roadmap.md`** — contexte global et priorités

Créé par `plan-scrum-master` · mis à jour par tech-* et prod-debugger · clôturé par `prod-tech-writer`

---

## Schéma de données (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(user)
  tickets   Ticket[]
  createdAt DateTime @default(now())
}

model Ticket {
  id          String       @id @default(cuid())
  title       String
  description String
  status      TicketStatus @default(open)
  author      User         @relation(fields: [authorId], references: [id])
  authorId    String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum Role         { user admin }
enum TicketStatus { open in_progress closed }
```

---

## Endpoints API

| Méthode | Route | Auth | Rôle | Description |
|---------|-------|------|------|-------------|
| POST | `/auth/register` | Non | — | Créer un compte |
| POST | `/auth/login` | Non | — | Obtenir un JWT |
| GET | `/health` | Non | — | Health check |
| GET | `/tickets` | Oui | any | Lister tickets (filtrés par rôle) |
| POST | `/tickets` | Oui | any | Créer un ticket |
| GET | `/tickets/:id` | Oui | any | Détail d'un ticket |
| PUT | `/tickets/:id` | Oui | owner/admin | Modifier un ticket |
| DELETE | `/tickets/:id` | Oui | owner/admin | Supprimer un ticket |
