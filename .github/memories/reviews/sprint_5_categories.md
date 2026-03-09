# Code Review — Sprint 5 : Catégories

**Date** : 2026-03-09  
**Agent** : code-reviewer  
**Sprint** : 5 — Catégories (Phase 1)  
**Outcome** : ✅ Approuvé avec réserves (issues à corriger avant/pendant phase 2)

---

## Résumé

Code fonctionnel et bien structuré. Conventions du projet respectées (runes Svelte 5, fonctions nommées, Zod validators, séparation routes/services). Aucune vulnérabilité de sécurité critique. 1 issue High, 3 issues Medium à traiter en priorité.

---

## Security Findings

| Sévérité | Fichier | Issue | Action |
|----------|---------|-------|--------|
| ⚪ Info | `api/tickets.ts:15` | `categories` ids non `encodeURIComponent` — risque nul (number[]) mais incohérent avec `status` | Optionnel |

---

## Performance Findings

| Impact | Fichier | Issue | Action |
|--------|---------|-------|--------|
| 🟡 Medium | `routes/tickets/+page.svelte:63` | Pas de debounce sur filtres catégories → race condition HTTP possible | Corriger via `$effect` |
| 🔵 Low | `services/ticket.service.ts:111` | `deleteMany` + `create` séquentiels pour mise à jour catégorie | Acceptable pour l'instant |

---

## Durability Findings

| Catégorie | Sévérité | Fichier | Issue | Action |
|-----------|----------|---------|-------|--------|
| Fragile assumption | 🟠 High | `lib/api/categories.ts:8-16` | IDs catégories hardcodés côté frontend (suppose autoincrement depuis 1) | Exposer `GET /categories` en phase 2 |
| Weak abstraction | 🟡 Medium | `ticket.service.ts:60,105` | 3 casts `as any` (include + deleteMany) | Supprimer après `prisma generate` |
| Functional gap | 🟡 Medium | `ticket.validator.ts:15` + `ticket.service.ts:106` | Impossible de retirer une catégorie (`categoryId: null` non géré) | Fixer validator + service |
| Unnecessary cast | 🔵 Low | `TicketForm.svelte:21` | `(initialValues as any)?.category?.id` inutile | Supprimer cast |
| Observability | 🔵 Low | `ticket.service.ts:17` | `mapTicket(ticket: any)` sans type | Typer avec inféré Prisma |
| Schema redundancy | ⚪ Info | `schema.prisma:42-47` | `@@unique([ticketId, categoryId])` redondant (`ticketId` déjà `@unique`) | Backlog |

---

## Ce qui est bien fait

1. Architecture service/routes correctement séparée
2. Filtrage catégories via Prisma paramétrisé — sécurisé contre l'injection
3. Svelte 5 runes correctement utilisées (`$state`, `$derived.by`, `untrack()`)
4. Tests complets pour `CategoryFilter`, `CategoryTag`; coverage RBAC backend solide
5. Seed idempotent via `upsert` ✅

---

## Priority Action Plan

| # | Priorité | Issue | Fichiers |
|---|----------|-------|---------|
| 1 | 🟠 Avant production | IDs catégories hardcodés → `GET /categories` | `frontend/src/lib/api/categories.ts` |
| 2 | 🟡 Prochain sprint | Supprimer 3 casts `as any` après `prisma generate` | `backend/src/services/ticket.service.ts` |
| 3 | 🟡 Prochain sprint | Permettre `categoryId: null` (retrait catégorie) | `ticket.validator.ts`, `ticket.service.ts` |
| 4 | 🟡 Prochain sprint | Race condition filtres → `$effect` réactif | `frontend/src/routes/tickets/+page.svelte` |
| 5 | 🔵 Backlog | Supprimer `@@unique` redondant | `backend/prisma/schema.prisma` |
