## Plan : Sprint 3 — Frontend Core Auth & Navigation

**Goal** : remplacer le stub frontend (Node.js server) par une app SvelteKit 5 complète avec auth store (runes), clients API, auth guard, et pages `/login` + `/register`. À l'issue : flow auth bout-en-bout fonctionnel dans Docker, prêt pour les pages tickets (Sprint 4).

La chaîne de dépendances impose cet ordre strict : bootstrap SvelteKit → state & API clients → routes.

---

**Phase A — Bootstrap SvelteKit (#16)** *(toutes parallélisables)*

1. **A1 — `frontend/package.json`** — remplacer le stub ; deps : `@sveltejs/kit`, `@sveltejs/adapter-node`, `svelte`, `typescript`, `vite` ; scripts : `dev: "vite dev"`, `build: "vite build"`, `preview: "vite preview"`, `start: "node build"`

2. **A2 — `frontend/svelte.config.js`** — `adapter: adapterNode()`, alias `$lib: './src/lib'`

3. **A3 — `frontend/vite.config.ts`** — plugin `sveltekit()`, `server: { host: true, port: 5173 }` (requis pour Docker bind)

4. **A4 — `frontend/tsconfig.json`** — extends `.svelte-kit/tsconfig.json`

5. **A5 — `frontend/src/app.html`** — template HTML SvelteKit standard (`%sveltekit.head%`, `%sveltekit.body%`)

6. **A6 — `frontend/src/app.d.ts`** — déclarations TypeScript SvelteKit standard

7. **A7 — Supprimer `frontend/src/server.js`** — stub obsolète

8. **A8 — Modifier `frontend/Dockerfile` runner stage** — CMD : `node dist/server.js` → `node build` (adapter-node output)

---

**Phase B — State & API clients (#17, #18, #19)** *(dépend de A ; toutes parallélisables entre elles)*

9. **#17 — `frontend/src/lib/stores/auth.svelte.ts`**
   - `$state<string | null>(null)` pour le token JWT
   - `$effect` pour sync localStorage bidirectionnelle (init depuis `localStorage.getItem('token')` ; write on change)
   - Exporte `getToken()`, `setToken(t: string)`, `clearToken()`, et `isAuthenticated` (computed boolean)

10. **#18 — `frontend/src/lib/api/auth.ts`**
    - `const API = 'http://localhost:3000'` (constante partagée)
    - `register(email: string, password: string)` → `POST /auth/register` → retourne le body (user sans password) ou throw l'erreur
    - `login(email: string, password: string)` → `POST /auth/login` → retourne `{ token: string }` ou throw l'erreur

11. **#19 — `frontend/src/lib/api/tickets.ts`**
    - Même constante `API`
    - Fonctions CRUD : `getAll(token, status?)`, `getOne(token, id)`, `create(token, data)`, `update(token, id, data)`, `remove(token, id)`
    - Toutes injectent `Authorization: Bearer <token>` dans les headers

---

**Phase C — Routes (#20, #21, #22)** *(dépend de B1 = auth store et B2 = auth API)*

12. **#20 — `frontend/src/routes/+layout.svelte`**
    - `onMount` : si pas de token ET `$page.url.pathname` ≠ `/login` et ≠ `/register` → `goto('/login')`
    - Wraps `<slot />` (ou `{@render children()}` Svelte 5)

13. **#21 — `frontend/src/routes/+page.svelte`**
    - Page de transition : `onMount` → token présent → `goto('/tickets')`, sinon `goto('/login')`

14. **#22 — `frontend/src/routes/login/+page.svelte`** (#21 sprint)
    - Formulaire email + password
    - Submit : `authApi.login(email, password)` → `setToken(token)` + `goto('/tickets')`
    - Validation inline : password ≥ 8 chars avant envoi
    - Affichage erreur API (401 → "Identifiants invalides")
    - Lien vers `/register`

15. **#23 — `frontend/src/routes/register/+page.svelte`** (#22 sprint)
    - Formulaire email + password
    - Submit : `authApi.register(email, password)` → `goto('/login')`
    - Gère erreur 409 (email déjà pris → message inline)
    - Lien vers `/login`

---

**Fichiers à créer** (11) + **modifier** (2) + **supprimer** (1)

| Fichier | Action | Phase |
|---------|--------|-------|
| `frontend/package.json` | Modifier | A1 |
| `frontend/svelte.config.js` | Créer | A2 |
| `frontend/vite.config.ts` | Créer | A3 |
| `frontend/tsconfig.json` | Créer | A4 |
| `frontend/src/app.html` | Créer | A5 |
| `frontend/src/app.d.ts` | Créer | A6 |
| `frontend/src/server.js` | Supprimer | A7 |
| `frontend/Dockerfile` | Modifier (runner CMD) | A8 |
| `frontend/src/lib/stores/auth.svelte.ts` | Créer | B/#17 |
| `frontend/src/lib/api/auth.ts` | Créer | B/#18 |
| `frontend/src/lib/api/tickets.ts` | Créer | B/#19 |
| `frontend/src/routes/+layout.svelte` | Créer | C/#20 |
| `frontend/src/routes/+page.svelte` | Créer | C/transition |
| `frontend/src/routes/login/+page.svelte` | Créer | C/#21 |
| `frontend/src/routes/register/+page.svelte` | Créer | C/#22 |

---

**Décisions**
- **API URL** : constante `http://localhost:3000` hardcodée dans `lib/api/` — pas d'env var (évite la complexité `$env/static/public` vs `$env/dynamic/public` pour un POC local)
- **Adapter** : `@sveltejs/adapter-node` (compatible Docker runner, `CMD ["node", "build"]`)
- **Auth guard** : client-side via `onMount` dans `+layout.svelte` — pas de `load` server-side (pas de SSR data en Sprint 3)
- **Svelte 5 runes** : `$state` + `$effect` dans un module `.svelte.ts` (pas de stores Svelte 4 legacy)
- **Token storage** : `localStorage` (POC) — pas de `httpOnly` cookie en scope
- **Out of scope** : composants `TicketCard`, `TicketForm`, `StatusFilter` et pages `/tickets`, `/tickets/new`, `/tickets/[id]/edit` → Sprint 4

**Verification**
1. `docker compose build frontend` → exit 0
2. `docker compose up frontend` → log `Local:   http://localhost:5173/`
3. `curl -s http://localhost:5173` → réponse HTML SvelteKit
4. Navigation `/login` → formulaire email + password visible
5. Register `test@test.com` / `password123` → POST 201 → redirect `/login`
6. Login avec ces creds → token dans `localStorage`, redirect `/tickets` (page vide, Sprint 4)
7. Accès `/tickets` sans token (localStorage vide) → redirect `/login`
8. Accès `/login` et `/register` sans token → aucun redirect infini
