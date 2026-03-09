# AI Driven Dev - Formality

## Equipes et rôles

Le workflow de production se découpe en équipes d'agents spécialisés.

### Team client

> Se comporte en qualité d'expert métier

Cette équipe se décompose en autant d'agents que nécessaire pour couvrir les différents domaines d'expertise métier.

Nomenclature : `client-<domaine>`

### Team plannification

> Traduit les besoins en tâches techniques

- `plan-product-owner` : expert métier, responsable de la vision produit et de la priorisation du backlog
- `plan-software-architect` : expert technique, responsable de la conception de l'architecture et des frontières entre les composants
- `plan-scrum-master` : responsable de la planification des sprints et de la gestion du backlog

### Team tech

> Responsable de l'implémentation, des tests et de la revue de code

- `tech-software-engineer` : responsable de l'implémentation des tâches du backlog
- `tech-qa-automation-expert` : responsable de la rédaction de la suite de tests automatisés
- `tech-code-reviewer` : responsable de l'audit de sécurité, de performance et de durabilité du code

### Team production

> Gère la documentation, les retours utilisateurs, les bugs, la dette technique, etc.

- `prod-tech-writer` : responsable de la documentation et de la rédaction des rétrospectives de sprint
- `prod-debugger` : responsable de l'identification et de la résolution des bugs
- `prod-devops` : responsable du déploiement, de l'observabilité et de la maintenance de l'infrastructure

## Workflow

1. Un des client émet une demande
2. Le `plan-product-owner` est le point d'entrée de la team planification. Il fait des allers-retours avec les clients pour clarifier la demande et s'assurer de sa bonne compréhension.
3. Le relais est ensuite passé au `plan-software-architect` puis au `plan-scrum-master`, point de sortie de la team de planification.
4. Le `tech-software-engineer` reçoit les tâches et peut si besoin challenger les décisions d'implémentation avec le `plan-software-architect`.
5. L'implémentation se fait soit :
   1. en TDD en demandant d'abord au `tech-qa-automation-expert` de rédiger les tests
   2. en implémentant d'abord la fonctionnalité avec `tech-software-engineer`
6. Après implémentation et audit, on passe la main au `tech-code-reviewer` pour une revue de code approfondie.
7. Une boucle au sein de la team tech peut se produire si des modifications sont nécessaires.
8. Un plan de user acceptance est proposé par le `plan-product-owner` et exécuté par un humain.
9. Le `prod-tech-writer` met à jour la documentation et clôture le sprint avec une rétrospective.

## Audit et feedback

- Chaque étape du workflow sera tracée dans `memories/sprints/sprint_X_[nom].md` pour garder une trace de l'activité de chaque agent, des décisions prises, des problèmes rencontrés, etc.
- A chaque production d'un livrable, un feedback est demandé à l'humain. Le feedback sera tracé dans `memories/feedback.md`.