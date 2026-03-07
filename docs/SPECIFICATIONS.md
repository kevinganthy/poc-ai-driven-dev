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

### Validation Backend
- Titre : 3–100 caractères
- Description : 10–1000 caractères
- Email : format valide, unique
- Mot de passe : min. 8 caractères
- Statut : enum strict, modifiable par `admin` uniquement

---

## Frontend (Svelte 5)

### Pages

| Route | Accès | Description |
|---|---|---|
| `/login` | Public | Connexion |
| `/register` | Public | Inscription |
| `/tickets` | Authentifié | Liste + filtre par statut |
| `/tickets/new` | Authentifié | Création |
| `/tickets/:id/edit` | Authentifié | Modification |

### Comportements UI
- Redirection `/login` si non authentifié
- Filtre : boutons `Tous` / `Open` / `In Progress` / `Closed`
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

---

## Hors scope

- Refresh token
- Gestion des utilisateurs dans l'UI
- Pagination
- Notifications temps réel
- Pièces jointes
- Priorité / date d'échéance
- Environnement de production distinct