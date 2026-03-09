---
name: sprint-init
description: Permettre au plan-scrum-master d'initialiser correctement le fichier mémoire d'un sprint à la fin de la planification, en garantissant un numéro de sprint cohérent, un backlog complet et un fichier exploitable par le tech-software-engineer pour reprendre sans perte de contexte.
---

## Quand utiliser ce skill

- Après avoir produit un plan de sprint (backlog + estimation + ordre d'exécution)
- Avant de passer la main au tech-software-engineer
- Lors de la reprise d'un sprint interrompu qui n'a pas encore de fichier mémoire

---

## Procédure en 5 étapes

### Étape 1 — Déterminer le numéro N du prochain sprint

```
memory view /memories/sprints/
```

- Si le répertoire est vide ou n'existe pas → N = 1
- Sinon, lire les fichiers existants (`sprint_1_*.md`, `sprint_2_*.md`…) et prendre le max + 1
- **Ne jamais réutiliser un numéro existant**

---

### Étape 2 — Lire le template

```
read_file .github/skills/sprint-memory/template.md
```

Utilise ce template comme base exacte. Ne pas inventer une structure différente.

---

### Étape 3 — Remplir le fichier

Remplace chaque placeholder `[…]` du template avec les valeurs réelles :

| Placeholder | Valeur à mettre |
|-------------|-----------------|
| `[N]` | Numéro du sprint (étape 1) |
| `[nom]` | Slug court en kebab-case (ex : `auth-backend`, `categories-feature`) |
| `YYYY-MM-DD` (début) | Date du jour |
| `YYYY-MM-DD` (fin prévue) | Date estimée de fin (selon la vélocité et les points) |
| `XX points` (vélocité cible) | Total des story points du backlog |
| `[Agents impliqués]` | Liste des agents attendus sur ce sprint |
| `[Description du goal]` | Objectif du sprint en 1-2 phrases |

**Backlog** — pour chaque tâche planifiée :

| Colonne | Valeur |
|---------|--------|
| `#` | Numéro séquentiel de la tâche |
| `Tâche` | Libellé exact du backlog planifié |
| `Points` | Story points estimés |
| `Statut` | `⬜ Todo` (toujours — seul le tech-software-engineer change les statuts) |
| `Notes` | Dépendances ou précisions utiles (peut être vide) |

**Contexte de reprise** — remplis la section avec :
- La **première tâche** à traiter (numéro + libellé)
- Les **fichiers de départ** à lire avant de commencer (ex : `backend/prisma/schema.prisma`)
- Les **prérequis** éventuels (migration Prisma, variables d'env, etc.)

---

### Étape 4 — Créer le fichier

```
memory create /memories/sprints/sprint_[N]_[slug].md
```

Nom de fichier : `sprint_[N]_[slug-court].md`
- `[N]` = numéro du sprint
- `[slug-court]` = kebab-case, 2-4 mots max (ex : `sprint_3_categories.md`)

---

### Étape 5 — Vérification avant de rendre la main

- [ ] Le fichier existe dans `/memories/sprints/`
- [ ] Le numéro N est unique (pas de doublon avec les sprints existants)
- [ ] Tous les items du backlog planifié sont présents avec statut `⬜ Todo`
- [ ] La section **Contexte de reprise** indique clairement la première tâche
- [ ] Les dates sont cohérentes (fin prévue > début)
- [ ] La vélocité cible correspond au total des story points du backlog

---

## Règles importantes

- **Ne jamais marquer une tâche ✅ à la création** — seul le tech-software-engineer met à jour les statuts
- **Ne pas ajouter de tâches non planifiées** — le fichier doit refléter exactement le plan livré
- **Ne pas supprimer de sections du template** — même vides, elles sont utilisées par d'autres agents
- **Toujours utiliser `/memories/sprints/`** comme répertoire (pas `/memories/` directement)

---

## Exemple de fichier résultat

```
/memories/sprints/sprint_3_categories.md
```

```markdown
# Sprint 3 — categories

## 📋 Métadonnées

| Champ | Valeur |
|-------|--------|
| **Statut** | 🟡 En cours |
| **Date de début** | 2026-03-09 |
| **Date de fin prévue** | 2026-03-23 |
| **Date de clôture** | — |
| **Vélocité cible** | 18 points |
| **Vélocité réelle** | — |
| **Agents impliqués** | plan-scrum-master, tech-software-engineer, tech-qa-automation-expert |

## 🎯 Objectif du sprint

Ajouter la gestion des catégories aux tickets : sélection à la création, badge d'affichage, filtre multi-catégories.

## ✅ Backlog

| # | Tâche | Points | Statut | Notes |
|---|-------|--------|--------|-------|
| 1 | Prisma schema : modèles Category + TicketCategory | 2 | ⬜ Todo | Bloque tout |
| 2 | Seed des 7 catégories prédéfinies | 1 | ⬜ Todo | Après #1 |
| 3 | Service getAll avec filtre categories | 3 | ⬜ Todo | Après #1 |
| 4 | Route GET /tickets — param ?categories= | 2 | ⬜ Todo | Après #3 |
| 5 | Composant CategoryTag.svelte | 2 | ⬜ Todo | |
| 6 | Composant CategorySelect.svelte | 3 | ⬜ Todo | |
| 7 | Intégration dans TicketForm | 2 | ⬜ Todo | Après #6 |
| 8 | Composant CategoryFilter.svelte | 3 | ⬜ Todo | Après #5 |

## 🤖 Contexte de reprise (pour les agents)

**Prochaine tâche** : #1 — Prisma schema : modèles Category + TicketCategory  
**Fichiers de départ** :
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`

**Prérequis** : après toute modification du schéma, exécuter :
```bash
npx prisma format
npx prisma migrate dev --name <description>
npx prisma generate
docker compose logs backend  # vérifier le démarrage propre
```
```

---

## Relation avec les autres skills

| Skill | Lien |
|-------|------|
| `sprint-memory` | Définit le protocole complet et le template — ce skill implémente l'étape d'initialisation |
| `feedback-loop` | Le plan-scrum-master demande le feedback après avoir créé le fichier sprint |
| `agent-handover` | Le fichier créé par ce skill sert de contexte de reprise pour le tech-software-engineer |
