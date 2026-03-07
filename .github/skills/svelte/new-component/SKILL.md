---
name: new-component
description: Génère la structure complète d'un nouveau composant Svelte 5 (Dossier, .svelte, index) selon les standards du projet.
---

### Instructions pour l'agent
Lorsque l'utilisateur demande de créer un nouveau composant :

1.  **Demande le nom** : Si le nom n'est pas précisé, demande-le (en PascalCase).
2.  **Exécute le script** : Utilise le script `./generate.sh <NomDuComposant>` présent dans ce dossier de skill.
3.  **Applique le style** : Une fois les fichiers créés, propose à l'utilisateur de remplir le contenu du fichier `.svelte` en respectant :
    - L'utilisation de Tailwind CSS.
    - Les props déclarées via la rune `$props()`.
    - La syntaxe Svelte 5 (runes : `$state`, `$derived`, `$effect`).
    - L'export du composant via `index.ts`.

### Exemple de commande
Utilisateur : "/new-component Button"
Agent : "Je crée la structure pour le composant Button..." (puis exécute le script).
