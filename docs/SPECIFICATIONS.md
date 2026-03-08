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

Modification de l'endpoint existant :

| Méthode | Route | Changement |
|---|---|---|
| POST | `/tickets` | Accepte `categoryId` optionnel |
| PUT | `/tickets/:id` | Accepte `categoryId` optionnel (passer `null` pour retirer la catégorie) |
| GET | `/tickets` | Accepte `categories` : liste de noms séparés par virgule (ex. `?categories=Bug,Feature`) |

### Filtrage combiné — règles

- `GET /tickets?status=open&categories=Bug,Feature`
- **ET logique** : les deux filtres s'appliquent simultanément.
- `categories` : un ou plusieurs noms de catégories séparés par virgule.
- `status` et `categories` sont chacun optionnels (comportement existant préservé si `categories` absent).
- Les tickets **sans catégorie** n'apparaissent pas dans les résultats quand un filtre catégorie est actif.

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

### Comportements UI
- Redirection `/login` si non authentifié
- Filtre statut : boutons `Tous` / `Open` / `In Progress` / `Closed`
- **Filtre catégorie : boutons multi-sélection `Tous` / `Bug` / `Feature` / `Question` / `Support`** (combinable avec filtre statut)
- **Catégorie affichée comme tag coloré dans la liste des tickets** (absent si non définie)
- **Sélecteur de catégorie** dans les formulaires création et édition (champ optionnel, option vide = "Aucune")
- Messages d'erreur inline, confirmation de succès
- Pas de pagination

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

---

## Hors scope

- Refresh token
- Gestion des utilisateurs dans l'UI
- Pagination
- Notifications temps réel
- Pièces jointes
- Création / modification / suppression de catégories (Phase 1 : liste fixe seedée)
- Multi-catégories par ticket (Phase 2)

---

## Roadmap catégories

| Phase | Description |
|---|---|
| **Phase 1** (actuelle) | Catégories prédéfinies, 1 par ticket via table de liaison, filtre multi-sélection |
| **Phase 2** | Catégories libres (CRUD admin), plusieurs catégories par ticket (suppression de la contrainte `@unique` sur `TicketCategory.ticketId`) |
- Priorité / date d'échéance
- Environnement de production distinct