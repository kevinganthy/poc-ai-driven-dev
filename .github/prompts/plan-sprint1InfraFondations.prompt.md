## Plan : Sprint 1 — Infrastructure & Fondations

Le workspace est vide. Ce sprint pose toutes les fondations pour que `docker compose up` lance les 3 services avec une DB migrée et seedée.

---

**Phase A — Infra Docker** *(tâches #1, #2, #3)*
*(#2 et #3 parallélisables après #1)*

1. **#1 — `compose.yml` + `.env` / `.env.example`**
   - 3 services : `backend` (port 3000), `frontend` (port 5173), `db` (postgres:16-alpine, port 5432)
   - health check `pg_isready` sur `db` ; `backend` depends_on `db` (condition: healthy)
   - `restart: unless-stopped` sur `backend` et `db`
   - bind mounts sur `./backend/src` et `./frontend/src` pour le hot reload dev
   - `.env.example` expose : `DATABASE_URL`, `JWT_SECRET`, `PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

2. **#2 — `backend/Dockerfile`** *(après #1)*
   - Stage `builder` : `node:20-alpine`, npm ci, tsc, `npx prisma generate`
   - Stage `runner` : `node:20-alpine`, utilisateur non-root, `CMD node dist/app.js`

3. **#3 — `frontend/Dockerfile`** *(après #1, parallèle avec #2)*
   - Stage `builder` : npm ci + npm run build
   - Stage `runner` : non-root, stub suffisant pour que compose up ne plante pas (init complet = tâche #16 en S3)

---

**Phase B — Backend Scaffold** *(tâches #4 → puis #5, #6, #7, #8, #9)*
*(#5–#9 parallélisables entre eux après #4)*

4. **#4 — Init backend** *(dépend de #1)*
   - Arborescence exacte de ARCHITECTURE.md section 4.1
   - `package.json` avec scripts : `dev` (ts-node-dev), `build` (tsc), `start`, `seed`
   - Dépendances : `express@5`, `zod`, `jsonwebtoken`, `bcrypt`, `@prisma/client`, `prisma`, `dotenv` + types
   - `backend/src/app.ts` : stub Express (juste `app.listen`)

5. **#5 — `src/config/env.ts`** *(dépend de #4)*
   - Zod schema qui valide `DATABASE_URL`, `JWT_SECRET`, `PORT` au démarrage → export `env` typé

6. **#6 — `prisma/schema.prisma` + migration initiale** *(dépend de #4)*
   - Modèles `User` et `Ticket` tels que définis dans ARCHITECTURE.md section 4.4
   - Enums `Role` (user, admin), `TicketStatus` (open, in_progress, closed)
   - `npx prisma migrate dev --name init`

7. **#7 — `prisma/seed.ts`** *(dépend de #6)*
   - `upsert` admin (idempotent) — email + password bcrypt-haché + role admin
   - `npm run seed` dans la CI et au premier `docker compose up`

8. **#8 — `src/validators/auth.validator.ts`** *(dépend de #4)*
   - `registerSchema` : `{ email: z.string().email(), password: z.string().min(8) }`
   - `loginSchema` : même structure

9. **#9 — `src/validators/ticket.validator.ts`** *(dépend de #4)*
   - `createTicketSchema` : title (3–100), description (10–1000)
   - `updateTicketSchema` : partial + `status` optionnel (enum, modifiable admin only — vérifié en S2 dans le service)

---

**Fichiers à créer**

| Fichier | Tâche |
|---------|-------|
| `compose.yml` | #1 |
| `.env.example` | #1 |
| `backend/Dockerfile` | #2 |
| `frontend/Dockerfile` | #3 (stub) |
| `backend/package.json` | #4 |
| `backend/tsconfig.json` | #4 |
| `backend/src/app.ts` | #4 |
| `backend/src/config/env.ts` | #5 |
| `backend/prisma/schema.prisma` | #6 |
| `backend/prisma/seed.ts` | #7 |
| `backend/src/validators/auth.validator.ts` | #8 |
| `backend/src/validators/ticket.validator.ts` | #9 |

---

**Verification**
1. `docker compose up` → 3 containers UP, `db` healthy, aucune erreur de compilation
2. `docker compose logs backend` → TypeScript compile sans erreur
3. DB connectée → tables `User` et `Ticket` présentes (via `npx prisma studio` ou psql)
4. `npm run seed` idempotent : 2 appels consécutifs ne créent pas de doublon admin
5. Import des validators dans Node → aucune exception Zod

---

**Décisions**
- Mapping `in_progress` ↔ `in-progress` : pris en charge dans `ticket.service.ts` (Sprint 2), les validators utilisent les valeurs brutes Prisma
- `admin` créé uniquement via seed — l'API `/auth/register` ne peut créer que des `user`
- `.env` de dev n'est **pas** commité — seul `.env.example` l'est
- Le `frontend/Dockerfile` en S1 est un stub minimal (le vrai init SvelteKit se fait en tâche #16, Sprint 3)
