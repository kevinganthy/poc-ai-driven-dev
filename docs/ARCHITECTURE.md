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
- Multi-catégories par ticket (contrainte `@unique` maintenue en Phase 2)

---

---

> **Révision — Phase 2 : Gestion des catégories (9 mars 2026)**
> CRUD admin des catégories, hiérarchie illimitée (self-relation), soft delete en cascade, restauration remontante, autocomplete avec breadcrumb, page d'administration `/admin/categories`.

---

## 11. Architecture — Phase 2 : Gestion hiérarchique des catégories

### 11.1 Résumé exécutif

La Phase 2 transforme le modèle de catégories d'une liste fixe seedée en un arbre dynamique administrable. L'approche retenue s'appuie sur une **self-relation Prisma pour la hiérarchie**, des **CTEs récursives PostgreSQL** pour les opérations en cascade (archive/descendants), et un **tree-building en mémoire** pour sérialiser l'arbre en JSON. Aucun changement de framework ni de couche d'infrastructure — évolution strictement additive sur l'existant.

---

### 11.2 Migration du schéma de données

#### Changements sur le modèle `Category`

| Champ | Phase 1 | Phase 2 | Raison |
|---|---|---|---|
| `id` | `Int @default(autoincrement())` | `String @id @default(cuid())` | Cohérence avec les autres entités + génération sans séquence DB |
| `name` | `String @unique` (enum implicite) | `String @unique` (2–50 chars, case-insensitive) | Extensible à l'infini, validation applicative |
| `parentId` | — | `String?` FK auto-référentielle | Hiérarchie illimitée |
| `archivedAt` | — | `DateTime?` | Soft delete — null = active |
| `updatedAt` | — | `DateTime @updatedAt` | Audit trail d'admin |

#### Changement sur `TicketCategory`

| Champ | Phase 1 | Phase 2 |
|---|---|---|
| `categoryId` | `Int` | `String` (cuid) |

La contrainte `@unique` sur `ticketId` est **maintenue** — 1 catégorie max par ticket reste la règle.

#### Schéma Prisma cible

```prisma
model Category {
  id               String           @id @default(cuid())
  name             String           @unique
  parent           Category?        @relation("CategoryTree", fields: [parentId], references: [id])
  parentId         String?
  children         Category[]       @relation("CategoryTree")
  archivedAt       DateTime?
  ticketCategories TicketCategory[]
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}

model TicketCategory {
  id         String   @id @default(uuid())
  ticket     Ticket   @relation("TicketToCategory", fields: [ticketId], references: [id], onDelete: Cascade)
  ticketId   String   @unique
  category   Category @relation("CategoryToTicket", fields: [categoryId], references: [id], onDelete: Cascade)
  categoryId String   // ← String (cuid) au lieu de Int
  createdAt  DateTime @default(now())

  @@unique([ticketId, categoryId])
}
```

#### Stratégie de migration (dev)

Le changement de type `Int → String` sur `categoryId` est une **migration destructive** (incompatible avec `prisma migrate`). En environnement de développement, la stratégie est :

1. Mettre à jour `schema.prisma`
2. Exécuter `prisma db push --accept-data-loss` — les tables `Category` et `TicketCategory` sont recréées
3. Exécuter `npm run seed` — les 7 catégories existantes sont re-seedées comme racines (`parentId = null`) avec de nouveaux IDs cuid

> En production, cette opération nécessiterait une migration Prisma en plusieurs étapes : ajout colonne, backfill, suppression ancienne colonne. Hors scope POC.

---

### 11.3 Architecture Backend — nouveaux composants

#### Structure des dossiers — mise à jour Phase 2

```
backend/src/
├── routes/
│   └── categories.ts        ← MODIFIÉ : GET + POST + PUT + DELETE + POST restore
├── services/
│   └── category.service.ts  ← MODIFIÉ : CRUD + tree builder + CTEs récursives
├── validators/
│   └── category.validator.ts ← MODIFIÉ : CreateCategorySchema + UpdateCategorySchema
└── (aucun nouveau fichier)
```

#### Validators Zod — `category.validator.ts`

```typescript
export const CreateCategorySchema = z.object({
  name:     z.string().min(2).max(50),
  parentId: z.string().cuid().optional().nullable(),
});

export const UpdateCategorySchema = z.object({
  name:     z.string().min(2).max(50).optional(),
  parentId: z.string().cuid().optional().nullable(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field required',
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
```

---

### 11.4 Opérations récursives — stratégie PostgreSQL CTE

Les trois opérations nécessitant de traverser l'arbre (archive cascade, restauration remontante, expansion ids pour filtre) sont implémentées via des **CTEs récursives PostgreSQL** exécutées avec `prisma.$executeRaw` / `prisma.$queryRaw`. Ce choix garantit :
- Atomicité en une seule transaction
- Performance : O(n) traversal en base, pas de N+1
- Simplicité : pas de BFS/DFS applicatif multi-requêtes

#### CTE 1 — Archiver une catégorie et tous ses descendants

```sql
WITH RECURSIVE descendants AS (
  SELECT id FROM "Category" WHERE id = $1
  UNION ALL
  SELECT c.id FROM "Category" c
  INNER JOIN descendants d ON c."parentId" = d.id
  WHERE c."archivedAt" IS NULL
)
UPDATE "Category"
SET "archivedAt" = NOW(), "updatedAt" = NOW()
WHERE id IN (SELECT id FROM descendants)
```

Exécuté dans `prisma.$executeRaw` — retourne le nombre de lignes affectées. L'opération est wrapped dans `prisma.$transaction` si des effets secondaires sont nécessaires.

#### CTE 2 — Restaurer une catégorie et tous ses ancêtres

```sql
WITH RECURSIVE ancestors AS (
  SELECT id, "parentId" FROM "Category" WHERE id = $1
  UNION ALL
  SELECT c.id, c."parentId" FROM "Category" c
  INNER JOIN ancestors a ON c.id = a."parentId"
)
UPDATE "Category"
SET "archivedAt" = NULL, "updatedAt" = NOW()
WHERE id IN (SELECT id FROM ancestors)
```

> **Règle PO** : seule la catégorie cible + ses ancêtres sont restaurés. Les descendants archivés en cascade ne sont **pas** auto-restaurés.

#### CTE 3 — Récupérer tous les IDs descendants (pour filtre tickets)

```sql
WITH RECURSIVE descendants AS (
  SELECT id FROM "Category" WHERE id = ANY($1::text[])
  UNION ALL
  SELECT c.id FROM "Category" c
  INNER JOIN descendants d ON c."parentId" = d.id
)
SELECT id FROM descendants
```

Exécuté via `prisma.$queryRaw` — retourne `{ id: string }[]`. Le résultat est passé à `prisma.ticket.findMany({ where: { ticketCategory: { categoryId: { in: ids } } } })`.

---

### 11.5 Service `category.service.ts` — interface complète

```typescript
// Lecture
export async function getTree(includeArchived?: boolean): Promise<CategoryNode[]>
export async function getFlatWithPaths(): Promise<FlatCategoryWithPath[]>

// Écriture (admin)
export async function create(data: CreateCategoryInput): Promise<Category>
export async function update(id: string, data: UpdateCategoryInput): Promise<Category>
export async function archiveWithDescendants(id: string): Promise<{ archived: number }>
export async function restoreWithAncestors(id: string): Promise<{ restored: number }>

// Utilitaires internes
async function getDescendantIds(ids: string[]): Promise<string[]>
function buildTree(flat: Category[], includeArchived: boolean): CategoryNode[]
async function checkCircularReference(id: string, newParentId: string): Promise<void>
```

#### Tree builder (in-memory)

```typescript
function buildTree(flat: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of flat) {
    map.set(cat.id, { ...cat, children: [] });
  }
  for (const cat of flat) {
    const node = map.get(cat.id)!;
    if (cat.parentId) {
      map.get(cat.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
```

Complexité O(n) — suffisant pour un arbre de catégories de taille raisonnable.

#### Détection de référence circulaire

Avant `update(id, { parentId: newParentId })`, vérifier que `newParentId` n'est pas un descendant de `id` (ni `id` lui-même). Utilise la CTE 3 avec `id` comme point de départ, puis vérifie que `newParentId` n'est pas dans le résultat.

```typescript
async function checkCircularReference(id: string, newParentId: string): Promise<void> {
  if (id === newParentId) throw new Error('Circular reference'); // self
  const descendants = await getDescendantIds([id]);
  if (descendants.includes(newParentId)) throw new Error('Circular reference');
}
```

---

### 11.6 Route `categories.ts` — chaîne middleware complète

```
GET  /categories                → [authenticate] → getTree handler
GET  /categories?includeArchived=true → [authenticate, authorize('admin')] → getTree handler
POST /categories                → [authenticate, authorize('admin'), validate(CreateCategorySchema)] → createCategory handler
PUT  /categories/:id            → [authenticate, authorize('admin'), validate(UpdateCategorySchema)] → updateCategory handler
DELETE /categories/:id          → [authenticate, authorize('admin')] → archiveCategory handler
POST /categories/:id/restore    → [authenticate, authorize('admin')] → restoreCategory handler
```

> **Règle** : toutes les routes d'écriture (`POST`, `PUT`, `DELETE`) nécessitent `authorize('admin')`. `GET` est ouvert à tout utilisateur authentifié.

---

### 11.7 `ticket.service.ts` — évolution pour Phase 2

#### Paramètre `categoryIds` remplace `categories`

`getAll(user, statusFilter?, categoryIdsFilter?)` — `categoryIdsFilter` est une liste d'IDs cuid (au lieu de noms). La résolution des descendants est effectuée avant la requête Prisma :

```typescript
export async function getAll(user: AuthUser, statusFilter?: string, categoryIdsFilter?: string) {
  const where: Record<string, any> = {};
  // ... authorId, status (inchangés) ...

  if (categoryIdsFilter) {
    const ids = categoryIdsFilter.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length > 0) {
      // Expand avec tous les descendants
      const allIds = await getDescendantIds(ids);
      where.ticketCategory = { categoryId: { in: allIds } };
    }
  }
  // ...
}
```

> `getDescendantIds` est importé depuis `category.service.ts` ou dupliqué comme utilitaire partagé. Recommandation : exposer depuis `category.service.ts`.

---

### 11.8 Format de réponse Ticket — évolution Phase 2

Le champ `category` passe d'un objet `{ id, name }` à un objet enrichi avec le chemin complet :

```json
{
  "id": "ticket-cuid",
  "title": "...",
  "category": {
    "id": "cuid-leaf",
    "name": "UI Bug",
    "parentId": "cuid-parent",
    "archivedAt": null,
    "path": ["Bug", "UI Bug"]
  }
}
```

> Le champ `path` (tableau des noms depuis la racine) est **calculé côté service** au moment du fetch, via un `include` chaîné sur `parent.parent.parent...` limité à la profondeur anticipée, **ou** calculé client-side depuis l'arbre déjà chargé en store. Recommandation : **calcul client-side** pour éviter le surcoût de requête imbriquée.

**Recommandation architecture breadcrumb** :
- Le store `categories.svelte.ts` charge et met en cache l'arbre au démarrage.
- `TicketCard` reçoit `ticket.category.id` et reconstruit le chemin depuis le store local.
- Pas de champ `path` dans l'API — séparation des responsabilités : données brutes de l'API, présentation dans le store.

---

### 11.9 Architecture Frontend — Phase 2

#### Nouveaux fichiers

```
frontend/src/
├── lib/
│   ├── stores/
│   │   └── categories.svelte.ts  ← NOUVEAU : cache arbre catégories + helpers
│   ├── components/
│   │   ├── CategoryAutocomplete.svelte  ← NOUVEAU : input autocomplete avec paths
│   │   └── (CategoryBreadcrumb intégré dans TicketCard — pas de composant séparé)
└── routes/
    └── admin/
        └── categories/
            └── +page.svelte     ← NOUVEAU : page admin arbre
```

#### Fichiers modifiés

```
frontend/src/lib/
├── api/
│   └── categories.ts   ← MODIFIÉ : + create, update, archive, restore
├── types.ts             ← MODIFIÉ : CategoryNode interface + FlatCategoryWithPath
├── components/
│   ├── TicketForm.svelte      ← MODIFIÉ : CategorySelect → CategoryAutocomplete
│   ├── TicketCard.svelte      ← MODIFIÉ : tag simple → breadcrumb calculé depuis store
│   └── CategoryFilter.svelte  ← MODIFIÉ : noms → IDs, racines uniquement
└── routes/
    └── tickets/+page.svelte   ← MODIFIÉ : passe categoryIds (IDs) au lieu de names
```

#### Store `categories.svelte.ts`

```typescript
// État
let tree = $state<CategoryNode[]>([]);
let flatWithPaths = $derived(flattenWithPaths(tree));

// Helpers
export function getPath(id: string): string[]         // ['Bug', 'UI Bug']
export function getActiveCategories(): FlatCategoryWithPath[]
export function getRoots(): CategoryNode[]

// Chargement
export async function loadCategories(token: string): Promise<void>

// Écriture (admin)
export async function createCategory(...): Promise<void>
export async function updateCategory(...): Promise<void>
export async function archiveCategory(...): Promise<void>
export async function restoreCategory(...): Promise<void>
```

Chargé une fois dans `+layout.svelte` (si authentifié) et disponible dans toutes les pages.

#### Composant `CategoryAutocomplete.svelte`

```typescript
interface Props {
  value: string | null;            // categoryId sélectionné
  onchange: (id: string | null) => void;
}
```

**Algorithme autocomplete (client-side) :**
1. Depuis `flatWithPaths` (store), filtrer sur `path.join(' > ').toLowerCase().includes(query)`
2. Debounce 200ms sur l'input
3. Afficher max 10 résultats avec le chemin complet
4. Option "Aucune catégorie" en tête de liste

#### Route `/admin/categories`

- Guard de navigation : si `user.role !== 'admin'`, redirection vers `/login`
- Chargement de l'arbre complet (`includeArchived=true`) au `onMount`
- Structure de la page :
  - Bouton "Nouvelle catégorie racine" → formulaire inline
  - Arbre récursif avec indentation (composant `CategoryNode` récursif auto-référentiel)
  - Par nœud : boutons Renommer (inline edit), Ajouter sous-catégorie, Déplacer (select parent), Archiver
  - Onglet "Archives" : liste plate des catégories archivées + bouton Restaurer
  - Dialog de confirmation avant archivage (message avec compte des descendants)

---

### 11.10 Types TypeScript — mise à jour Phase 2

```typescript
// frontend/src/lib/types.ts

export interface CategoryNode {
  id: string;
  name: string;
  parentId: string | null;
  archivedAt: string | null;
  children: CategoryNode[];
  createdAt: string;
  updatedAt: string;
}

export interface FlatCategoryWithPath {
  id: string;
  name: string;
  parentId: string | null;
  archivedAt: string | null;
  path: string[];            // ['Bug', 'UI Bug', 'Mobile'] — du plus haut au plus bas
  pathString: string;        // 'Bug > UI Bug > Mobile'
}

export interface Ticket {
  // ... (inchangé)
  category: {
    id: string;
    name: string;
    parentId: string | null;
    archivedAt: string | null;
  } | null;
}
```

---

### 11.11 Flux de données — opérations Phase 2

#### Archiver une catégorie avec cascade

```
Admin clique "Archiver" sur "Bug" (N=3 enfants)
  → CategoryNode.svelte : fetch count descendants → affiche dialog
      "Archiver Bug supprimera aussi ses 3 sous-catégories. Confirmer ?"
  → Confirme → DELETE /categories/:id
      → authenticate + authorize('admin')
      → category.service.archiveWithDescendants(id)
          → prisma.$executeRaw(WITH RECURSIVE ... UPDATE)
          → retourne { archived: 4 }
      → 200 { archived: 4 }
  → Store: reload arbre → UI mise à jour
```

#### Restaurer une catégorie

```
Admin clique "Restaurer" sur "Mobile Bug" (archivée sous "UI Bug" archivée sous "Bug" archivée)
  → POST /categories/:id/restore
      → category.service.restoreWithAncestors(id)
          → prisma.$executeRaw(WITH RECURSIVE ancestors ... UPDATE archivedAt = NULL)
          → "Mobile Bug" + "UI Bug" + "Bug" réactivés
          → retourne { restored: 3 }
      → 200 { restored: 3 }
  → Store: reload arbre
```

#### Filtrer les tickets avec descendants

```
User sélectionne filtre "Bug" (id: cuid-bug)
  → GET /tickets?categoryIds=cuid-bug
      → ticket.service.getAll(user, undefined, 'cuid-bug')
          → category.service.getDescendantIds(['cuid-bug'])
              → prisma.$queryRaw(WITH RECURSIVE ... SELECT id)
              → ['cuid-bug', 'cuid-ui-bug', 'cuid-mobile-bug', ...]
          → prisma.ticket.findMany({ where: { ticketCategory: { categoryId: { in: [...] } } } })
      ← tickets de Bug + tous ses descendants
```

#### Autocomplete dans le formulaire ticket

```
User tape "mobile" dans le sélecteur de catégorie
  → CategoryAutocomplete : flatWithPaths.filter(c => c.pathString.includes('mobile'))
      → résultats : [{ id: 'cuid-mobile', pathString: 'Bug > UI Bug > Mobile', ... }]
  → User sélectionne → categoryId = 'cuid-mobile' émis vers TicketForm
  → Soumission : POST /tickets { ..., categoryId: 'cuid-mobile' }
```

---

### 11.12 Gestion des erreurs — Phase 2

| Code | Cas | Message |
|---|---|---|
| 400 | `name` vide ou hors limites (2–50) | `Validation failed` + détail |
| 400 | `parentId` = catégorie archivée ou inexistante | `Parent category not found or archived` |
| 400 | Référence circulaire | `Circular reference detected` |
| 403 | Non-admin sur route d'écriture | `Forbidden` |
| 404 | Catégorie inexistante | `Category not found` |
| 409 | Nom déjà utilisé (case-insensitive) | `Category name already exists` |

La vérification d'unicité case-insensitive est effectuée avec une requête Prisma utilisant `mode: 'insensitive'` :

```typescript
const existing = await prisma.category.findFirst({
  where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: id } }
});
if (existing) throw Object.assign(new Error('Category name already exists'), { status: 409 });
```

---

### 11.13 Points de vigilance — Phase 2

| # | Point | Risque si ignoré |
|---|---|---|
| 1 | Vérifier la référence circulaire **avant** toute écriture en base | Arbre corrompu (nœud = son propre ancêtre) |
| 2 | Vérifier que `parentId` référence une catégorie **active** (non archivée) | Sous-catégorie orpheline dans un sous-arbre archivé |
| 3 | Les TicketCategory d'une catégorie archivée sont **conservés** (pas de cascade delete) | Historique préservé (attendu), tickets deviennent juste non-filtrables par l'autocomplete |
| 4 | Unicité `name` case-insensitive : utiliser `mode: 'insensitive'` Prisma | Doublons homophones (bug / Bug) |
| 5 | `getDescendantIds` inclut l'ID root lui-même dans le résultat | Filtre tickets correct — le ticket assigné à la catégorie sélectionnée doit apparaître |
| 6 | Guard admin côté frontend sur `/admin/categories` (redirection) ET côté backend (403) | Double protection : sécurité backend + UX frontend |
| 7 | Recharger le store catégories après toute opération CRUD admin | UI stale si le store n'est pas rafraîchi |
| 8 | `prisma db push --accept-data-loss` détruit les données existantes | OK en dev, **interdit en prod** |

---

### 11.14 Ce qui reste hors scope (Phase 2)

- Multi-catégories par ticket (contrainte `@unique` sur `TicketCategory.ticketId` maintenue)
- Drag & drop pour réorganiser l'arbre
- Import/export de la hiérarchie
- Couleurs ou icônes par catégorie
- Déplacement en masse de tickets lors du déplacement d'une catégorie
