# AI Driven Dev - Formality

## Equipes et rôles

Le workflow de production se découpe en équipes d'agents spécialisés.

### Client

```md
name: client-interviewer
description: MUST BE USED to simulate client responses during requirement clarification. Always read .claude/knowledge/ first.
```

Le client se basera sur les documents de la base de connaissances dans le dossier `.claude/knowledge/` pour répondre aux questions de clarification. Il est important de toujours se référer à ces documents pour assurer la cohérence des échanges.

### Team plannification

> Traduit les besoins en tâches techniques

- `plan-product-owner` : traducteur, transforme le besoin en user stories + critères d'acceptance
- `plan-software-architect` : ADR + découpage technique
- `plan-scrum-master` : orchestrateur et planificateur de sprint, validation READY_FOR_BUILD, validation BUILD_DONE, clôture du sprint

### Team tech

> Responsable de l'implémentation, des tests et de la revue de code

- `tech-software-engineer` : responsable de l'implémentation des tâches du backlog, challenge les décisions d'implémentation avec l'architecte si besoin (max 1 aller-retour, l'architecte a le dernier mot)
- `tech-qa-automation-expert` : responsable de la rédaction de la suite de tests automatisés en amont ou en aval de l'implémentation
- `tech-code-reviewer` : responsable de l'audit de sécurité, de performance et de durabilité du code

### Team production

> Gère la documentation, les retours utilisateurs, les bugs, la dette technique, etc.

- `prod-tech-writer` : responsable de la documentation et de la rédaction des rétrospectives de sprint
- `prod-debugger` : responsable de l'identification et de la résolution des bugs hors sprint
- `prod-devops` : responsable du déploiement, de l'observabilité et de la maintenance de l'infrastructure

## Workflow

PROMPT ➡️ plan-product-owner ↔️ client-interviewer
               ⬇️ plan-software-architect
               ⬇️ plan-scrum-master
                        ⬇️ 
[tech-software-engineer ↔️ tech-qa-automation-expert] ↔️ tech-code-reviewer
                        ⬇️
     [plan-scrum-master ↔️ plan-product-owner] ➡️ prod-tech-writer

1. Un humain prompt une demande
2. Le `plan-product-owner` est le point d'entrée de la team planification. Il fait des allers-retours avec le client pour clarifier la demande et s'assurer de sa bonne compréhension.
3. Le relais est ensuite passé au `plan-software-architect` puis au `plan-scrum-master`
4. Le `tech-software-engineer` reçoit les tâches et peut si besoin challenger les décisions d'implémentation avec le `plan-software-architect`.
5. L'implémentation se fait soit :
   1. en TDD en demandant d'abord au `tech-qa-automation-expert` de rédiger les tests
   2. en implémentant d'abord la fonctionnalité avec `tech-software-engineer`
6. Après implémentation et test, on passe la main au `tech-code-reviewer` pour une revue de code approfondie. Il décide si NEEDS_REVISION (reboucle vers `tech-software-engineer`) ou APPROVED.
7. Le `plan-scrum-master` valide avec le `plan-product-owner` que le sprint est BUILD_DONE
8. Le `prod-tech-writer` met à jour la documentation et clôture le sprint avec une rétrospective.

## Audit et feedback

- Chaque étape du workflow sera tracée dans `memories/sprints/sprint_X_[nom].md` pour garder une trace de l'activité de chaque agent, des décisions prises, des problèmes rencontrés, etc.
- A chaque production d'un livrable, un feedback est demandé à l'humain. Le feedback sera tracé dans `memories/feedback.md`.