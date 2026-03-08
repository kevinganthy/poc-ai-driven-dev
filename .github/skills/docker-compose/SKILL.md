---
name: docker-compose
description: Génère et optimise des fichiers compose.yml sécurisés et modulaires.
---

### Instructions pour l'agent
Lorsque tu aides à créer ou modifier un fichier `compose.yml`, applique systématiquement ces règles :

1.  **Réseaux Isolés** : Crée toujours un `network` dédié (ex: `backend`, `frontend`) au lieu d'utiliser le réseau par défaut.
2.  **Gestion des Secrets** : Ne mets JAMAIS de mots de passe en dur. Utilise des fichiers `.env` ou la directive `secrets:`.
3.  **Dépendances** : Utilise `depends_on` avec la condition `service_healthy` pour s'assurer que la DB est prête avant le démarrage de l'app.
4.  **Volumes** : Utilise des volumes nommés pour la persistance des données au lieu de bind mounts relatifs pour plus de portabilité.

### Validation obligatoire après chaque modification
Après **chaque création ou modification** d'un fichier `compose.yml`, exécute le script de validation :

```bash
.github/skills/docker-compose/validate-compose.sh [chemin/vers/compose.yml]
```

- Si le script retourne des **erreurs** (`exit 1`) : corrige-les avant de continuer.
- Si le script retourne des **warnings** : signale-les à l'utilisateur avec une explication et une proposition de correction.
- Si tout est **vert** : indique brièvement que la validation a réussi.

Le script vérifie automatiquement :
- La syntaxe YAML/Compose (`docker compose config`)
- La présence d'un réseau dédié
- L'absence de mots de passe en dur

### Modèle de référence
Si l'utilisateur demande une stack Web standard, utilise cette structure :
- Un service `reverse-proxy` (caddy).
- Un service `api`.
- Un service `db` avec un healthcheck configuré.