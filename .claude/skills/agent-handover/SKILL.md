---
name: agent-handover
description: Assurer une transition fluide en proposant à l'utilisateur de lancer un autre agent pertinent pour la prochaine étape du travail, en transférant automatiquement le contexte nécessaire à partir de la mémoire.
---

## Quand utiliser ce skill

À la fin de chaque tâche, avant de rendre la main à l'utilisateur.

---

## Transitions naturelles

| Ce qui vient d'être livré | Équipe suivante | Agents à proposer |
|---------------------------|-----------------|-------------------|
| Demande métier (`client-<domaine>`) | Planification | `plan-product-owner` |
| Spécifications | Planification | `plan-software-architect` |
| Architecture | Planification | `plan-scrum-master` |
| Plan de sprints | Tech | `tech-software-engineer` · `tech-qa-automation-expert` |
| Implémentation | Tech | `tech-qa-automation-expert` · `tech-code-reviewer` |
| Tests | Tech | `tech-code-reviewer` |
| Review approuvée | Production | `prod-tech-writer` |
| Review avec corrections | Tech | `tech-software-engineer` |
| Fin de sprint / doc | Planification | `plan-scrum-master` · `plan-product-owner` |
| Bug / erreur | Production | `prod-debugger` |
| Debug résolu | Tech | Agent interrompu · `tech-qa-automation-expert` |

Agents transversaux (proposables à tout moment) : `prod-debugger` · `prod-devops` · `prod-tech-debt-cleaner`

---

## Menu à afficher en fin de réponse

Avant de rendre la main à l'utilisateur, pose la question :

> *"Quelle est la prochaine étape ?*
> 1. [emoji] `[agent]` — [action courte]
> 2. [emoji] `[agent]` — [action courte]
> 0. ✋ Arrêter ici
> *Réponds par le numéro de ton choix."*

Règles : max 3 options numérotées + l'option 0 (arrêt). Attendre la réponse avant d'agir.

### Emojis par agent
`client-<domaine>` 🎯 · `plan-product-owner` 📋 · `plan-software-architect` 🏗️ · `plan-scrum-master` 🗂️ · `tech-software-engineer` 💻 · `tech-qa-automation-expert` 🧪 · `tech-code-reviewer` 🔍 · `prod-tech-writer` 📝 · `prod-debugger` 🐛 · `prod-devops` 🚀 · `prod-tech-debt-cleaner` 🧹
