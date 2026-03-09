# Sprint Plan — Ticket Manager POC

> Basé sur [SPECIFICATIONS.md](../../docs/SPECIFICATIONS.md) et [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
> Vélocité cible : **20 points par sprint** | Points estimés avec la suite de Fibonacci (1, 2, 3, 5, 8)

---

## 1. Scope Summary

### MVP (must ship)
- Authentification JWT (register / login / logout)
- CRUD tickets avec RBAC strict (`user` = ses tickets, `admin` = tous)
- Changement de statut réservé à l'admin
- Filtrage par statut côté frontend
- Stack Docker Compose opérationnelle (`docker compose up`)

### Hors scope (itération courante)
- Refresh token
- Pagination
- Gestion des utilisateurs dans l'UI
- Notifications temps réel / pièces jointes
- Priorité / date d'échéance
- Environnement de production distinct

---

## 2. Backlog

| # | Tâche | Composant | SP | Priorité | Dépend de |
|---|-------|-----------|----|----------|-----------|
| 1 | Setup Docker Compose + `.env` / `.env.example` + health checks | Infra | 3 | Critical | — |
| 2 | Dockerfile backend (multi-stage, non-root) | Infra | 2 | Critical | — |
| 3 | Dockerfile frontend (multi-stage, non-root) | Infra | 2 | Critical | — |
| 4 | Init backend (Node.js 20 + TypeScript + Express 5 + Prisma + Zod + JWT + bcrypt) | Backend | 3 | Critical | #1 |
| 5 | Module config (variables d'env typées via Zod) | Backend | 1 | Critical | #4 |
| 6 | Schéma Prisma (User, Ticket, enums) + migration initiale | Backend | 2 | Critical | #4 |
| 7 | Seed — compte admin par défaut (`npm run seed`) | Backend | 2 | High | #6 |
| 8 | Validators Zod — auth (register, login) | Backend | 1 | Critical | #4 |
| 9 | Validators Zod — ticket (create, update) | Backend | 2 | High | #4 |
| 10 | Auth service (register + bcrypt, login + JWT 24h) | Backend | 3 | Critical | #6, #8 |
| 11 | Middleware `authenticate` (JWT → `req.user`) | Backend | 2 | Critical | #10 |
| 12 | Middleware `authorize` (RBAC role check) | Backend | 2 | Critical | #11 |
| 13 | Auth routes (`POST /auth/register`, `POST /auth/login`) + bootstrap `app.ts` | Backend | 3 | Critical | #10, #11 |
| 14 | Ticket service (CRUD, ownership, RBAC, mapping `in_progress` ↔ `in-progress`) | Backend | 5 | High | #6, #9, #12 |
| 15 | Ticket routes (5 endpoints complets) | Backend | 3 | High | #11, #12, #14 |
| 16 | Init frontend (SvelteKit + Svelte 5 + TypeScript) | Frontend | 2 | Critical | #1 |
| 17 | Auth store (Svelte 5 runes : `$state` user + token + persistance localStorage) | Frontend | 3 | High | #16 |
| 18 | API client auth (`register()`, `login()`) | Frontend | 2 | High | #17 |
| 19 | API client tickets (`getTickets()`, `createTicket()`, `updateTicket()`, `deleteTicket()`) | Frontend | 3 | High | #17 |
| 20 | Layout racine + auth guard (redirection `/login` si non authentifié) | Frontend | 3 | High | #17, #18 |
| 21 | Page `/login` | Frontend | 3 | High | #18, #20 |
| 22 | Page `/register` | Frontend | 2 | High | #18, #20 |
| 23 | Composant `TicketCard` | Frontend | 2 | High | #19 |
| 24 | Composant `TicketForm` (create / edit, validation inline) | Frontend | 3 | High | #19 |
| 25 | Composant `StatusFilter` (Tous / Open / In Progress / Closed) | Frontend | 2 | Medium | #19 |
| 26 | Page `/tickets` — liste + filtre par statut | Frontend | 5 | High | #23, #25 |
| 27 | Page `/tickets/new` — création | Frontend | 3 | High | #24 |
| 28 | Page `/tickets/:id/edit` — modification (masque statut si `user`) | Frontend | 3 | High | #24 |
| 29 | Migration Prisma — `Category` + `TicketCategory` junction table | Backend | 2 | High | #6 |
| 30 | Seed — catégories prédéfinies (Bug, Feature, Improvement, Question, Documentation, Security, Performance) | Backend | 1 | High | #29 |
| 31 | Validator Zod — ticket avec optionnel `categoryId` | Backend | 1 | High | #9 |
| 32 | Ticket service — CRUD avec gestion categoryId + filtrage multi-catégories (`?categories=id1,id2`) | Backend | 5 | High | #14, #31, #29 |
| 33 | Ticket routes — modifier `GET /tickets` pour accepter query param multi-catégories | Backend | 2 | High | #15, #32 |
| 34 | Composant `CategoryTag` — affiche catégorie comme tag dans les tickets | Frontend | 2 | High | #23 |
| 35 | Composant `CategorySelect` — dropdown/select pour catégories dans `TicketForm` | Frontend | 2 | High | #24 |
| 36 | Composant `CategoryFilter` — filtre multi-sélection par catégories (intégré dans liste) | Frontend | 3 | High | #25, #33 |

**Total : 88 points — 5 sprints**

---

## 3. Sprint Plan

### Sprint 1 — Infrastructure & Fondations Backend
**Goal** : La stack Docker démarre (`docker compose up`), la base de données est prête, le backend compile.

| # | Tâche | SP |
|---|-------|----|
| 1 | Docker Compose + `.env` / `.env.example` + health checks | 3 |
| 2 | Dockerfile backend (multi-stage, non-root) | 2 |
| 3 | Dockerfile frontend (multi-stage, non-root) | 2 |
| 4 | Init backend (Node.js + TS + Express + Prisma + Zod + JWT + bcrypt) | 3 |
| 5 | Module config (env typées) | 1 |
| 6 | Schéma Prisma + migration initiale | 2 |
| 7 | Seed admin | 2 |
| 8 | Validators Zod — auth | 1 |
| 9 | Validators Zod — ticket | 2 |

**Total : 18 points**
**Outcome** : `docker compose up` lance les 3 services ; la DB est migrée et seedée ; les validators compilent.

---

### Sprint 2 — API Backend Complète
**Goal** : Tous les endpoints API sont fonctionnels avec RBAC complet et testables via cURL / Postman.

| # | Tâche | SP |
|---|-------|----|
| 10 | Auth service (register + login) | 3 |
| 11 | Middleware `authenticate` | 2 |
| 12 | Middleware `authorize` | 2 |
| 13 | Auth routes + `app.ts` bootstrap | 3 |
| 14 | Ticket service (CRUD + RBAC) | 5 |
| 15 | Ticket routes (5 endpoints) | 3 |

**Total : 18 points**
**Outcome** : API complète — register, login, CRUD tickets, 401/403 fonctionnels, `?status=` filter opérationnel.

---

### Sprint 3 — Frontend Core (Auth + Navigation)
**Goal** : L'application frontend permet de s'inscrire, se connecter, et navigue en protégeant les routes.

| # | Tâche | SP |
|---|-------|----|
| 16 | Init frontend (SvelteKit + Svelte 5 + TS) | 2 |
| 17 | Auth store (runes + localStorage) | 3 |
| 18 | API client auth | 2 |
| 19 | API client tickets | 3 |
| 20 | Layout + auth guard | 3 |
| 21 | Page `/login` | 3 |
| 22 | Page `/register` | 2 |

**Total : 18 points**
**Outcome** : Login, register et déconnexion fonctionnels ; redirection automatique selon état auth ; token JWT stocké.

---

### Sprint 4 — Frontend Tickets & Intégration complète
**Goal** : Application complète — toutes les user stories couvertes, stack intégrée end-to-end.

| # | Tâche | SP |
|---|-------|----|
| 23 | Composant `TicketCard` | 2 |
| 24 | Composant `TicketForm` | 3 |
| 25 | Composant `StatusFilter` | 2 |
| 26 | Page `/tickets` (liste + filtre) | 5 |
| 27 | Page `/tickets/new` | 3 |
| 28 | Page `/tickets/:id/edit` | 3 |

**Total : 18 points**
**Outcome** : Toutes les user stories US-01 à US-13 sont couvertes. Demo end-to-end possible.

---

### Sprint 5 — Catégories (Phase 1)
**Goal** : Les tickets supportent une catégorie optionnelle ; filtrage multi-catégories opérationnel ; UI complète.

| # | Tâche | SP |
|---|-------|----|
| 29 | Prisma migration + seed catégories | 2 |
| 30 | Seed — catégories prédéfinies | 1 |
| 31 | Validator ticket avec categoryId | 1 |
| 32 | Ticket service + filtrage multi-catégories | 5 |
| 33 | Routes — GET /tickets avec query param catégories | 2 |
| 34 | Composant `CategoryTag` dans TicketCard | 2 |
| 35 | Composant `CategorySelect` dans TicketForm | 2 |
| 36 | Composant `CategoryFilter` multi-sélection | 3 |

**Total : 18 points**
**Outcome** : Catégories complètement intégrées ; filtrage multi-catégories fonctionnel ; UI harmonieuse avec statut filter.

---

## 4. Dependency Graph — Chemin critique

```
#1 (Docker Compose)
  ├─► #4 (Init backend)
  │     ├─► #5 (Config)
  │     ├─► #6 (Prisma schema) ─► #7 (Seed) ─► #29 (Category migration) ─► #30 (Category seed)
  │     ├─► #8 (Zod auth)      ─► #10 (Auth service)
  │     └─► #9 (Zod ticket) ─► #31 (Zod + category)
  │                                  ├─► #11 (Middleware auth)
  │                                  │     └─► #12 (Middleware authorize)
  │                                  │           ├─► #13 (Auth routes + app.ts)
  │                                  │           └─► #14 (Ticket service) ─► #32 (Service + filter)
  │                                  │                                          ├─► #33 (Routes)
  │                                  │                                          └─► #15 (Ticket routes)
  └─► #16 (Init frontend)
        └─► #17 (Auth store)
              ├─► #18 (API client auth) ─► #21 (Login) ─► #26 (Tickets list) ─► #34 (CategoryTag)
              ├─► #19 (API client tickets)               ─► #27 (New ticket)   ─► #35 (CategorySelect)
              └─► #20 (Layout + guard)                   └─► #28 (Edit ticket) ──► #36 (CategoryFilter)
```

**Chemin critique** : `#6 → #10 → #11 → #12 → #14 → #15` (backend) en parallèle de `#17 → #19 → #26` (frontend) → `#29 → #32 → #33` (catégories backend) en parallèle de `#34 / #35 / #36` (catégories frontend)

---

## 5. Risks & Blockers

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Prisma `in_progress` vs API `in-progress` (mapping enum) | Moyenne | Fort | Coder la conversion dès le ticket service (#14) ; tester dès le sprint 2 |
| JWT non propagé correctement au frontend (CORS, headers) | Moyenne | Fort | Configurer CORS dans `app.ts` dès #13 ; valider avec le login (#21) en sprint 3 |
| Hot reload Docker en dev (bind mounts) | Basse | Moyen | Valider le bind mount au sprint 1 ; documenter dans `.env.example` |
| Svelte 5 runes — comportement réactif différent de Svelte 4 | Basse | Moyen | S'appuyer uniquement sur `$state` / `$derived` / `$effect` ; éviter les stores legacy |
| Seed non rejoué si la DB est déjà initialisée | Basse | Faible | Utiliser `upsert` dans le seed pour idempotence |
| Sprint 4 chargé (18pts, beaucoup de pages UI) | Moyenne | Moyen | Prioriser #26 (liste tickets) — c'est la page centrale ; #27 et #28 peuvent être mutualisés via `TicketForm` |
| Filtrage multi-catégories — performance lors de requêtes avec beaucoup de catégories | Basse | Moyen | Index Prisma sur `TicketCategory(categoryId, ticketId)` ; tester avec 100+ tickets |
| CategoryFilter — synchronisation avec StatusFilter dans l'UI | Basse | Moyen | Tester les combinaisons status + catégories ; stocker les 2 états indépendamment |

---

## 6. Sprint 5 — Handoff to software-engineer

### Sprint de démarrage pour catégories : **Sprint 5** (après Sprint 4)

### Premières 3 tâches à implémenter (dans l'ordre) :

1. **#29 — Migration Prisma — `Category` + `TicketCategory`**
   - Table `Category` : `id` (cuid), `name` (unique, string), `color` (optionnel)
   - Catégories prédéfinies : Bug, Feature, Improvement, Question, Documentation, Security, Performance
   - Table jonction `TicketCategory` : `ticketId` (FK), `categoryId` (FK), unique(ticketId, categoryId) — **optionnel : un ticket peut avoir 0 ou 1 catégorie**

2. **#30 — Seed des catégories**
   - Insérer les 7 catégories prédéfinies via `prisma db seed` (ou dans le même script seed)

3. **#32 — Ticket service — intégration catégories + filtrage multi**
   - Modifier `createTicket()` et `updateTicket()` pour accepter optionnel `categoryId`
   - Implémenter `getTickets(filters)` avec support pour `categories=id1,id2,id3` (filtrer tickets ayant **une** des catégories)
   - Valider que le filtrage retourne les tickets avec la catégorie demandée

### Clarifications pour Sprint 5

- Une catégorie par ticket (via jonction, pas de FK direct)
- Catégories optionnelles — les tickets existants continuent sans catégories
- Filtrage : inclure tickets ayant **l'une des** catégories sélectionnées (OR logic)
- Pas de gestion/création de catégories via l'API — seed uniquement
- Phase 1 : pas de couleur ni métadonnées supplémentaires (extensible ultérieurement)

---

## Handoff — Sprints 1–4 (MVP core)

### Sprint de démarrage : **Sprint 1**

### Premières 3 tâches à implémenter (dans l'ordre) :

1. **#1 — Docker Compose + `.env`**
   - Services : `backend` (port 3000), `frontend` (port 5173), `db` (PostgreSQL 16, port 5432)
   - Health checks sur `db` et `backend`
   - `restart: unless-stopped` sur `backend` et `db`
   - `.env.example` avec `DATABASE_URL`, `JWT_SECRET`, `PORT`

2. **#2 et #3 — Dockerfiles** (parallélisables)
   - Multi-stage (`builder` → `runner`), utilisateur non-root
   - Backend : `npm run build` → `node dist/app.js`
   - Frontend : `npm run build` → serve via adapter-node ou nginx léger

3. **#4 — Init backend**
   - `npm init`, `tsconfig.json`, dossier `src/` selon l'arborescence de l'architecture
   - Dépendances : `express`, `@types/express`, `prisma`, `@prisma/client`, `zod`, `jsonwebtoken`, `bcrypt`, `dotenv`
   - Scripts `package.json` : `dev`, `build`, `start`, `seed`

### Clarifications résolues (aucune bloquante — MVP Sprints 1–4)
- Mapping enum Prisma : `in_progress` ↔ `in-progress` géré dans `ticket.service.ts`
- Rôle `admin` créé uniquement via seed, pas via l'API d'inscription
- Pas de pagination, pas de refresh token — hors scope confirmé
