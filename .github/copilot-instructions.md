# Project Guidelines

## Skills Available

| Skill | Command | When to Invoke |
|-------|---------|---------------|
| `docker-compose` | `/docker-compose` | Generate or optimize a `compose.yml` (validates with built-in script) |
| `docker-optimizer` | `/docker-optimizer` | Optimize a Dockerfile (multi-stage, non-root user, slim base) |
| `svelte/new-component` | `/new-component <Name>` | Scaffold a Svelte 5 component (`.svelte` + `index.ts`, runes-ready) |
| `git/smart-commit` | `/smart-commit` | Generate a structured commit message with agent reasoning |
| `workflow/handover` | `/handover` | Document agent output in `docs/` and prepare next-agent relay |

## Agents Available

Agents are invoked via the GitHub Copilot Chat agent picker. Each agent is pre-loaded with its role's system prompt.

| Agent | Role | Typical Input |
|-------|------|---------------|
| `product-owner` | Refines requirements into acceptance criteria + user stories | Raw feature idea |
| `software-architect` | Produces technical design + component boundaries | Refined requirements |
| `scrum-master` | Breaks architecture into a prioritized sprint backlog | Architecture doc |
| `feature-developer` | Implements working, validated code | Sprint task |
| `test-engineer` | Writes unit → integration → E2E test suite | Implemented feature |
| `code-reviewer` | Security/performance audit | Any code |
| `debugger` | Root-cause diagnosis and fix | Bug report / stack trace |
| `devops-engineer` | Docker, CI/CD, secrets, deployment configuration | Infra request |

### Recommended workflow order
```
product-owner → software-architect → scrum-master → feature-developer → test-engineer → code-reviewer
```
Use `debugger` or `devops-engineer` at any point when needed.

## Project Docs

| Document | Content |
|----------|---------|
| [`docs/SPECIFICATIONS.md`](../docs/SPECIFICATIONS.md) | Acceptance criteria and user stories |
| [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) | Technical design, stack choices, component boundaries |
| [`docs/SPRINT_PLAN.md`](../docs/SPRINT_PLAN.md) | Prioritized backlog and sprint breakdown |
