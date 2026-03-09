---
name: agent-handover
description: Assurer une transition fluide en proposant à l'utilisateur de lancer un autre agent pertinent pour la prochaine étape du travail, en transférant automatiquement le contexte nécessaire à partir de la mémoire.
---

## Quand utiliser ce skill

À la fin de chaque tâche, avant de rendre la main à l'utilisateur.

---

## Transitions naturelles

| Ce qui vient d'être livré | Agents à proposer |
|---------------------------|-------------------|
| Spécifications | `software-architect` |
| Architecture | `scrum-master` |
| Plan de sprints | `software-engineer` · `test-engineer` |
| Implémentation | `test-engineer` · `code-reviewer` |
| Tests | `code-reviewer` |
| Review approuvée | `tech-writer` |
| Review avec corrections | `software-engineer` |
| Fin de sprint / doc | `scrum-master` · `product-owner` |
| Debug | Agent interrompu · `test-engineer` |

Agents transversaux (proposables à tout moment) : `debugger` · `devops-engineer` · `tech-debt-cleaner`

---

## Menu à afficher en fin de réponse

Avant de rendre la main à l'utilisateur, pose la question via `vscode_askQuestions` :

> *"Quelle est la prochaine étape ?*
> 1. [emoji] `[agent]` — [action courte]
> 2. [emoji] `[agent]` — [action courte]
> 0. ✋ Arrêter ici
> *Réponds par le numéro de ton choix."*

Règles : max 3 options numérotées + l'option 0 (arrêt). Attendre la réponse avant d'agir.

### Emojis par agent
`product-owner` 📋 · `software-architect` 🏗️ · `scrum-master` 🗂️ · `software-engineer` 💻 · `test-engineer` 🧪 · `code-reviewer` 🔍 · `tech-writer` 📝 · `debugger` 🐛 · `devops-engineer` 🚀 · `tech-debt-cleaner` 🧹
