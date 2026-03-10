# Feedback Loop — poc-ai-driven-dev

## Patterns & Lessons Learned

### Anti-patterns (éviter)

- **Tracer la review dans le sprint memory** — La review doit aller dans `.github/memories/reviews/sprint_[N]_[nom].md`, pas dans le fichier sprint memory

---

## Feedback Log

### [2026-03-10] agent: tech-software-engineer
**Task**: Sprint 6 — CRUD admin catégories (soft delete, restore, page admin, tests backend + frontend)
**Outcome**: modified
**Comment**: Implémentation validée, mais le workflow a sauté les agents plan-* (product-owner, software-architect, scrum-master). L'utilisateur aurait préféré passer par eux pour cadrer la demande client avant d'implémenter.
**Lesson**: Toute nouvelle demande fonctionnelle doit passer par le workflow standard : client → plan-product-owner → plan-software-architect → plan-scrum-master → tech-*. Ne pas aller directement au tech-software-engineer même si les besoins semblent clairs.

### [2026-03-09] agent: tech-writer
**Task**: Sprint 5 — Finalisation sprint (README, OpenAPI, PR description, clôture sprint memory)  
**Outcome**: accepted  
**Comment**: Tous les livrables validés : README réécrit, openapi.yaml créé, PR description complète, sprint memory clôturé avec rétrospective.  
**Lesson**: Le pattern README + OpenAPI + PR + sprint memory clôturé en une session est le bon workflow de fin de sprint.

### [2026-03-09] agent: code-reviewer
**Task**: Sprint 5 — Review code catégories (backend + frontend)  
**Outcome**: modified  
**Comment**: Contenu de la review parfait, mais le fichier de trace doit aller dans `.github/memories/reviews/sprint_[N]_[nom].md` et non dans le fichier sprint memory.  
**Lesson**: Les reviews doivent être tracées dans un fichier dédié `.github/memories/reviews/sprint_[N]_[nom].md` — ne pas mélanger review log et sprint memory.

### [2026-03-09] agent: software-engineer
**Task**: Sprint 5 — Catégories (Phase 1)  
**Outcome**: modified  
**Comment**: Implémentation OK, mais variables d'env Docker ne s'interpolent pas correctement dans compose.yml — backend reçoit `<POSTGRES_USER>` littéral au lieu de valeur interpolée  
**Lesson**: Vérifier que `compose.yml` utilise `env_file: .env` ou passe explicitement les vars au service ; penser à documenter le processus d'interpolation en cas de changement
