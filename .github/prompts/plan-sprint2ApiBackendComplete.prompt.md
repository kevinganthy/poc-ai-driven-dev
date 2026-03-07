## Plan : Sprint 2 — API Backend Complète

**Goal** : tous les endpoints API fonctionnels, RBAC complet, testables via cURL/Postman.

La chaîne de dépendances impose cet ordre strict : fondations partagées → auth → tickets.

---

**Phase A — Fondations partagées** *(toutes parallélisables)*

1. **A1 — `src/lib/prisma.ts`** — singleton `PrismaClient` exporté (évite les instances multiples en dev avec le hot reload)

2. **A2 — `src/types/express.d.ts`** — extension du type `Request` d'Express avec `user?: { id: string, email: string, role: 'user' | 'admin' }`

3. **A3 — `src/middleware/validate.ts`** — factory `validate(schema: ZodSchema)` → middleware qui parse `req.body`, retourne `400 { error, details }` si invalide

4. **A4 — mise à jour `src/validators/ticket.validator.ts`** — changer l'enum `status` de `in_progress` vers `in-progress` (valeur API-facing) ; la conversion vers `in_progress` Prisma se fera dans le service

---

**Phase B — Auth** *(dépend de A1, A2)*

5. **#10 — `src/services/auth.service.ts`** *(dépend A1)*
   - `register(email, password)` → bcrypt hash (10 rounds), `prisma.user.create`, retourne user sans password
   - `login(email, password)` → bcrypt.compare, `jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '24h' })`, retourne token

6. **#11 — `src/middleware/authenticate.ts`** *(dépend A2)*
   - Extrait `Authorization: Bearer <token>`, vérifie avec `jwt.verify`
   - Positionne `req.user = { id, email, role }` ou retourne `401 { error: "Unauthorized" }`

7. **#12 — `src/middleware/authorize.ts`** *(dépend A2)*
   - `authorize(role: Role)` → vérifie `req.user?.role === role`, sinon `403 { error: "Forbidden" }`
   - Prévu pour usage futur ; Sprint 2 gère le RBAC tickets au niveau service (data-level)

8. **#13 — `src/routes/auth.ts`** *(dépend #10, A3)*
   - `POST /auth/register` : `validate(registerSchema)` → `authService.register` → 201
   - `POST /auth/login` : `validate(loginSchema)` → `authService.login` → 200 `{ token }`

9. **Mise à jour `src/app.ts`** *(dépend #11, #13)*
   - Ajouter `cors({ origin: '*' })` (dev), monter `/auth` et `/tickets`

---

**Phase C — Tickets** *(dépend de B2 = #11)*

10. **#14 — `src/services/ticket.service.ts`** *(dépend A1, A4)*
    - `getAll(user)` → filtre `authorId` si `user.role === 'user'`, sinon tous ; `?status` filtre optionnel
    - `getOne(id, user)` → ownership check, sinon 403
    - `create(data, user)` → `authorId = user.id`, status forcé à `open`
    - `update(id, data, user)` → si `data.status` présent && `user.role !== 'admin'` → 403 immédiat ; ownership check puis update
    - `delete(id, user)` → ownership check, sinon 403
    - Mapping : `in-progress` → `in_progress` (écriture), `in_progress` → `in-progress` (lecture)

11. **#15 — `src/routes/tickets.ts`** *(dépend #11, #14, A3)*
    - Tous les endpoints protégés par `authenticate`
    - `GET /tickets`, `POST /tickets`, `GET /tickets/:id`, `PUT /tickets/:id`, `DELETE /tickets/:id`
    - `POST` + `PUT` passent par `validate(createTicketSchema)` / `validate(updateTicketSchema)`

---

**Fichiers à créer** (9) + **modifier** (2)

| Fichier | Action | Phase |
|---------|--------|-------|
| `backend/src/lib/prisma.ts` | Créer | A1 |
| `backend/src/types/express.d.ts` | Créer | A2 |
| `backend/src/middleware/validate.ts` | Créer | A3 |
| `backend/src/validators/ticket.validator.ts` | Modifier | A4 |
| `backend/src/services/auth.service.ts` | Créer | B/#10 |
| `backend/src/middleware/authenticate.ts` | Créer | B/#11 |
| `backend/src/middleware/authorize.ts` | Créer | B/#12 |
| `backend/src/routes/auth.ts` | Créer | B/#13 |
| `backend/src/app.ts` | Modifier | B/bootstrap |
| `backend/src/services/ticket.service.ts` | Créer | C/#14 |
| `backend/src/routes/tickets.ts` | Créer | C/#15 |

---

**Décisions**
- `cors` : `*` en dev ; pas de configuration prod en scope
- `authorize(role)` implémenté mais non appliqué sur les routes tickets (RBAC data-level dans le service)
- `PrismaClient` singleton dans `lib/prisma.ts` uniquement — jamais instancié ailleurs
- Erreur 404 vs 403 sur ownership : on retourne **403** (pas de fuite d'existence)
- `req.user` est typé `Required` dans les handlers après `authenticate` (cast dans les routes)

**Verification**
1. `POST /auth/register` valide → 201, user sans champ `password` dans la réponse
2. `POST /auth/login` → 200 + `{ token }` JWT décodable
3. `GET /tickets` sans token → 401
4. `user` : `PUT /tickets/:id` avec `{ status: "in-progress" }` → 403
5. `user` : `GET /tickets` → ne voit que ses propres tickets
6. `admin` : `GET /tickets` → voit tous les tickets
7. `user` : `DELETE /tickets/:id` d'un autre → 403
8. `npx tsc --noEmit` → 0 erreur
