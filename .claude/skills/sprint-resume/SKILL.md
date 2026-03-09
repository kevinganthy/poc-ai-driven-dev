---
name: sprint-resume
description: Permettre à un agent de reprendre un sprint en cours sans demander de contexte supplémentaire à l'utilisateur, en reconstituant automatiquement l'état du travail depuis le fichier mémoire.
---

## Quand utiliser ce skill

- Au début de toute session de travail sur un sprint déjà initié
- Après une interruption (changement de session, intervention d'un autre agent)
- Quand l'utilisateur dit « reprends le sprint », « continue l'implémentation », « où en est-on ? »
- Avant de commencer à coder, tester ou reviewer, pour s'assurer de ne pas redupliquer du travail

---

## Procédure en 4 étapes

### Étape 1 — Identifier le sprint actif

Lister les fichiers dans `.github/memories/sprints/` :

- Identifier le sprint avec **Statut 🟡 En cours** (ou le plus récent si plusieurs)
- Si aucun fichier n'existe → demander à l'utilisateur quel sprint initialiser (invoquer `sprint-init`)
- Si plusieurs sprints sont "En cours" → demander à l'utilisateur lequel reprendre

---

### Étape 2 — Lire le fichier mémoire

Lire `.github/memories/sprints/sprint_[N]_[slug].md`

Extraire les informations suivantes :

| Section | Ce qu'on en tire |
|---------|-----------------|
| **Métadonnées** | Vélocité cible, agents impliqués, dates |
| **Objectif du sprint** | But à garder en tête pendant tout le travail |
| **Backlog** | Liste des tâches + leur statut actuel (`⬜ Todo`, `🔄 In Progress`, `✅ Done`, `🔴 Blocked`) |
| **Problèmes & Blocages** | Issues ouvertes qui peuvent impacter le travail |
| **Contexte de reprise** | Prochaine tâche exacte + fichiers de départ + prérequis techniques |

---

### Étape 3 — Alimenter le todo list

Depuis le backlog lu à l'étape 2, appeler l'outil de todo list avec :

- **Toutes les tâches `⬜ Todo`** → statut `not-started`
- **Toutes les tâches `🔄 In Progress`** → statut `in-progress` (une seule à la fois)
- **Toutes les tâches `✅ Done`** → statut `completed`
- **Tâches `🔴 Blocked`** → statut `not-started` + noter le blocage dans le titre

La prochaine tâche à traiter est celle indiquée dans **Contexte de reprise** (ou la première `⬜ Todo` si non précisée).

---

### Étape 4 — Résumer la situation à l'utilisateur

Avant de commencer le travail, afficher un résumé concis :

```
Sprint [N] — [nom]
Objectif : [objectif du sprint]
Progression : X/Y tâches complétées ([Z] points restants)

Prochaine tâche : #[n] — [libellé]
Fichiers de départ : [liste]

Blocages ouverts : [liste ou "Aucun"]
```

Puis commencer immédiatement la prochaine tâche sans demander confirmation, sauf si un blocage ouvert nécessite une décision.

---

## Règles importantes

- **Ne jamais recréer un fichier sprint qui existe déjà** — lire et reprendre, pas écraser
- **Ne pas changer le statut d'une tâche avant de l'avoir réellement traitée** — `🔄 In Progress` seulement quand le travail commence
- **Respecter l'ordre du backlog** — sauf si une dépendance impose un autre ordre (signalé dans les Notes)
- **Si le fichier mémoire contient des incohérences** (ex : tâche `✅ Done` mais code absent), signaler à l'utilisateur sans modifier le fichier

---

## Mise à jour en cours de session

À chaque tâche terminée, mettre à jour `.github/memories/sprints/sprint_[N]_[slug].md` :

1. **Backlog** — changer le statut `⬜ Todo` → `✅ Done`
2. **Artefacts** — ajouter les fichiers créés/modifiés
3. **Log d'activité** — ajouter une ligne (ordre inverse) :
   ```
   - [YYYY-MM-DD] **[agent]** — [description de l'action]
   ```
4. **Contexte de reprise** — mettre à jour la prochaine tâche

---

## Relation avec les autres skills

| Skill | Lien |
|-------|------|
| `sprint-init` | Crée le fichier que ce skill lit — à appeler si aucun fichier n'existe |
| `sprint-memory` | Définit le protocole complet et le template de mise à jour |
| `feedback-loop` | À appeler en fin de session après les mises à jour mémoire |
| `agent-handover` | Si l'agent doit passer la main en cours de sprint, le contexte de reprise doit être à jour |
