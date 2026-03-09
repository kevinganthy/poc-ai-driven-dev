---
name: sprint-memory
description: Créer et maintenir une mémoire de sprint structurée pour suivre l'avancement, les décisions et les blocages.
---

## Nommage des fichiers

```
.github/memories/sprints/sprint_[N]_[nom].md
```

Exemples :
- `.github/memories/sprints/sprint_1_auth-tickets.md`
- `.github/memories/sprints/sprint_2_ui-crud.md`
- `.github/memories/sprints/sprint_3_notifications.md`

---

## Qui fait quoi

| Agent | Action |
|-------|--------|
| **plan-scrum-master** | Crée le fichier en début de sprint (depuis le template) |
| **tech-software-engineer** | Met à jour les statuts du backlog + log d'activité pendant l'implémentation |
| **tech-qa-automation-expert** | Met à jour les statuts des tâches de test + log d'activité |
| **tech-code-reviewer** | Ajoute les décisions prises + issues trouvées + log d'activité |
| **prod-debugger** | Ajoute les bugs dans "Problèmes & Blocages" + log d'activité |
| **prod-tech-writer** | Met à jour les artefacts produits, clôt le sprint, rédige la rétrospective |

---

## Protocole par agent

### plan-scrum-master — Initialisation du fichier

À la fin de la planification du sprint, crée le fichier mémoire :

1. Copie le template depuis `.claude/skills/sprint-memory/template.md`
2. Remplace toutes les valeurs entre `[…]`
3. Remplis le **Backlog** avec les tâches du plan
4. Crée le fichier dans `.github/memories/sprints/sprint_[N]_[nom].md`

---

### tech-software-engineer — Mise à jour en cours de sprint

Après chaque tâche terminée ou changement d'état :

1. **Backlog** : changer le statut de la tâche (⬜ → 🔄 → ✅)
2. **Artefacts** : ajouter les fichiers créés/modifiés
3. **Log d'activité** : ajouter une ligne (ordre inverse) :
   ```
   - [YYYY-MM-DD] **tech-software-engineer** — implémenté `route PUT /tickets/:id`, tests passent
   ```
4. **Contexte de reprise** : mettre à jour la prochaine tâche et les fichiers en cours

---

### tech-code-reviewer — Après une review

1. **Décisions prises** : noter les choix architecturaux validés
2. **Problèmes & Blocages** (si bloquant) : ajouter les issues critiques
3. **Log d'activité** :
   ```
   - [YYYY-MM-DD] **tech-code-reviewer** — review terminée, 2 issues 🟡 Medium corrigées, 1 ⚪ Info notée
   ```

---

### prod-debugger — Lors d'un bug

1. **Problèmes & Blocages** → section Ouverts : ajouter le bug
2. Une fois résolu, déplacer vers Résolus avec la solution
3. **Log d'activité** :
   ```
   - [YYYY-MM-DD] **prod-debugger** — bug résolu : req.user undefined dans middleware auth (manquait authenticate() dans la route)
   ```

---

### prod-tech-writer — Clôture du sprint

1. **Métadonnées** : passer le statut à ✅ Terminé, remplir la date de clôture et la vélocité réelle
2. **Artefacts** : compléter la liste des livrables
3. **Rétrospective** : remplir les 3 sections
4. **Log d'activité** :
   ```
   - [YYYY-MM-DD] **prod-tech-writer** — sprint clôturé, PR préparée, doc mise à jour
   ```

---

## Format des entrées du Log d'activité

```markdown
- [YYYY-MM-DD] **[agent]** — [action courte et factuelle]
```

Règles :
- Ordre **chronologique inverse** (plus récent en premier)
- Une ligne par action significative (pas pour chaque fichier édité)
- Factuel, pas de prose — ce qui a été fait, pas comment

---

## Format des Problèmes & Blocages

```markdown
### Ouverts
- [ ] **[YYYY-MM-DD] [Titre court]** — description, agent concerné, impact sur le sprint

### Résolus
- [x] **[YYYY-MM-DD] [Titre court]** — résolution : [ce qui a été fait]
```

---

## Lire la mémoire sprint en cours

Pour trouver le sprint actif, liste les fichiers dans `.github/memories/sprints/` puis lis le fichier `sprint_[N]_[nom].md` avec le statut 🟡 En cours.

---

## Template

Le template complet est disponible dans :
```
.claude/skills/sprint-memory/template.md
```
