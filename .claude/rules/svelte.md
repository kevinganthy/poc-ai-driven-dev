---
paths:
  - "**/*.svelte"
---

# Svelte 5 Conventions

## Runes — Règles de base

- **`$state`** pour toute variable réactive locale (champs de formulaire, listes, flags).
  ```svelte
  let email = $state('');
  let tickets = $state<Ticket[]>([]);
  let loading = $state(false);
  ```
- **`$derived`** pour les valeurs calculées à partir d'autres états — jamais de variable manuelle à resynchroniser.
  ```ts
  const canManage = $derived(isAdmin || ticket.authorId === currentUserId);
  ```
- **`$props()`** pour déstructurer les props avec une interface TypeScript explicite (voir section Props).
- **`$effect`** uniquement pour les effets de bord vrais (DOM, timers, abonnements externes). Préférer `onMount` pour les initialisations one-shot.
- **`untrack()`** pour initialiser un `$state` à partir d'une prop sans créer de dépendance réactive :
  ```ts
  let title = $state(untrack(() => initialValues?.title ?? ''));
  ```

## Props

Toujours déclarer une interface `Props` explicite et typer la déstructuration :

```svelte
<script lang="ts">
  import type { Ticket } from '$lib/types.ts';

  interface Props {
    ticket: Ticket;
    currentUserId: string;
    isAdmin: boolean;
    ondelete: (id: string) => void;
  }

  const { ticket, currentUserId, isAdmin, ondelete }: Props = $props();
</script>
```

- Les callbacks sont des props typées (`onsubmit`, `ondelete`, `onchange`) — pas d'`EventDispatcher`.
- Utiliser `import type` pour les types purs.

## Gestion des événements

- **Formulaires** : `onsubmit={handleSubmit}` avec `e.preventDefault()` dans le handler.
- **Boutons** : `onclick={() => callback(value)}` directement inline si simple, sinon nommer le handler.
- **Propagation** : l'enfant appelle le callback reçu en prop (`ondelete(ticket.id)`), le parent gère l'état.

```svelte
<form onsubmit={handleSubmit}>...</form>
<button onclick={() => ondelete(ticket.id)}>Delete</button>
```

## Liaisons (`bind:`)

- `bind:value` sur `<input>`, `<textarea>`, `<select>` pour les formulaires contrôlés.
- Ne pas utiliser `bind:value` sur des composants enfants — passer valeur + callback à la place.

## Rendu conditionnel et boucles

```svelte
{#if loading}
  <p>Chargement...</p>
{:else if error}
  <p class="error">{error}</p>
{:else if items.length === 0}
  <p>Aucun résultat.</p>
{:else}
  <!-- contenu -->
{/if}

{#each tickets as ticket (ticket.id)}
  <TicketCard {ticket} />
{/each}
```

- Toujours fournir une **clé** dans `{#each}` : `(item.id)`.
- Ternaires inline uniquement pour les cas simples : `{loading ? 'Chargement…' : 'Envoyer'}`.

## Patterns async et cycle de vie

- Utiliser `onMount(async () => { ... })` pour la récupération de données initiale et la protection de routes.
- Pattern standard pour les pages :

```ts
onMount(async () => {
  const token = getToken();
  if (!token) { goto('/login'); return; }

  loading = true;
  try {
    tickets = await getAll(token);
  } catch (err: unknown) {
    const e = err as { error?: string };
    error = e.error ?? 'Une erreur est survenue.';
  } finally {
    loading = false;
  }
});
```

- Toujours typer `err` dans `catch` : `(err: unknown)` puis caster.
- Toujours passer dans le bloc `finally` pour remettre `loading = false`.

## Gestion d'erreur optimiste (rollback)

```ts
async function handleDelete(id: string) {
  const prev = tickets;
  tickets = tickets.filter((t) => t.id !== id); // mise à jour optimiste
  try {
    await remove(token, id);
  } catch {
    tickets = prev; // rollback
  }
}
```

## Architecture des composants

| Couche | Rôle |
|--------|------|
| `routes/+page.svelte` | Orchestration : state, fetch, navigation |
| `lib/components/*.svelte` | UI pure : reçoit des props, émet via callbacks |
| `lib/stores/*.svelte.ts` | État partagé module-level (`$state` hors composant) |
| `lib/api/*.ts` | Appels réseau purs (pas dans les composants) |

## Stores (`lib/stores/*.svelte.ts`)

- État réactif déclaré au niveau module avec `$state`.
- Interface publique via fonctions exportées (pas d'accès direct à la variable `_`).

```ts
// auth.svelte.ts
let _token = $state<string | null>(
  typeof window !== 'undefined' ? localStorage.getItem('token') : null
);

export function getToken() { return _token; }
export function setToken(t: string) { _token = t; localStorage.setItem('token', t); }
export function clearToken() { _token = null; localStorage.removeItem('token'); }
```

## Navigation

```ts
import { goto } from '$app/navigation';
import { page } from '$app/stores';

goto('/tickets');          // redirection programmatique
$page.params.id            // paramètre de route dynamique
$page.url.pathname         // chemin courant
```

## Classes CSS dynamiques

```svelte
<button class:active={value === filter.value}>...</button>
<span class="badge status-{ticket.status}">...</span>
```

## Formulaires réutilisables

- Un composant formulaire accepte `initialValues?: Partial<T>` pour le mode édition.
- Initialiser les champs avec `untrack()` pour éviter les dépendances réactives non voulues.
- Valider champ par champ, stocker les erreurs dans des variables `let xxxError = $state('')`.
- Émettre via `onsubmit(data)` — le parent gère l'appel API et la navigation.

## Anti-patterns à éviter

- ❌ `createEventDispatcher()` — remplacé par les callbacks en props Svelte 5.
- ❌ `$store` (syntaxe auto-subscription) — utiliser les fonctions du store.
- ❌ `$effect` pour charger des données — utiliser `onMount`.
- ❌ Accès à `localStorage` directement dans un composant — passer par `auth.svelte.ts`.
- ❌ Mutation d'un objet `$state` imbriqué sans réassignation — toujours réassigner pour déclencher la réactivité.
- ❌ Logique métier dans les composants UI — déléguer aux `lib/api/` et `lib/stores/`.
- ❌ `{#each}` sans clé — risque de problèmes de DOM diffing.
