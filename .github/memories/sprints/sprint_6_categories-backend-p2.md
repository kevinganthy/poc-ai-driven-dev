# Sprint 6 — Catégories Backend Phase 2

**Date de début**: 2026-03-09  
**Date de fin prévue**: 2026-03-16  
**Date de clôture**: —  
**Status**: 🟡 En cours  
**Vélocité cible**: 26 points  
**Vélocité réelle**: —  
**Agents impliqués**: software-engineer, test-engineer, code-reviewer

---

## Objectif

Implémenter la couche backend complète de la Phase 2 des catégories : migration du schéma Prisma vers une hiérarchie dynamique (self-relation + soft delete), CRUD admin avec règles métier (unicité case-insensitive, référence circulaire, parent actif), archivage en cascade et restauration remontante via CTEs récursives PostgreSQL, et filtre tickets par IDs avec expansion automatique des descendants.

---

## Backlog du Sprint

| # | Tâche | Composant | SP | Statut | Notes |
|---|-------|-----------|----|---------|----|
| 37 | Migrer schema Prisma : Category (cuid + parentId + archivedAt + updatedAt) + TicketCategory.categoryId String | Backend/DB | 3 | ⬜ Todo | `prisma db push --accept-data-loss` — destructif sur Category + TicketCategory |
| 38 | seed.ts : 7 catégories racines cuid, upsert idempotent | Backend/DB | 1 | ⬜ Todo | Dépend de #37 |
| 39 | Validators Zod : CreateCategorySchema + UpdateCategorySchema | Backend | 2 | ⬜ Todo | Dépend de #37 |
| 40 | `category.service` : getTree() + buildTree() in-memory O(n) | Backend | 2 | ⬜ Todo | Dépend de #37 — retourne CategoryNode[] nested |
| 41 | `category.service` : getDescendantIds(ids[]) via CTE récursive PostgreSQL | Backend | 3 | ⬜ Todo | Dépend de #37 — `prisma.$queryRaw` WITH RECURSIVE |
| 42 | `category.service` : create() + update() + checkCircularReference() | Backend | 5 | ⬜ Todo | Dépend de #39 #41 — unicité case-insensitive (409), parent actif (400), circulaire (400) |
| 43 | `category.service` : archiveWithDescendants() + restoreWithAncestors() via CTEs | Backend | 5 | ⬜ Todo | Dépend de #41 — `prisma.$executeRaw` + retourner count |
| 44 | `categories.ts` routes : GET étendu + POST + PUT + DELETE + POST /:id/restore | Backend | 3 | ⬜ Todo | Dépend de #40 #42 #43 — authorize('admin') sur toutes les routes d'écriture |
| 45 | `ticket.service` : paramètre categoryIds (cuid) + expansion descendants | Backend | 2 | ⬜ Todo | Dépend de #41 — remplace parsing par noms, expansion avant findMany |

**Total**: 26 points

**Légende** : ⬜ Todo · 🔄 In Progress · ✅ Done · 🔴 Blocked · ❌ Cancelled

---

## Décisions prises

| Date | Décision | Raison |
|------|----------|--------|
| 2026-03-09 | CTEs récursives via `prisma.$executeRaw` / `$queryRaw` | Atomicité + performance O(n) — évite N+1 multi-requêtes applicatives |
| 2026-03-09 | Tree builder in-memory (Map O(n)) | Suffisant pour un POC, évite requêtes `include` imbriquées |
| 2026-03-09 | `prisma db push --accept-data-loss` pour la migration dev | Int → String non rétrocompatible, données dev jetables |
| 2026-03-09 | `getDescendantIds` exporté depuis `category.service.ts` | Réutilisé par `ticket.service.ts` pour le filtre par descendants |
| 2026-03-09 | Contrainte `@unique` sur `TicketCategory.ticketId` maintenue | Multi-catégories hors scope Phase 2 |

---

## Artefacts à créer/modifier

### Backend
- ⬜ `backend/prisma/schema.prisma` — Migration Category + TicketCategory
- ⬜ `backend/prisma/seed.ts` — 7 racines cuid, upsert idempotent
- ⬜ `backend/src/validators/category.validator.ts` — CreateCategorySchema + UpdateCategorySchema
- ⬜ `backend/src/services/category.service.ts` — Réécriture complète
- ⬜ `backend/src/routes/categories.ts` — Extension CRUD + restore
- ⬜ `backend/src/services/ticket.service.ts` — Paramètre categoryIds + expansion

---

## Problèmes & Blocages

### Ouverts
_Aucun._

### Résolus
_Aucun._

---

## Log d'activité

_Aucune activité enregistrée._

---

## Contexte de reprise (pour les agents)

**Prochaine tâche** :  
Tâche #37 — Migrer le schéma Prisma : `Category.id` de `Int @default(autoincrement())` → `String @id @default(cuid())`, ajouter `parentId String?`, `archivedAt DateTime?`, `updatedAt DateTime @updatedAt`, la self-relation `CategoryTree`, et changer `TicketCategory.categoryId` de `Int` en `String`.

**Fichiers de départ** :
- `backend/prisma/schema.prisma` (tâche #37 — démarrer ici)
- `backend/prisma/seed.ts` (tâche #38 — après schema)
- `backend/src/validators/category.validator.ts` (tâche #39)
- `backend/src/services/category.service.ts` (tâches #40, #41, #42, #43)
- `backend/src/routes/categories.ts` (tâche #44)
- `backend/src/services/ticket.service.ts` (tâche #45)

**Prérequis** :  
Aucun — démarrage immédiat possible.

**Commandes utiles** :
```bash
# Après modification schema.prisma
cd backend && npx prisma generate
npx prisma db push --accept-data-loss
npm run seed

# Tests backend
npm test

# Stack complète
cd .. && docker compose up --build
```

**Points d'attention** :
- `prisma db push --accept-data-loss` est **destructif** sur les tables Category et TicketCategory — les données existantes de dev sont perdues, reseedées ensuite
- CTEs via `prisma.$executeRaw` / `$queryRaw` — ne pas utiliser `prisma.category.update` pour les opérations en cascade
- Unicité `name` case-insensitive : utiliser `mode: 'insensitive'` dans les requêtes Prisma
- `getDescendantIds` doit inclure l'ID racine lui-même dans le résultat
- `restoreWithAncestors` ne restaure PAS les descendants — seuls la cible + ses ancêtres
- Route `POST /categories/:id/restore` : s'assurer que le pattern de route est monté correctement pour éviter conflit avec `/:id`

**Références** :
- `docs/ARCHITECTURE.md` sections 11.2 à 11.8 — schéma cible, CTEs exactes, signatures de service
- `docs/SPECIFICATIONS.md` section "Endpoints API — catégories (Phase 2)" — règles de validation et codes d'erreur
