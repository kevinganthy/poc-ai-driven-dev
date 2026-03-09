# Feedback Loop — poc-ai-driven-dev

## Patterns & Lessons Learned

(À remplir au fil des sprints)

---

## Feedback Log

### [2026-03-09] agent: software-engineer
**Task**: Sprint 5 — Catégories (Phase 1)  
**Outcome**: modified  
**Comment**: Implémentation OK, mais variables d'env Docker ne s'interpolent pas correctement dans compose.yml — backend reçoit `<POSTGRES_USER>` littéral au lieu de valeur interpolée  
**Lesson**: Vérifier que `compose.yml` utilise `env_file: .env` ou passe explicitement les vars au service ; penser à documenter le processus d'interpolation en cas de changement
