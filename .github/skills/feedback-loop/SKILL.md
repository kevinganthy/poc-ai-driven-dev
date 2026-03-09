---
name: feedback-loop
description: Mettre en place et utiliser un feedback loop persistant pour améliorer la qualité des suggestions de l'IA au fil du temps, en enregistrant les retours utilisateur dans la mémoire globale (`/memories/feedback.md`).
---

## Quand utiliser ce skill

- En fin de session, après avoir livré un résultat (code, design, review, plan, doc…)
- Quand l'utilisateur signale qu'une réponse ne correspond pas à ses attentes
- Pour initialiser le système de feedback sur un nouveau projet ou workspace

---

## Protocole en 3 étapes

### Étape 1 — Lire la mémoire au début

Avant de commencer toute tâche, utilise le memory tool pour lire `/memories/feedback.md` :

```
memory view /memories/feedback.md
```

Applique les enseignements :
- **Accepted patterns** → renforce ces comportements
- **Anti-patterns** → évite explicitement ces erreurs

---

### Étape 2 — Demander le feedback en fin de session

Avant de rendre la main à l'utilisateur, pose la question :

> *"Feedback rapide : cette réponse était-elle utile ?*
> - **accepted** — utilisé tel quel
> - **modified** — adapté avant intégration
> - **rejected** — non retenu
>
> *Un commentaire ?"*

---

### Étape 3 — Enregistrer le feedback

Une fois le retour reçu, utilise le memory tool pour insérer une entrée dans `/memories/feedback.md`, dans la section **Feedback Log** :

```markdown
### [YYYY-MM-DD] agent: [nom-agent]
**Task**: description courte de la tâche  
**Outcome**: accepted | modified | rejected  
**Comment**: commentaire de l'utilisateur  
**Lesson**: ce qu'il faut renforcer ou éviter la prochaine fois  
```

Si la même `Lesson` apparaît **2 fois ou plus**, déplace-la dans la section **Patterns & Lessons Learned** (Accepted patterns ou Anti-patterns selon le cas).

---

## Exemple concret

```markdown
### [2026-03-08] agent: tech-software-engineer
**Task**: Implémentation de la route PUT /tickets/:id  
**Outcome**: modified  
**Comment**: Le middleware d'autorisation était appliqué au mauvais niveau  
**Lesson**: Toujours vérifier que authorize() est positionné avant le handler dans la route
```

---

## Structure du fichier `/memories/feedback.md`

```
# AI Feedback Memory

## Patterns & Lessons Learned
### Accepted patterns
### Anti-patterns

## Feedback Log
### [date] agent: [nom]
...
```

---

## Règles

- Ne jamais supprimer d'entrée existante du log (traçabilité)
- Mettre à jour `Patterns & Lessons Learned` uniquement sur les patterns récurrents (≥2 occurrences)
- Garder les entrées courtes et actionnables — pas de prose, des faits
- Si l'utilisateur refuse de donner un feedback, noter `**Outcome**: no-feedback` et ne pas insister
