## Plan : Sprint 4 — Frontend Ticket Pages

**Goal** : compléter l'UI frontend avec les composants partagés (TicketCard, TicketForm, StatusFilter) et les trois routes tickets (/tickets, /tickets/new, /tickets/[id]/edit), avec tests companions. Sprint 3 a livré auth pages + tests ; Sprint 4 clôt le scope fonctionnel défini dans SPECIFICATIONS.md.

La chaîne de dépendances impose cet ordre : composants partagés → routes → tests.

---

**Phase A — Composants partagés** *(A1–A3 parallélisables)*

1. **A1 — `src/lib/components/TicketCard.svelte`**
   - Props : `ticket: Ticket` (type depuis `lib/api/tickets.ts`), `currentUserId: string`, `isAdmin: boolean`
   - Affiche : titre, extrait description, badge statut color-coded, `createdAt`
   - Lien « Edit » vers `/tickets/[id]/edit` (visible si `currentUserId === ticket.authorId || isAdmin`)
   - Bouton « Delete » (même condition) → émet event Svelte 5 `ondelete` — le parent gère l'UI optimiste

2. **A2 — `src/lib/components/TicketForm.svelte`**
   - Props : `initialValues?: Partial<Ticket>`, `isAdmin: boolean`, `loading: boolean`
   - Champs : `title` (3–100 chars), `description` (10–1000 chars), `status` select (admin uniquement)
   - Validation client-side miroir des règles Zod backend
   - Émet event `onsubmit` avec les données du formulaire

3. **A3 — `src/lib/components/StatusFilter.svelte`**
   - Props : `value: string | undefined`, `onchange`
   - Boutons toggle : All | Open | In Progress | Closed
   - Valeurs API : `undefined` (all), `open`, `in-progress`, `closed` — jamais `in_progress`

---

**Phase B — Routes tickets** *(dépendent de Phase A + auth store/API client existants)*

4. **B4 — `src/routes/tickets/+page.ts`**
   - Auth guard : redirect vers `/login` si pas de token dans le store
   - Retourne `{ token, user }` pour la page

5. **B5 — `src/routes/tickets/+page.svelte`** *(dépend B4, A1, A3)*
   - Fetch `ticketsApi.getAll({ status })` au montage et au changement de filtre
   - Rend `StatusFilter` + liste de `TicketCard`
   - Delete : suppression optimiste + appel `ticketsApi.delete(id)`, restauration sur erreur
   - Lien « New Ticket » → `/tickets/new`

6. **B6 — `src/routes/tickets/new/+page.ts`**
   - Auth guard redirect vers `/login`

7. **B7 — `src/routes/tickets/new/+page.svelte`** *(dépend B6, A2)*
   - Rend `TicketForm` sans `initialValues`
   - `isAdmin` dérivé de `authStore.user.role === 'admin'`
   - Sur submit : `ticketsApi.create(data)` → redirect vers `/tickets` en cas de succès

8. **B8 — `src/routes/tickets/[id]/edit/+page.ts`**
   - Auth guard redirect vers `/login`
   - Fetch ticket par `params.id` via `ticketsApi.getOne(id)` ; retourne `{ ticket, token, user }`

9. **B9 — `src/routes/tickets/[id]/edit/+page.svelte`** *(dépend B8, A2)*
   - Rend `TicketForm` avec `initialValues` depuis le ticket chargé
   - `isAdmin` dérivé du store — admin voit le champ statut, user ne le voit pas
   - Sur submit : `ticketsApi.update(id, data)` → redirect vers `/tickets` en cas de succès
   - Affiche l'erreur API (403, etc.) inline

---

**Phase C — Tests** *(dépendent de Phase A + B, tous parallélisables)*

10. **C10 — `src/lib/components/__tests__/TicketCard.test.ts`**
    - Rend titre, badge statut, lien edit, bouton delete
    - Lien/bouton masqués pour un non-propriétaire non-admin
    - Clic delete émet l'event avec l'id du ticket

11. **C11 — `src/lib/components/__tests__/TicketForm.test.ts`**
    - Champ statut absent si `isAdmin = false`, présent si `isAdmin = true`
    - Erreurs de validation affichées inline
    - Submit émet les données correctes (title, description, status si admin)

12. **C12 — `src/lib/components/__tests__/StatusFilter.test.ts`**
    - Tous les boutons rendus (All, Open, In Progress, Closed)
    - Clic émet la valeur API correcte (`in-progress`, pas `in_progress`)

13. **C13 — `src/routes/tickets/__tests__/tickets.test.ts`**
    - Liste rendue après fetch mocké
    - Changement de filtre déclenche un nouveau fetch avec le bon paramètre `status`
    - Delete retire la carte avec mise à jour optimiste

14. **C14 — `src/routes/tickets/new/__tests__/new.test.ts`**
    - Formulaire rendu
    - Submit appelle `ticketsApi.create` avec les bonnes données
    - Redirect vers `/tickets` après succès

15. **C15 — `src/routes/tickets/[id]/edit/__tests__/edit.test.ts`**
    - Formulaire pré-rempli avec les données du ticket chargé
    - Champ statut visible pour admin, masqué pour user
    - Submit appelle `ticketsApi.update(id, data)`

---

**Fichiers à créer** (15) + **modifier** (0)

| Fichier | Action | Phase |
|---------|--------|-------|
| `frontend/src/lib/components/TicketCard.svelte` | Créer | A1 |
| `frontend/src/lib/components/TicketForm.svelte` | Créer | A2 |
| `frontend/src/lib/components/StatusFilter.svelte` | Créer | A3 |
| `frontend/src/routes/tickets/+page.ts` | Créer | B4 |
| `frontend/src/routes/tickets/+page.svelte` | Créer | B5 |
| `frontend/src/routes/tickets/new/+page.ts` | Créer | B6 |
| `frontend/src/routes/tickets/new/+page.svelte` | Créer | B7 |
| `frontend/src/routes/tickets/[id]/edit/+page.ts` | Créer | B8 |
| `frontend/src/routes/tickets/[id]/edit/+page.svelte` | Créer | B9 |
| `frontend/src/lib/components/__tests__/TicketCard.test.ts` | Créer | C10 |
| `frontend/src/lib/components/__tests__/TicketForm.test.ts` | Créer | C11 |
| `frontend/src/lib/components/__tests__/StatusFilter.test.ts` | Créer | C12 |
| `frontend/src/routes/tickets/__tests__/tickets.test.ts` | Créer | C13 |
| `frontend/src/routes/tickets/new/__tests__/new.test.ts` | Créer | C14 |
| `frontend/src/routes/tickets/[id]/edit/__tests__/edit.test.ts` | Créer | C15 |

---

**Fichiers existants à réutiliser (sans modification)**
- `frontend/src/lib/api/tickets.ts` — client API + type `Ticket` à importer dans les composants
- `frontend/src/lib/stores/auth.svelte.ts` — `token`, `user` (Svelte 5 runes) pour guards et `isAdmin`
- `frontend/src/routes/+layout.svelte` — pattern auth guard à reproduire dans les load functions
- `frontend/src/routes/login/+page.svelte` — pattern formulaire + appel API + redirect à réutiliser
- `frontend/src/lib/api/__tests__/tickets.test.ts` — pattern mock fetch à reproduire dans les tests Phase C

---

**Décisions**
- Auth guard dans les load functions `+page.ts` (pas dans chaque composant) — cohérent avec le `+layout.svelte` existant
- `isAdmin` toujours dérivé de `authStore.user.role === 'admin'` — jamais depuis les données du ticket
- Mapping statut : valeur API `in-progress` (trait d'union), label UI « In Progress » — jamais `in_progress`
- Fetch client-side uniquement — pas de `+page.server.ts` — cohérent avec le mode CSR adapter-node déjà en place
- Erreur 403 du backend sur ownership : affichée inline, pas de redirect silencieux
- Suppression optimiste : la carte disparaît immédiatement, restaurée si l'API retourne une erreur

**Hors scope**
- Pagination (SPECIFICATIONS.md hors scope)
- Mises à jour temps réel
- Gestion des utilisateurs dans l'UI
- Pièces jointes, priorité, dates d'échéance
- Refresh token

---

**Verification**
1. `npm run test` dans `frontend/` → 0 échec (toutes les suites passent, y compris les 6 nouvelles)
2. `npm run test:coverage` → rapport de couverture généré avec succès
3. `docker compose up` → `http://localhost:5173/tickets` redirige vers `/login` sans token
4. Login `user` → liste ses tickets uniquement, formulaire création sans champ statut, formulaire édition sans champ statut
5. Login `admin` → liste tous les tickets, formulaire édition avec dropdown statut (open / in-progress / closed)
6. `user` navigue vers `/tickets/[id-autre-user]/edit` → la sauvegarde retourne 403 du backend, UI affiche l'erreur
