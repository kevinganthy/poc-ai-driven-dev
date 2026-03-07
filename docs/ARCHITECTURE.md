# Architecture Technique — Ticket Manager POC

> Basé sur le README produit par la PO. Document destiné à guider l'implémentation.

---

## 1. Résumé exécutif

Architecture monolithique classique en deux tiers applicatifs (API REST + SPA) avec PostgreSQL. Choix délibérément simple pour un POC : pas de microservices, pas de message broker, pas de cache. L'effort est concentré sur la structure du code, le RBAC et la robustesse de l'API.

---

## 2. Vue d'ensemble

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                    │
│                                                     │
│  ┌─────────────┐   HTTP    ┌──────────────────────┐ │
│  │  Frontend   │ ◄──────── │      Backend         │ │
│  │  SvelteKit  │  :3000    │  Express + TypeScript│ │
│  │  (port 5173)│ ────────► │      (port 3000)     │ │
│  └─────────────┘           └──────────┬───────────┘ │
│                                       │ SQL          │
│                            ┌──────────▼───────────┐ │
│                            │     PostgreSQL        │ │
│                            │      (port 5432)      │ │
│                            └──────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 3. Stack technique

| Couche | Technologie | Justification |
|---|---|---|
| **Backend runtime** | Node.js 20 LTS + TypeScript | Imposé par le README |
| **Framework HTTP** | Express 5 | Standard, bien documenté, léger |
| **Validation** | Zod | Inférence TypeScript native, messages d'erreur structurés |
| **Auth** | jsonwebtoken + bcrypt | JWT stateless, bcrypt pour le hachage des mots de passe |
| **ORM / DB** | Prisma + node-postgres | Migrations, seed et types générés automatiquement ; requêtes paramétrées nativement |
| **Base de données** | PostgreSQL 16 | Imposé par le README |
| **Frontend** | SvelteKit + Svelte 5 (runes) | Routing intégré, SSR désactivable, cohérent avec les conventions du projet |
| **HTTP client** | fetch natif (SvelteKit) | Pas de dépendance supplémentaire nécessaire |
| **Conteneurs** | Docker + Docker Compose | Imposé par le README |

---

## 4. Architecture Backend

### 4.1 Structure des dossiers

```
backend/
├── src/
│   ├── config/          # Variables d'environnement typées
│   ├── middleware/
│   │   ├── authenticate.ts   # Vérification JWT → req.user
│   │   └── authorize.ts      # Contrôle de rôle (admin | user)
│   ├── routes/
│   │   ├── auth.ts           # POST /auth/register, /auth/login
│   │   └── tickets.ts        # CRUD /tickets
│   ├── services/
│   │   ├── auth.service.ts   # Logique register/login
│   │   └── ticket.service.ts # Logique CRUD + RBAC data-layer
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   └── ticket.validator.ts
│   └── app.ts           # Setup Express
├── prisma/
│   ├── schema.prisma
│   └── seed.ts          # Crée le compte admin par défaut
├── Dockerfile
└── package.json
```

### 4.2 Chaîne de middleware par requête

```
Request
  └─► express.json()
       └─► authenticate (JWT → req.user)        [routes protégées]
            └─► authorize('admin' | 'user')      [routes avec rôle requis]
                 └─► validator (Zod schema)
                      └─► route handler
                           └─► service
                                └─► Prisma
                                     └─► PostgreSQL
```

### 4.3 Endpoints API

| Méthode | Route | Auth | Rôle | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | Non | — | Crée un compte `user` |
| `POST` | `/auth/login` | Non | — | Retourne un JWT |
| `GET` | `/tickets` | Oui | any | Liste (user: ses tickets, admin: tous). `?status=` optionnel |
| `POST` | `/tickets` | Oui | any | Crée un ticket (`authorId` = `req.user.id`) |
| `GET` | `/tickets/:id` | Oui | any | Lecture (ownership ou admin) |
| `PUT` | `/tickets/:id` | Oui | any | Modification (ownership ou admin ; statut = admin uniquement) |
| `DELETE` | `/tickets/:id` | Oui | any | Suppression (ownership ou admin) |

> **Règle RBAC sur `PUT /tickets/:id`** : si le body contient `status` et que `req.user.role !== 'admin'`, réponse 403 immédiate — avant toute écriture en base.

### 4.4 Schéma Prisma

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  role      Role     @default(user)
  tickets   Ticket[]
  createdAt DateTime @default(now())
}

model Ticket {
  id          String       @id @default(uuid())
  title       String
  description String
  status      TicketStatus @default(open)
  author      User         @relation(fields: [authorId], references: [id])
  authorId    String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum Role {
  user
  admin
}

enum TicketStatus {
  open
  in_progress
  closed
}
```

> **Note** : Prisma utilise `in_progress` (underscore) en interne, mais l'API exposera `in-progress` (tiret) comme spécifié — la conversion se fait dans le service.

### 4.5 Format des réponses d'erreur

```json
// 400 Validation
{ "error": "Validation failed", "details": [{ "field": "title", "message": "Too short" }] }

// 401 Non authentifié
{ "error": "Unauthorized" }

// 403 Accès refusé
{ "error": "Forbidden" }

// 404 Ressource introuvable
{ "error": "Ticket not found" }
```

---

## 5. Architecture Frontend

### 5.1 Structure des dossiers

```
frontend/
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   ├── auth.ts       # register(), login()
│   │   │   └── tickets.ts    # getTickets(), createTicket(), etc.
│   │   ├── stores/
│   │   │   └── auth.svelte.ts  # $state: user, token (rune Svelte 5)
│   │   └── components/
│   │       ├── TicketCard.svelte
│   │       ├── TicketForm.svelte
│   │       └── StatusFilter.svelte
│   └── routes/
│       ├── +layout.svelte        # Guard d'auth global
│       ├── login/+page.svelte
│       ├── register/+page.svelte
│       └── tickets/
│           ├── +page.svelte      # Liste + filtre
│           ├── new/+page.svelte
│           └── [id]/
│               └── edit/+page.svelte
├── Dockerfile
└── package.json
```

### 5.2 Gestion de l'état auth (Svelte 5 runes)

```typescript
// src/lib/stores/auth.svelte.ts
let user = $state<User | null>(null);
let token = $state<string | null>(null);

// Persistance via localStorage (chargé au démarrage dans +layout.svelte)
```

### 5.3 Guard de navigation

Dans `+layout.svelte` : si `token === null` et la route n'est pas `/login` ou `/register`, redirection vers `/login` via `goto()`.

---

## 6. Infrastructure Docker

### 6.1 Services Docker Compose

```
services:
  db        → PostgreSQL 16, volume nommé, health check sur pg_isready
  backend   → Node 20, dépend de db (healthy), bind mount src/ en dev
  frontend  → Node 20, dépend de backend, bind mount src/ en dev
```

### 6.2 Variables d'environnement (`.env.example`)

```
# Backend
DATABASE_URL=postgresql://postgres:postgres@db:5432/tickets
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=24h
PORT=3000

# Seed admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin1234!

# Frontend
PUBLIC_API_URL=http://localhost:3000
```

---

## 7. Flux de données principaux

### Login

```
POST /auth/login {email, password}
  → Zod validate
  → bcrypt.compare(password, user.password)
  → jwt.sign({id, email, role})
  ← {token}
```

### Créer un ticket

```
POST /tickets {title, description}
  → authenticate (JWT decode → req.user)
  → Zod validate
  → prisma.ticket.create({...data, authorId: req.user.id, status: 'open'})
  ← ticket créé (201)
```

### Lister les tickets avec filtre

```
GET /tickets?status=open
  → authenticate
  → service: if admin → WHERE status = ?
             if user  → WHERE authorId = ? AND status = ?
  ← [{ticket...}]
```

---

## 8. Décisions architecturales clés

### Prisma plutôt que `pg` brut
Prisma génère les types TypeScript depuis le schéma, gère les migrations et le seed. Pour un POC, c'est un excellent rapport productivité/rigueur. Les requêtes Prisma sont paramétrées nativement — conforme aux conventions du projet.

### SvelteKit plutôt que Vite + Svelte nu
SvelteKit offre le routing basé sur le filesystem, correspondant exactement aux routes définies par la PO. Le SSR est désactivé (`export const ssr = false`) pour garder une SPA simple.

### Monolithe API plutôt que microservices
Le périmètre est clairement limité (2 entités, 2 rôles). Un monolithe est la bonne décision : moins de complexité opérationnelle, plus de vitesse de développement.

### Pas de refresh token
Imposé par le README (hors scope). Le token expire en 24h ; à l'expiration, l'utilisateur est redirigé vers `/login`.

---

## 9. Points de vigilance pour l'implémentation

| # | Point | Risque si ignoré |
|---|---|---|
| 1 | Le champ `status` dans `PUT /tickets/:id` doit être bloqué côté middleware **avant** d'atteindre le service | Élévation de privilège silencieuse |
| 2 | L'`authorId` doit être issu de `req.user.id` (JWT), jamais du body de la requête | Usurpation d'identité |
| 3 | `bcrypt.hash()` avec un salt rounds ≥ 10 | Mots de passe facilement craquables |
| 4 | `JWT_SECRET` minimum 32 caractères, jamais hardcodé | Token forgeable |
| 5 | Vérifier l'ownership **en base** (`WHERE id = ? AND authorId = ?`) et non après lecture | IDOR (Insecure Direct Object Reference) |
| 6 | Retourner 404 et non 403 quand un `user` accède à un ticket qui n'est pas le sien | Enumération de ressources |

---

## 10. Ce qui n'est pas couvert (hors scope confirmé)

- Rate limiting sur `/auth/login`
- HTTPS / TLS (à gérer au niveau d'un reverse proxy en prod)
- Refresh token
- Gestion des utilisateurs dans l'UI
- Pagination
- Tests (traités par l'agent `test-engineer`)
