---
name: docker-optimizer
description: Aide à optimiser les Dockerfiles pour la production et à nettoyer l'environnement Docker.
---

### Instructions pour l'agent
Lorsque l'utilisateur demande d'optimiser un Dockerfile ou de gérer ses ressources Docker, suis ces règles :

1.  **Multi-stage builds** : Propose toujours une structure multi-étapes pour réduire la taille de l'image finale.
2.  **Sécurité** : Ajoute systématiquement une instruction `USER` pour ne pas exécuter le conteneur en root.
3.  **Nettoyage** : Si l'utilisateur veut "faire de la place", utilise la commande `docker system prune -a --volumes` après confirmation.
4.  **Images de base** : Privilégie les images `alpine` ou `slim` sauf indication contraire.

### Exemple de transformation
**Entrée utilisateur :** "Optimise mon Dockerfile Node.js"
**Action du skill :** Générer un fichier avec les étapes `development`, `builder` et `runner` minimaliste.
