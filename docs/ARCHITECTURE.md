# Architecture Technique — Ticket Manager POC

> Basé sur le README produit par la PO. Document destiné à guider l'implémentation.

---

> **Révision — Phase 1 : Catégories (8 mars 2026)**
> Ajout de la feature catégories : modèle de données, nouveaux endpoints, mise à jour des services et composants frontend.

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
| `GET` | `/tickets` | Oui | any | Liste (user: ses tickets, admin: tous). `?status=` et `?categories=` optionnels |
| `POST` | `/tickets` | Oui | any | Crée un ticket (`authorId` = `req.user.id`) |
| `GET` | `/tickets/:id` | Oui | any | Lecture (ownership ou admin) |
| `PUT` | `/tickets/:id` | Oui | any | Modification (ownership ou admin ; statut = admin uniquement) |
| `DELETE` | `/tickets/:id` | Oui | any | Suppression (ownership ou admin) |
| `GET` | `/categories` | Oui | any | Liste les 4 catégories prédéfinies (pour alimenter les selects UI) |

> **Règle RBAC sur `PUT /tickets/:id`** : si le body contient `status` et que `req.user.role !== 'admin'`, réponse 403 immédiate — avant toute écriture en base.
>
> **Règle RBAC sur la catégorie** : mêmes droits que `title`/`description` — owner sur ses tickets, admin sur tous.

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
  id          String          @id @default(uuid())
  title       String
  description String
  status      TicketStatus    @default(open)
  author      User            @relation(fields: [authorId], references: [id])
  authorId    String
  category    TicketCategory?           // ← Phase 1 : 0 ou 1 catégorie
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

// ── Phase 1 : catégories prédéfinies ─────────────────────────────────────────

enum CategoryName {
  Bug
  Feature
  Question
  Support
}

model Category {
  id        String          @id @default(uuid())
  name      CategoryName    @unique
  tickets   TicketCategory[]
  createdAt DateTime        @default(now())
}

// Table de liaison Ticket ↔ Category
// @unique sur ticketId = contrainte Phase 1 (max 1 catégorie par ticket)
// Retirer @unique sur ticketId pour passer en many-to-many (Phase 2)
model TicketCategory {
  ticketId   String   @unique        // ← contrainte Phase 1
  categoryId String
  ticket     Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id])

  @@id([ticketId, categoryId])
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

> **Note sur `onDelete: Cascade`** : la suppression d'un ticket supprime automatiquement l'enregistrement `TicketCategory` associé. Pas besoin de le gérer manuellement dans le service.
>
> **Note** : Prisma utilise `in_progress` (underscore) en interne, mais l'API exposera `in-progress` (tiret) comme spécifié — la conversion se fait dans le service.

### 4.5 Structure des dossiers — mise à jour Phase 1

```
backend/src/
├── config/
├── lib/
├── middleware/
├── routes/
│   ├── auth.ts
│   ├── categories.ts      ← NOUVEAU : GET /categories
│   └── tickets.ts         ← MODIFIÉ : gestion categoryId
├── services/
│   ├── auth.service.ts
│   ├── category.service.ts  ← NOUVEAU : getAll()
│   └── ticket.service.ts    ← MODIFIÉ : create/update/getAll avec catégorie
├── validators/
│   ├── auth.validator.ts
│   ├── category.validator.ts  ← NOUVEAU : CategoryName enum Zod
│   └── ticket.validator.ts    ← MODIFIÉ : categoryId optionnel
└── app.ts                     ← MODIFIÉ : mount /categories router
```

**Seed mis à jour :** `prisma/seed.ts` — upsert des 4 catégories après l'admin user.

### 4.6 Format de réponse Ticket — mise à jour Phase 1

La forme de réponse d'un ticket inclut désormais le champ `category` :

```json
{
  "id": "abc123",
  "title": "Mon ticket",
  "description": "...",
  "status": "open",
  "authorId": "user456",
  "category": {
    "id": "cat789",
    "name": "Bug"
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

- `category` est `null` si aucune catégorie n'est associée.
- Toutes les réponses tickets (liste et détail) incluent toujours le champ `category`.
- Le champ `category` est dénormalisé depuis `TicketCategory → Category` via `include` Prisma.

### 4.7 Filtrage combiné — implémentation

**Paramètre de requête :** `GET /tickets?status=open&categories=Bug,Feature`

**Logique dans `ticket.service.ts` :**

```
WHERE clause Prisma :
  [si user]     authorId = req.user.id
  [si status]   status IN [...]
  [si categories] category: {
                    category: { name: { in: ['Bug', 'Feature'] } }
                  }
```

- `categories` est parsé en `string[]` depuis la valeur séparée par virgules.
- Validé contre l'enum `CategoryName` — valeurs inconnues ignorées silencieusement (ou 400 selon implémentation).
- Les tickets **sans catégorie** (`TicketCategory` absent) ne matchent pas le filtre catégorie — comportement attendu.
- Les deux filtres sont appliqués en **ET logique** via la composition du `where` Prisma.

### 4.8 Gestion de la catégorie dans ticket.service.ts

**`create(data, user)` :**
- Si `data.categoryId` fourni : créer le ticket, puis créer `TicketCategory` dans une transaction Prisma.
- Si absent : créer le ticket seul.

**`update(id, data, user)` :**
- Si `data.categoryId` fourni : upsert `TicketCategory` (créer ou remplacer).
- Si `data.categoryId === null` explicitement : supprimer `TicketCategory` (retrait de catégorie).
- Si `data.categoryId` absent : ne rien changer.

**Pattern recommandé :** `prisma.$transaction([...])` pour atomiser la création ticket + création TicketCategory.

### 4.9 Format des réponses d'erreur

```json
// 400 Validation
{ "error": "Validation failed", "details": [{ "field": "title", "message": "Too short" }] }

// 400 categoryId invalide
{ "error": "Validation failed", "details": [{ "field": "categoryId", "message": "Category not found" }] }

// 401 Non authentifié
{ "error": "Unauthorized" }

// 403 Accès refusé
{ "error": "Forbidden" }

// 404 Ressource introuvable
{ "error": "Ticket not found" }
```

---

## 5. Architecture Frontend

### 5.1 Structure des dossiers — mise à jour Phase 1

```
frontend/src/
├── lib/
│   ├── api/
│   │   ├── auth.ts
│   │   ├── categories.ts    ← NOUVEAU : getAll()
│   │   └── tickets.ts       ← MODIFIÉ : categoryId + filtre categories
│   ├── stores/
│   │   └── auth.svelte.ts
│   ├── components/
│   │   ├── CategoryFilter.svelte  ← NOUVEAU : filtre multi-sélection
│   │   ├── StatusFilter.svelte
│   │   ├── TicketCard.svelte      ← MODIFIÉ : affichage tag catégorie
│   │   └── TicketForm.svelte      ← MODIFIÉ : sélecteur catégorie
│   └── types.ts                   ← MODIFIÉ : interface Category + Ticket.category
└── routes/
    └── tickets/
        ├── +page.svelte           ← MODIFIÉ : CategoryFilter + filtre combiné
        ├── new/+page.svelte       ← MODIFIÉ : passe categoryId
        └── [id]/edit/+page.svelte ← MODIFIÉ : passe categoryId
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

### 5.4 Types mis à jour — Phase 1

```typescript
// src/lib/types.ts
export interface Category {
  id: string;
  name: 'Bug' | 'Feature' | 'Question' | 'Support';
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  authorId: string;
  category: Category | null;   // ← NOUVEAU
  createdAt: string;
  updatedAt: string;
}
```

### 5.5 API categories — Phase 1

```typescript
// src/lib/api/categories.ts
export async function getAll(token: string): Promise<Category[]>
// GET /categories → [{ id, name, createdAt }]
```

### 5.6 API tickets — changements Phase 1

```typescript
// src/lib/api/tickets.ts
// getAll() — paramètre categories (tableau de noms)
export async function getAll(token: string, status?: string, categories?: string[]): Promise<Ticket[]>
// URL : /tickets?status=open&categories=Bug,Feature

// create() — categoryId optionnel
export async function create(token: string, body: { title: string; description: string; categoryId?: string }): Promise<Ticket>

// update() — categoryId optionnel, null pour retirer
export async function update(token: string, id: string, body: { title?: string; description?: string; status?: string; categoryId?: string | null }): Promise<Ticket>
```

### 5.7 Composant CategoryFilter

**Comportement :**
- Multi-sélection : cliquer une catégorie l'ajoute/retire de la sélection active.
- Bouton `Tous` : désactive tous les filtres catégorie.
- Émet les catégories sélectionnées (tableau `string[]`) vers la page parente.
- L'UI combine visuellement avec StatusFilter sans couplage direct entre les deux composants.

**Props :**
```typescript
interface Props {
  selected: string[];                              // catégories actives
  onchange: (categories: string[]) => void;
}
```

### 5.8 Tag catégorie dans TicketCard

- Affiché uniquement si `ticket.category !== null`.
- Couleur par catégorie (suggérée) :
  - `Bug` → rouge
  - `Feature` → bleu
  - `Question` → jaune
  - `Support` → vert
- Implémenté avec une map `Record<CategoryName, string>` dans le composant (pas de logique externe).

### 5.9 Filtre combiné — logique dans la page /tickets

```
activeStatus: string        // '' = tous
activeCategories: string[]  // [] = toutes

// À chaque changement de filtre :
tickets = await getAll(token, activeStatus || undefined, activeCategories.length ? activeCategories : undefined)
```

- Un seul appel API par changement de filtre.
- Pas de filtrage côté client — toujours délégué au backend.

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

### Lister les tickets avec filtre combiné

```
GET /tickets?status=open&categories=Bug,Feature
  → authenticate
  → service: parse categories → ['Bug', 'Feature']
             build Prisma where:
               { authorId?, status?, category: { category: { name: { in: [...] } } } }
  ← [{ticket + category}]
```

### Créer un ticket avec catégorie

```
POST /tickets {title, description, categoryId: "cat-uuid"}
  → authenticate
  → Zod validate (categoryId optionnel, uuid si fourni)
  → prisma.$transaction([
      prisma.ticket.create({...}),
      prisma.ticketCategory.create({ ticketId, categoryId })
    ])
  ← ticket + category (201)
```

### Modifier la catégorie d'un ticket

```
PUT /tickets/:id {categoryId: "new-cat-uuid"}
  → authenticate
  → ownership check
  → prisma.ticketCategory.upsert({ where: {ticketId}, create: {...}, update: {...} })
  ← ticket + nouvelle catégorie

PUT /tickets/:id {categoryId: null}
  → prisma.ticketCategory.deleteMany({ where: {ticketId} })
  ← ticket sans catégorie
```

---

## 8. Décisions architecturales clés

### Prisma plutôt que `pg` brut
Prisma génère les types TypeScript depuis le schéma, gère les migrations et le seed. Pour un POC, c'est un excellent rapport productivité/rigueur. Les requêtes Prisma sont paramétrées nativement — conforme aux conventions du projet.

### Table de liaison `TicketCategory` plutôt que FK directe sur `Ticket`
Bien qu'une simple colonne `categoryId` sur `Ticket` aurait suffi pour la Phase 1, la table de liaison est choisie pour anticiper la Phase 2 (multi-catégories). La migration Phase 1 → Phase 2 se réduit à supprimer la contrainte `@unique` sur `ticketId` — sans restructuration de table.

### `@unique` sur `ticketId` comme contrainte Phase 1
Garantit l'invariant « 1 catégorie max par ticket » au niveau base de données, pas seulement applicatif. La contrainte est documentée et localisée dans le schéma : sa suppression est la seule action nécessaire pour la Phase 2.

### `categoryId` dans le body plutôt que `categoryName`
Le frontend envoie l'UUID de la catégorie. Cela évite une résolution name→id côté backend et reste cohérent avec les conventions REST (référence par ID). Le frontend récupère la liste `/categories` au chargement pour construire le sélecteur name→id.

### Filtre catégories via noms (query string) et non IDs
`?categories=Bug,Feature` est lisible, bookmarkable, et ne nécessite pas que le frontend connaisse les UUIDs pour construire des URLs de filtre. La conversion name→id se fait dans le service via Prisma.

### Transaction Prisma pour création ticket + TicketCategory
Atomicité garantie : si la création de `TicketCategory` échoue (ex. `categoryId` invalide), le ticket n'est pas créé. Pas de données orphelines.

### Filtrage toujours délégué au backend
Pas de filtrage côté client. La page frontend re-fetch à chaque changement de filtre. Simple, cohérent avec le comportement RBAC (un `user` ne doit jamais voir les tickets des autres, même en client-side).

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
| 7 | Valider que le `categoryId` fourni existe en base avant insertion | FK violation non gérée |
| 8 | Utiliser `prisma.$transaction` pour ticket + TicketCategory | Ticket créé sans catégorie si la 2e requête échoue |
| 9 | Le champ `category` doit toujours être inclus via `include` dans toutes les requêtes Prisma retournant un ticket | Réponse incohérente (absent sur certains endpoints) |

---

## 10. Ce qui n'est pas couvert (hors scope confirmé)

- Rate limiting sur `/auth/login`
- HTTPS / TLS (à gérer au niveau d'un reverse proxy en prod)
- Refresh token
- Gestion des utilisateurs dans l'UI
- Pagination
- Tests (traités par l'agent `test-engineer`)
- CRUD catégories (Phase 1 : liste fixe seedée uniquement)
- Multi-catégories par ticket (Phase 2 : supprimer `@unique` sur `TicketCategory.ticketId`)
