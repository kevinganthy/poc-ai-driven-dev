# Ticket Manager — POC

Application de gestion de tickets (POC) : workflow full-stack Node.js / Svelte / PostgreSQL / Docker.

---

## User Stories

### Authentification
- **US-01** — Connexion avec email + mot de passe.
- **US-02** — Inscription (email + mot de passe) ; rôle `user` par défaut.
- **US-03** — Déconnexion.

### Gestion des tickets (rôle `user`)
- **US-04** — Créer un ticket (titre, description) ; statut `open` automatique, auteur = compte connecté.
- **US-05** — Voir uniquement ses propres tickets.
- **US-06** — Modifier le titre et la description de ses tickets.
- **US-07** — Supprimer ses propres tickets.
- **US-08** — Ne peut **pas** changer le statut (réservé à l'admin).

### Gestion des tickets (rôle `admin`)
- **US-09** — Voir tous les tickets de tous les utilisateurs.
- **US-10** — Modifier n'importe quel ticket (titre, description, statut).
- **US-11** — Supprimer n'importe quel ticket.
- **US-12** — Changer le statut : `open` | `in-progress` | `closed`.

### Filtrage
- **US-13** — Filtrer les tickets par statut (un à la fois, ou tous).
- **US-17** — Filtrer les tickets par une ou plusieurs catégories simultanément.
- **US-18** — Combiner le filtre statut et le filtre catégorie(s) (ET logique).

### Catégories (Phase 1)
- **US-14** — Créer un ticket avec une catégorie optionnelle (sélecteur parmi les valeurs prédéfinies).
- **US-15** — Modifier la catégorie d'un ticket (mêmes droits que titre/description : owner sur ses tickets, admin sur tous).
- **US-16** — Voir la catégorie d'un ticket sous forme de tag dans la liste et le formulaire d'édition.

### Gestion des catégories (Phase 2)
- **US-19** — En tant qu'admin, créer une catégorie racine ou sous-catégorie (parent optionnel) afin d'organiser les catégories hiérarchiquement.
- **US-20** — En tant qu'admin, renommer une catégorie existante.
- **US-21** — En tant qu'admin, déplacer une catégorie (changer son parent) afin de réorganiser l'arbre.
- **US-22** — En tant qu'admin, archiver une catégorie (soft delete) avec cascade automatique sur tous ses descendants afin de retirer des catégories obsolètes sans perdre l'historique des tickets.
- **US-23** — En tant qu'admin, restaurer une catégorie archivée (la catégorie + tous ses ancêtres sont réactivés) depuis l'onglet Archives.
- **US-24** — En tant qu'utilisateur/admin, assigner une catégorie à un ticket via un champ de recherche autocomplete (affichant le chemin complet : Bug > UI Bug).
- **US-25** — En tant qu'utilisateur/admin, voir le chemin complet de la catégorie (breadcrumb) sur la carte ticket (ex. Bug > UI Bug).
- **US-26** — En tant qu'utilisateur/admin, filtrer les tickets par une catégorie parente et voir tous les tickets de ses sous-catégories inclus dans les résultats.
- **US-27** — En tant qu'admin, accéder à une page dédiée `/admin/categories` pour gérer l'arbre de catégories (créer, renommer, déplacer, archiver, restaurer).

---

## Specifications techniques

### Entite Ticket

| Champ | Type | Contraintes |
|---|---|---|
| `id` | UUID | PK, auto-generé |
| `title` | string | Requis, 3–100 caractères |
| `description` | string | Requis, 10–1000 caractères |
| `status` | enum | `open` \| `in-progress` \| `closed` — défaut : `open` |
| `authorId` | UUID | FK users.id, issu du token JWT |
| `createdAt` | timestamp | Auto |
| `updatedAt` | timestamp | Auto |

### Entite Category (Phase 1)

| Champ | Type | Contraintes |
|---|---|---|
| `id` | cuid | PK, auto-generé |
| `name` | enum | `Bug` \| `Feature` \| `Question` \| `Support` — unique |
| `createdAt` | timestamp | Auto |

- Liste **prédéfinie et fixe** — seedée au démarrage, aucun endpoint de création/modification/suppression.
- 4 valeurs : `Bug`, `Feature`, `Question`, `Support`.

### Entite TicketCategory — table de liaison (Phase 1)

| Champ | Type | Contraintes |
|---|---|---|
| `ticketId` | cuid | FK Ticket.id, **unique** (contrainte Phase 1 : max 1 catégorie par ticket) |
| `categoryId` | cuid | FK Category.id |

- Contrainte `@unique` sur `ticketId` : garantit qu'un ticket ne peut avoir qu'une seule catégorie en Phase 1.
- Structure anticipant la Phase 2 (suppression de `@unique` pour passer en many-to-many).

### Entite Category (Phase 2 — gestion dynamique + hiérarchie)

| Champ | Type | Contraintes |
|---|---|---|
| `id` | String (cuid) | PK, auto-généré — **migration depuis Int autoincrement** |
| `name` | String | Requis, 2–50 caractères, **globalement unique (case-insensitive)** |
| `parentId` | String? | FK Category.id — null = catégorie racine |
| `archivedAt` | DateTime? | null = active, non-null = archivée (soft delete) |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

Self-relation Prisma nommée `CategoryTree` :
```prisma
model Category {
  id         String     @id @default(cuid())
  name       String     @unique
  parent     Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  parentId   String?
  children   Category[] @relation("CategoryTree")
  archivedAt DateTime?
  ticketCategories TicketCategory[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
}
```

**Règles métier :**
- Profondeur illimitée (arbre complet).
- Un ticket peut être assigné à n'importe quel nœud (parent ou feuille).
- Archivage = soft delete, cascade automatique sur **tous les descendants**.
- Restauration d'une catégorie = réactivation + réactivation de **tous les ancêtres**.
- Les descendants cascade-archivés **ne sont pas** auto-restaurés (restauration individuelle).
- Interdiction de créer une référence circulaire (un nœud ne peut pas devenir son propre ancêtre).
- Un ticket archivé ne disparaît **pas** des filtres — il reste visible marqué `archivée`.
- **Les catégories archivées ne sont plus sélectionnables** dans les formulaires ticket.

### Entite TicketCategory — Phase 2 (inchangée, sauf type de `categoryId`)

| Champ | Type | Contraintes |
|---|---|---|
| `ticketId` | String | FK Ticket.id, `@unique` — 1 catégorie max par ticket |
| `categoryId` | String | FK Category.id — **migration depuis Int** |

- La contrainte `@unique` sur `ticketId` est **maintenue** (multi-catégories hors scope).
- En cas d'archivage d'une catégorie, les `TicketCategory` existants sont **conservés** (pas de cascade delete).

### Migration des données

- Les 7 catégories existantes (Bug, Feature, Improvement, Question, Documentation, Security, Performance) sont conservées comme catégories racines (`parentId = null`).
- Leurs IDs passent de `Int autoincrement` à `String cuid` — migration Prisma requise.
- Les liaisons `TicketCategory.categoryId` sont migrées en conséquence.

### Entite User

| Champ | Type | Contraintes |
|---|---|---|
| `id` | UUID | PK, auto-generé |
| `email` | string | Requis, unique, format valide |
| `password` | string | Requis, hashé bcrypt |
| `role` | enum | `user` \| `admin` — défaut : `user` |
| `createdAt` | timestamp | Auto |

### Authentification
- JWT, expiration 24h, sans refresh token
- Compte `admin` initial via seed (`npm run seed`)
- Inscription publique = rôle `user` uniquement

### RBAC
- Middleware dédié, jamais inline dans les routes
- `user` : CRUD sur ses tickets uniquement (filtre `authorId`)
- `admin` : CRUD sur tous les tickets + changement de statut
- **Catégorie** : mêmes droits que titre/description — `user` sur ses propres tickets, `admin` sur tous

### Validation Backend
- Titre : 3–100 caractères
- Description : 10–1000 caractères
- Email : format valide, unique
- Mot de passe : min. 8 caractères
- Statut : enum strict, modifiable par `admin` uniquement
- **Catégorie** : valeur optionnelle, doit appartenir à l'enum `CategoryName` si fournie (`Bug | Feature | Question | Support`)

### Endpoints API — catégories (Phase 1)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/categories` | Oui | Lister les catégories disponibles (pour alimenter les selects UI) |

### Endpoints API — catégories (Phase 2)

| Méthode | Route | Auth | Rôle | Description |
|---|---|---|---|---|
| GET | `/categories` | Oui | any | Arbre des catégories actives (nested tree) |
| GET | `/categories?includeArchived=true` | Oui | admin | Arbre complet incluant les catégories archivées |
| POST | `/categories` | Oui | admin | Créer une catégorie (racine ou enfant) |
| PUT | `/categories/:id` | Oui | admin | Modifier le nom et/ou le parent |
| DELETE | `/categories/:id` | Oui | admin | Archiver (soft delete) + cascade descendants |
| POST | `/categories/:id/restore` | Oui | admin | Restaurer + réactiver tous les ancêtres |

**Format de réponse `GET /categories` :**
```json
[
  {
    "id": "cuid1",
    "name": "Bug",
    "parentId": null,
    "archivedAt": null,
    "children": [
      {
        "id": "cuid2",
        "name": "UI Bug",
        "parentId": "cuid1",
        "archivedAt": null,
        "children": []
      }
    ]
  }
]
```

**Corps `POST /categories` :**
```json
{ "name": "UI Bug", "parentId": "cuid1" }
```
`parentId` est optionnel (null = catégorie racine).

**Corps `PUT /categories/:id` :**
```json
{ "name": "Bug Reports", "parentId": "newParentId" }
```
Tous les champs sont optionnels (PATCH sémantique via PUT).

**Règles de validation :**
- `name` : 2–50 caractères, unique globalement (case-insensitive) → 409 si doublon
- `parentId` doit référencer une catégorie active (non archivée) → 400 si archivée ou inexistante
- Interdiction de référence circulaire (`parentId` = self ou descendant) → 400
- Non-admin → 403 sur toutes les routes d'écriture

Modification de l'endpoint existant :

| Méthode | Route | Changement |
|---|---|---|
| POST | `/tickets` | Accepte `categoryId` optionnel |
| PUT | `/tickets/:id` | Accepte `categoryId` optionnel (passer `null` pour retirer la catégorie) |
| GET | `/tickets` | Accepte `categories` : liste de noms séparés par virgule (ex. `?categories=Bug,Feature`) |

**Évolution Phase 2 :**

| Méthode | Route | Changement |
|---|---|---|
| GET | `/tickets` | Paramètre `categories` renommé `categoryIds` : liste d'IDs cuid séparés par virgule (ex. `?categoryIds=cuid1,cuid2`) — chaque ID inclut automatiquement tous ses descendants |

### Filtrage combiné — règles

- `GET /tickets?status=open&categories=Bug,Feature`
- **ET logique** : les deux filtres s'appliquent simultanément.
- `categories` : un ou plusieurs noms de catégories séparés par virgule.
- `status` et `categories` sont chacun optionnels (comportement existant préservé si `categories` absent).
- Les tickets **sans catégorie** n'apparaissent pas dans les résultats quand un filtre catégorie est actif.

**Filtrage Phase 2 — règles étendues :**

- `GET /tickets?status=open&categoryIds=cuid1,cuid2`
- `categoryIds` remplace `categories` (IDs à la place des noms).
- **Inclusion des descendants** : sélectionner l'ID d'une catégorie parente inclut automatiquement tous les tickets assignés à ses sous-catégories (requête récursive backend).
- **OU logique** entre les IDs sélectionnés (chacun avec ses descendants).
- **ET logique** avec `status` si les deux filtres sont présents.
- Les tickets sans catégorie n'apparaissent pas quand `categoryIds` est actif.
- Les catégories archivées peuvent être utilisées comme filtre (pour retrouver d'anciens tickets).

---

## Frontend (Svelte 5)

### Pages

| Route | Accès | Description |
|---|---|---|
| `/login` | Public | Connexion |
| `/register` | Public | Inscription |
| `/tickets` | Authentifié | Liste + filtre par statut **+ filtre par catégorie(s)** |
| `/tickets/new` | Authentifié | Création **+ sélecteur de catégorie optionnel** |
| `/tickets/:id/edit` | Authentifié | Modification **+ sélecteur de catégorie** |
| `/admin/categories` | Admin uniquement | Gestion de l'arbre de catégories (Phase 2) |

### Comportements UI
- Redirection `/login` si non authentifié
- Filtre statut : boutons `Tous` / `Open` / `In Progress` / `Closed`
- **Filtre catégorie : boutons multi-sélection `Tous` / `Bug` / `Feature` / `Question` / `Support`** (combinable avec filtre statut)
- **Catégorie affichée comme tag coloré dans la liste des tickets** (absent si non définie)
- **Sélecteur de catégorie** dans les formulaires création et édition (champ optionnel, option vide = "Aucune")
- Messages d'erreur inline, confirmation de succès
- Pas de pagination

### Comportements UI — Phase 2

**Autocomplete catégorie (ticket form) :**
- Champ texte avec liste déroulante dynamique.
- Filtrage en temps réel — cherche dans le nom ET dans le chemin complet (ex: taper "ux" trouve "Bug > UI Bug").
- Chaque résultat affiche le chemin complet : `Bug > UI Bug`.
- Seules les catégories **actives** (non archivées) sont proposées.
- Option "Aucune" pour retirer la catégorie du ticket.

**Tag catégorie sur les cartes ticket :**
- Affiche le **chemin complet** (breadcrumb) : `Bug > UI Bug > Mobile`.
- Si la catégorie est archivée, afficher en style grisé avec mention `(archivée)`.

**Filtre catégorie sur la liste des tickets :**
- Filtre multi-sélection : boutons représentant les catégories **racines actives**.
- Cliquer sur un parent filtre par lui **ET ses descendants** (inclusif).
- Les catégories archivées restent visibles dans le filtre, marquées `archivée`.

**Page `/admin/categories` :**
- Vue en arbre des catégories actives avec indentation visuelle.
- Par nœud : bouton **Ajouter sous-catégorie**, **Renommer**, **Déplacer** (sélecteur de nouveau parent), **Archiver**.
- Bouton **Nouvelle catégorie racine** en haut de page.
- Onglet **Archives** : liste des catégories archivées avec bouton **Restaurer**.
- Confirmation requise avant archivage (message : "Archiver X supprimera aussi ses N sous-catégories. Confirmer ?").
- Accès réservé à l'admin — redirection 403/login sinon.

---

## Infrastructure
- Docker Compose : services `backend`, `frontend`, `db` (PostgreSQL)
- Hot reload en dev (bind mounts)
- Seed admin au démarrage
- `.env` + `.env.example` commité

---

## Criteres d'acceptation

- [ ] `user` ne peut pas voir les tickets d'un autre (403)
- [ ] `user` ne peut pas changer le statut (403)
- [ ] `admin` peut tout voir, modifier, supprimer
- [ ] Token invalide/expiré → 401
- [ ] Erreurs de validation → 400 avec détails
- [ ] `docker compose up` démarre toute la stack sans config manuelle
- [ ] **`GET /categories` retourne les 4 catégories prédéfinies**
- [ ] **Créer un ticket sans catégorie est possible (champ optionnel)**
- [ ] **Assigner une catégorie invalide → 400**
- [ ] **`user` ne peut pas changer la catégorie d'un ticket dont il n'est pas l'auteur → 403**
- [ ] **Filtre `?categories=Bug` ne retourne que les tickets de catégorie Bug**
- [ ] **Filtre `?categories=Bug,Feature` retourne les tickets Bug OU Feature**
- [ ] **Filtre combiné `?status=open&categories=Bug` retourne uniquement les tickets open ET Bug**
- [ ] **Les tickets sans catégorie n'apparaissent pas quand un filtre catégorie est actif**
- [ ] **La catégorie apparaît comme tag dans la liste des tickets**
- [ ] **Le sélecteur de catégorie est présent dans les formulaires création et édition**

**Phase 2 — Gestion des catégories :**
- [ ] Non-admin ne peut pas accéder aux routes d'écriture de `/categories` → 403
- [ ] Créer une catégorie racine : `POST /categories {name: "Bug Reports"}` → 201 avec id cuid
- [ ] Créer une sous-catégorie : `POST /categories {name: "UI Bug", parentId: "..."}` → 201
- [ ] Nom vide ou > 50 chars → 400
- [ ] Nom déjà existant (case-insensitive) → 409
- [ ] `parentId` référençant une catégorie archivée → 400
- [ ] Référence circulaire (`parentId` = self ou descendant) → 400
- [ ] Renommer : `PUT /categories/:id {name: "Bug Reports"}` → 200
- [ ] Déplacer : `PUT /categories/:id {parentId: "newParentId"}` → 200
- [ ] Archiver une catégorie sans enfants : `DELETE /categories/:id` → 200, `archivedAt` non null
- [ ] Archiver une catégorie avec N descendants → tous archivés en cascade
- [ ] Les catégories archivées n'apparaissent **pas** dans l'autocomplete du formulaire ticket
- [ ] Les catégories archivées apparaissent dans le filtre de la liste tickets (marquées "archivée")
- [ ] Restaurer : `POST /categories/:id/restore` → 200, `archivedAt` = null
- [ ] Restaurer une sous-catégorie réactive aussi tous ses ancêtres
- [ ] `GET /categories` retourne un arbre nested (active uniquement par défaut)
- [ ] `GET /categories?includeArchived=true` (admin) retourne l'arbre complet
- [ ] Filtre `?categoryIds=cuid1` inclut les tickets des sous-catégories de cuid1
- [ ] La catégorie s'affiche en breadcrumb complet sur la carte ticket (Bug > UI Bug)
- [ ] L'autocomplete filtre en temps réel sur le nom ET le chemin complet
- [ ] Confirmation requise avant archivage d'une catégorie avec sous-catégories
- [ ] Les 7 catégories existantes migrées comme racines (parentId = null)
- [ ] Accès `/admin/categories` refusé aux non-admins → redirection login

---

## Hors scope

- Refresh token
- Gestion des utilisateurs dans l'UI
- Pagination
- Notifications temps réel
- Pièces jointes
- Multi-catégories par ticket (hors scope définitif — contrainte `@unique` maintenue)
- Drag & drop pour réorganiser l'arbre de catégories
- Import/export de la hiérarchie de catégories
- Couleurs ou icônes personnalisées par catégorie

---

## Roadmap catégories

| Phase | Statut | Description |
|---|---|---|
| **Phase 1** | ✅ Livré | Catégories prédéfinies (7 valeurs seedées), 1 par ticket via table de liaison, filtre multi-sélection |
| **Phase 2** | 🚧 En cours | CRUD admin, hiérarchie illimitée (self-relation), soft delete avec cascade, autocomplete, breadcrumb |

- Priorité / date d'échéance
- Environnement de production distinct

---

## Assumptions Phase 2

> À valider avec le client avant démarrage du sprint.

1. La migration `Int → String (cuid)` sur `Category.id` est acceptée (nécessite un reset des données en dev ou une migration manuelle).
2. Les 7 catégories actuellement seedées restent actives et deviennent des catégories racines — aucune n'est supprimée.
3. L'autocomplete côté frontend charge l'arbre complet au chargement de la page (pas de recherche server-side) — acceptable pour un POC avec < 1000 catégories.
4. Le filtre "descendants inclus" est calculé par le backend via une requête récursive (CTE PostgreSQL ou résolution applicative).
5. Il n'y a pas de limite de profondeur imposée par le système — à documenter dans l'UI si l'arbre devient très profond.
6. L'onglet Archives de la page admin affiche une liste plate (pas un arbre) des catégories archivées.