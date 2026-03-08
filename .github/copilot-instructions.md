# Workspace Instructions — poc-ai-driven-dev

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
| Build frontend | Vite | 6.x |
| Tests backend | Jest + supertest | 29.x |
| Tests frontend | Vitest + @testing-library/svelte | 4.x |
| Conteneurs | Docker Compose | — |

---

## Commandes essentielles

### Docker (méthode principale)

```bash
docker compose up             # Démarrer tout (db + backend + frontend)
docker compose up --build     # Reconstruire les images avant démarrage
docker compose down           # Arrêter et supprimer les conteneurs
docker compose logs -f backend   # Logs backend en temps réel
docker compose exec backend bash # Shell dans le container backend
```

### Backend (local, sans Docker)

```bash
cd backend
npm run dev           # Dev server avec hot-reload (port 3000)
npm run build         # Compile TypeScript → dist/
npm test              # Jest — tous les tests
npm run test:coverage # Jest avec rapport de couverture
npm run seed          # Seed base de données (admin user)
```

### Frontend (local, sans Docker)

```bash
cd frontend
npm run dev           # Vite dev server (port 5173)
npm run build         # Build SvelteKit production
npm test              # Vitest — tous les tests
npm run test:coverage # Vitest avec couverture V8
```

---

## Architecture

```
Frontend SvelteKit (5173)
    │  fetch + Bearer JWT
    ▼
Backend Express API (3000)
    │  Prisma ORM
    ▼
PostgreSQL (5432)
```

### Couches backend

```
config/env.ts        → Variables d'env validées par Zod (exit 1 si invalide)
lib/prisma.ts        → Singleton PrismaClient (ne jamais instancier ailleurs)
middleware/          → authenticate (JWT→req.user) · authorize (RBAC) · validate (Zod)
validators/          → Schémas Zod + types inférés
services/            → Logique métier (fonctions nommées, pas de classes)
routes/              → Express Router — délègue aux services
types/express.d.ts   → Augmentation Express.Request avec AuthUser
__tests__/           → Tests Jest (mock Prisma)
```

### Couches frontend

```
lib/api/             → Fonctions fetch pures (auth.ts, tickets.ts)
lib/stores/          → État partagé module-level ($state dans *.svelte.ts)
lib/components/      → Composants UI réutilisables (Props interface + $props())
lib/types.ts         → Types partagés (Ticket, User…)
lib/utils.ts         → Utilitaires (decodeTokenPayload — côté UI uniquement)
routes/              → Pages SvelteKit (+page.svelte, +layout.svelte)
```

### Flux d'authentification

1. `POST /auth/register` → bcrypt hash → INSERT User (role: `user`)
2. `POST /auth/login` → bcrypt compare → JWT 24h signé
3. Frontend : token stocké dans `localStorage` via `auth.svelte.ts`
4. Requêtes suivantes : `Authorization: Bearer <token>`
5. Middleware `authenticate` vérifie la signature et attache `req.user`
6. Middleware `authorize('admin')` vérifie le rôle si nécessaire

### RBAC

- **user** : CRUD ses propres tickets
- **admin** : read-all + modifier le statut de tout ticket

---

## Environnement

Créer `.env` à la racine (copier `.env.example`) :

```bash
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ticketmanager

# Backend
DATABASE_URL=postgresql://postgres:postgres@db:5432/ticketmanager
JWT_SECRET=dev_jwt_secret_change_in_production  # min 8 chars
PORT=3000

# Seed
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin1234!
```

`entrypoint.sh` exécute automatiquement `prisma db push` + seed au démarrage des containers.

**URLs de développement :**
- Frontend : http://localhost:5173
- Backend API : http://localhost:3000
- Health check : `GET /health` → `{ "status": "ok" }`

---

## Conventions de code

Les conventions détaillées sont dans les fichiers d'instructions spécialisés — Copilot les charge automatiquement :

| Fichier | Scope | Contenu |
|---------|-------|---------|
| [instructions/typescript.instructions.md](instructions/typescript.instructions.md) | `**/*.ts` | Naming, imports, types Zod, services, middleware, gestion d'erreurs, tests |
| [instructions/svelte.instructions.md](instructions/svelte.instructions.md) | `**/*.svelte` | Runes ($state/$derived/$props), composants, formulaires, stores, navigation |
| [instructions/docker.instructions.md](instructions/docker.instructions.md) | `**/Dockerfile,**/compose.yml` | Multi-stage builds, sécurité images, réseaux isolés, secrets, healthcheck |
| [instructions/database.instructions.md](instructions/database.instructions.md) | `**/schema.prisma,**/migrations/**,**/seed.ts` | IDs cuid, index, relations, enums, pagination, migrations, seed idempotent |

### Règles transversales

- `strict: true` toujours — jamais de `any`, utiliser `unknown` + narrowing
- Validation Zod obligatoire pour tous les inputs (requêtes HTTP, variables d'env)
- Services = fonctions nommées exportées, **pas de classes**
- Tests : structure AAA (Arrange / Act / Assert), `clearAllMocks()` dans `beforeEach`
- Ne jamais accéder à `process.env.VAR` hors de `config/env.ts`

---

## Pièges courants

### Backend

- **Prisma singleton** : utiliser uniquement `lib/prisma.ts` — ne jamais `new PrismaClient()`
- **`prisma db push --accept-data-loss`** dans `entrypoint.sh` : OK en dev, **`prisma migrate deploy` en prod**
- **CORS ouvert** : `origin: '*'` acceptable en dev, à restreindre avant mise en prod
- **Messages d'erreur Prisma** : peuvent exposer la structure DB — intercepter et renvoyer des messages génériques côté client

### Frontend

- **Token dans `localStorage`** : vulnérable XSS — utiliser cookie `httpOnly` en prod
- **`decodeTokenPayload()`** ne vérifie pas la signature — usage UI uniquement, le backend re-valide toujours
- **URL API hardcodée** : `const API = 'http://localhost:3000'` dans `lib/api/*.ts` — à externaliser via `$env/static/public` en prod
- **Svelte 5 runes** : `$effect` n'est pas pour l'initialisation — utiliser `onMount`

---

## Agents disponibles

| Agent | Rôle | Quand l'invoquer |
|-------|------|-----------------|
| `product-owner` | Clarifier les besoins, écrire des user stories | Avant de concevoir une feature |
| `software-architect` | Concevoir l'architecture | Après les specs |
| `scrum-master` | Découper en sprints, estimer | Après l'architecture |
| `software-engineer` | Implémenter le code | Après les specs + architecture |
| `test-engineer` | Écrire et améliorer les tests | Après ou pendant l'implémentation |
| `code-reviewer` | Revue sécurité, perf, durabilité | Avant de merger |
| `debugger` | Diagnostiquer et corriger des bugs | Sur erreur ou comportement inattendu |
| `devops-engineer` | Docker, CI/CD, infrastructure | Pour la config de déploiement |
| `tech-debt-cleaner` | Supprimer code mort, migrer conventions, mettre à jour dépendances | Sur fichier legacy ou dette technique accumulée |
| `tech-writer` | Mettre à jour README, générer OpenAPI, rédiger guides de migration, préparer la PR | En fin de sprint, après la code review |

product-owner → software-architect → scrum-master
                                      ↙      ↘
                          test-engineer  <->  software-engineer
                                          ↓
                                      code-reviewer
                                          ↓
                                      tech-writer

---

## Skills disponibles

| Skill | Répertoire | Usage |
|-------|-----------|-------|
| `svelte-new-component` | `skills/svelte/new-component/` | Scaffolding d'un composant Svelte 5 |
| `docker-compose` | `skills/docker/compose/` | Générer/valider un `compose.yml` sécurisé |
| `docker-optimizer` | `skills/docker/optimizer/` | Optimiser les Dockerfiles (multi-stage, layer cache) |
| `git-smart-commit` | `skills/git/smart-commit/` | Générer des messages de commit sémantiques |
| `agent-handover` | `skills/workflow/handover/` | Transférer le contexte entre agents |
| `feedback-loop` | `skills/feedback-loop/` | Enregistrer et exploiter les feedbacks utilisateur |
| `sprint-memory` | `skills/sprint-memory/` | Créer et maintenir la mémoire de sprint (`sprint_[N]_[nom].md`) |

---

## Feedback Loop (mémoire persistante)

Chaque agent implémente un **feedback loop** pour améliorer la qualité des suggestions au fil du temps :

1. **En début de session** : l'agent lit `/memories/feedback.md` et applique les patterns connus (accepted patterns à renforcer, anti-patterns à éviter).
2. **En fin de session** : l'agent demande un feedback (`accepted / modified / rejected`) et l'enregistre dans `/memories/feedback.md`.
3. **Distillation** : quand une leçon revient ≥2 fois, elle remonte dans la section **Patterns & Lessons Learned**.

> Fichier de mémoire : `/memories/feedback.md` (persistant entre toutes les conversations)

---

## Sprint Memory (mémoire de sprint)

Chaque sprint est tracé dans un fichier mémoire dédié pour permettre un **suivi humain rapide** et une **reprise de sprint par les agents** sans perte de contexte :

- **Nommage** : `/memories/sprints/sprint_[N]_[nom].md` (ex : `sprint_2_crud-tickets.md`)
- **Créé par** : `scrum-master` à la fin de la planification (depuis le template)
- **Mis à jour par** : `software-engineer`, `test-engineer`, `code-reviewer`, `debugger` tout au long du sprint
- **Clôturé par** : `tech-writer` avec rétrospective

**Contenu** : métadonnées · objectif · backlog avec statuts · problèmes & blocages · décisions · artefacts · log d'activité · contexte de reprise pour agents · rétrospective

> Template : `.github/skills/sprint-memory/template.md` · Protocole complet : `.github/skills/sprint-memory/SKILL.md`

---

## Schéma de données (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   # bcrypt hash
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
