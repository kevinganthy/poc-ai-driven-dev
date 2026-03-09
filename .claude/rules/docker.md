---
paths:
  - "**/Dockerfile"
  - "**/Dockerfile.*"
  - "**/compose.yml"
  - "**/docker-compose.yml"
---

# Docker & Docker Compose Conventions

## Principes généraux

* **Docker Compose est l'environnement de dev unifié** — tout développement se fait via `docker compose up`, jamais via l'installation locale des runtimes.
* Chaque service possède un Dockerfile **multi-stage** obligatoire : `development`, `builder`, et `runner`.
* Les images de base doivent être précises et légères (ex : `node:20-alpine`).

---

## Dockerfiles — Structure multi-stage & Cache

### Stages requis

Pour maximiser la vitesse de build, on utilise les **BuildKit cache mounts** pour le gestionnaire de paquets.

| Stage | Rôle |
| --- | --- |
| `development` | Environnement de développement avec dépendances complètes et outils de debug. |
| `builder` | Compilation des sources (ex: TypeScript vers JS). |
| `runner` | Image de production minimale, sécurisée et sans outils de build. |

```dockerfile
# Utilisation de BuildKit pour la gestion du cache
FROM node:20-alpine AS development
WORKDIR /app

# Installation optimisée via cache mount
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

FROM development AS builder
RUN npm run build

FROM node:20-alpine AS runner
# Installation des utilitaires système nécessaires uniquement
RUN apk add --no-cache openssl \
    && addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
ENV NODE_ENV=production

# Dépendances de production seules
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copie des artefacts compilés avec gestion des droits
COPY --chown=appuser:appgroup --from=builder /app/dist ./dist

USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]

```

### Sécurité et Performance

* **Utilisateur non-root** : Le stage `runner` ne doit jamais exécuter de processus en tant que root.
* **Optimisation des couches** : Ordonner les `COPY` du moins volatile (package.json) au plus volatile (code source).
* **Nettoyage automatique** : Toujours utiliser `apk add --no-cache` pour éviter de stocker l'index des paquets dans l'image finale.
- **Un seul `RUN` par groupe d'opérations liées** (ex : `apk add && addgroup && adduser` dans un seul layer).

---

## Docker Compose — Configuration

### Gestion des Secrets (Approche Hybride)

* **Développement** : Utiliser le fichier `.env` via la directive `env_file` pour la simplicité locale.
* **Production** : Utiliser la directive `secrets` (Docker Secrets) pour injecter les données sensibles (mots de passe, clés privées) de manière sécurisée dans `/run/secrets/`.

```yaml
services:
  backend:
    env_file:
      - .env
    secrets:
      - db_password
    security_opt:
      - no-new-privileges:true
    networks:
      - db-net
      - app-net

secrets:
  db_password:
    file: ./secrets/db_password.txt

```

- **Jamais de valeurs en dur** dans `compose.yml` (mots de passe, secrets, tokens).
- Fournir un `.env.example` documenté à la racine du projet.

### Réseaux et Persistance

* **Segmentation réseau** : Définir des réseaux isolés (ex: `db-net` pour la communication backend/base de données uniquement).
* **Volumes** :
  * Utiliser des **volumes nommés** pour la persistance des données (DB).
  * Utiliser des **bind mounts** uniquement pour le code source en stage `development` (hot-reload).

* **Healthcheck** : Configurer systématiquement des tests de santé sur les services de base de données et utiliser `condition: service_healthy` dans les dépendances `depends_on`. Idem sur les services qui exposent une API avec un endpoint de santé (`/health`).

### Ports

- N'exposer que les ports strictement nécessaires à l'accès depuis la machine hôte.
- La DB (`5432`) ne doit **jamais** être exposée sur l'hôte en production — uniquement en dev si besoin explicite.

---

## .dockerignore — Obligatoire

Chaque service doit avoir un fichier `.dockerignore` pour exclure au minimum les éléments suivants :

```
node_modules/
dist/
.git/
.env
.env.*
**/*.log
.git/
.gitignore

```
