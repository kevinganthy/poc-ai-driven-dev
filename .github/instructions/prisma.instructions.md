---
applyTo: "**/schema.prisma,**/prisma/seed.ts,**/lib/prisma.ts"
---

# Prisma ORM — Common Pitfalls & Best Practices

Leçons apprises lors de l'implémentation de catégories et jonctions dans Sprint 5.

---

## 1. DATABASE_URL Interpolation

### ⚠️ Pièges courants

**INCORRECT** — Variables d'env comme strings littérales :
```env
DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@db:5432/<POSTGRES_DB>
```

Docker ou Node reçoit la chaîne littérale `<POSTGRES_USER>` au lieu d'interpoler. Prisma se connecte et échoue avec :
```
Error: P1000: Authentication failed against database server
```

**CORRECT** — Interpolation au niveau du shell ou preset des valeurs :
```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/ticketmanager
```

Ou en Docker Compose `entrypoint.sh` :
```bash
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}"
npx prisma db push
```

### ✅ Solutions

1. **Dev** : `.env` avec valeurs complètes (pas de templates)
2. **CI/CD** : Utiliser secrets GitHub ou variables d'environnement + `envsubst` pour interpoler
3. **Docker** : `compose.yml` avec `env_file: .env` + `.env` contenant les vraies valeurs

---

## 2. ID Types & Mismatches

### ⚠️ Pièges courants

**INCORRECT** — Mélanger UUID et INT autoincrement :

```prisma
model Category {
  id    String  @id @default(uuid())  // ← UUID
  name  String  @unique
}

model TicketCategory {
  // ...
  categoryId  String  // ← Expecting UUID
}
```

**MAIS si backend envoie** : `categoryId: 1` (INT), **Prisma échoue**:
```
Type 'number' is not assignable to type 'string (uuid)'
```

### ✅ Solution — Être cohérent

**Option A — UUID partout** (UUID v4 prédictible avoids IDOR) :
```prisma
model Category {
  id    String  @id @default(uuid())
}
```
- Backend validator : `z.coerce.string().uuid()`
- Frontend : `categoryId: string`

**Option B — INT autoincrement pour tables systèmes** (recommandé si pas d'IDOR risk) :
```prisma
model Category {
  id    Int     @id @default(autoincrement())
}
```
- Backend validator : `z.coerce.number().int().positive()`
- Frontend : `categoryId: number`

**POINT CLEF** : Choisir UNE stratégie par domaine métier et la respecter partout (schema → validator → service → API → frontend types).

---

## 3. Seed Idempotence

### ⚠️ Pièges courants

**INCORRECT** — Créer sans vérifier l'existence :
```typescript
// Échoue au 2e run : unique constraint violation
await prisma.category.create({
  data: { name: 'Bug' },
});
```

### ✅ Solution — Utiliser `upsert`

```typescript
for (const categoryName of predefinedCategories) {
  await prisma.category.upsert({
    where: { name: categoryName },  // ← Clé unique pour recherche
    update: {},                      // ← Rien à mettre à jour si existe
    create: { name: categoryName },  // ← Créer si n'existe pas
  });
}
```

**Profiter de** :
- `@unique` ou `@@unique` sur le champ de lookup (ex: `name`)
- Seed idempotent : peut se ré-exécuter infiniment sans erreur

---

## 4. Relations Explicites vs Implicites

### ⚠️ Pièges courants

**IMPLICIT RELATION** — Prisma génère le nom automatiquement :
```prisma
model Ticket {
  id        String
  categories TicketCategory[]  // ← Auto-named relation
}

model TicketCategory {
  ticket      Ticket   @relation(fields: [ticketId], references: [id])
  ticketId    String
  category    Category @relation(fields: [categoryId], references: [id])
}
```

**Problème** : Si deux relations Ticket → Category existent (ex: `assignedTo`, `createdBy`), Prisma ne sait pas quel nom appliquer automatiquement → **erreur ambiguë**.

### ✅ Solution — Relations nommées explicitement

```prisma
model Ticket {
  id                String
  ticketCategory    TicketCategory?  @relation("TicketToCategory")
}

model TicketCategory {
  ticket      Ticket    @relation("TicketToCategory", fields: [ticketId], references: [id])
  category    Category  @relation("CategoryToTicket", fields: [categoryId], references: [id])
}

model Category {
  id                 Int
  ticketCategories   TicketCategory[]  @relation("CategoryToTicket")
}
```

**Avantages** :
- Pas d'ambiguïté avec plusieurs relations
- Facile de relire et de documenter l'intent
- Évite les erreurs Prisma.generateClient

---

## 5. PrismaClient — Singleton Pattern

### ⚠️ Pièges courants

**INCORRECT** — Instancier partout :
```typescript
// routes/auth.ts
const prisma = new PrismaClient();

// routes/tickets.ts
const prisma = new PrismaClient();

// → 2+ connexion pools ! Perte de performance, leaks de connexions
```

### ✅ Solution — Singleton dans `lib/prisma.ts`

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!globalThis.prisma) {
    globalThis.prisma = new PrismaClient();
  }
  prisma = globalThis.prisma;
}

export { prisma };
```

**Usage** :
```typescript
import { prisma } from '../lib/prisma';
// Toujours le MÊME client global
```

---

## 6. Schema Changes & Migrations

### ⚠️ Pièges courants

**Dev** : `npx prisma db push --accept-data-loss` ✅
- OK en dev, supprime les tables au besoin

**Production** : `npx prisma db push` ❌
- DANGEREUX, mauvaise gestion des changements de colonne
- Peut supprimer des données

**Production** : `npx prisma migrate deploy` ✅
- Utilise des migrations explicites, plus safe

### ✅ Solution

```bash
# Dev/staging : migrations auto
npx prisma db push --accept-data-loss

# Créer une migration nommée
npx prisma migrate dev --name add_categories

# Prod : appliquer migrations sans recreate
npx prisma migrate deploy

# Rollback une migration
npx prisma migrate resolve --rolled-back "add_categories"
```

**En Docker** : `entrypoint.sh` doit faire :
```bash
#!/bin/sh
if [ "$NODE_ENV" = "production" ]; then
  npx prisma migrate deploy  # Safe in prod
else
  npx prisma db push --accept-data-loss  # Dev OK
fi
```

---

## 7. Type casting avec `as any` — Red Flag

### ⚠️ Pièges courants

```typescript
// MAUVAIS — Desactivates type checking
const data = await prisma.ticketCategory.deleteMany({
  where: { ticketId: id },
}) as any;  // ← Type hole!
```

**Quand c'est nécessaire** :
- After Prisma schema change but BEFORE `npx prisma generate`
- Avant une migration appliquée en DB

### ✅ Solution

1. **Ne pas utiliser `as any` dans le code final**
2. **Après chaque schema change** :
   ```bash
   npx prisma generate  # Régénère les types
   npx prisma db push   # Applique au DB
   npm run build        # Recompile TS
   ```
3. **Si `as any` nécessaire temporairement** → Ajouter TODO et corriger après

---

## 8. Filtering & Include Strategy

### ⚠️ Pièges courants

**INEFFICACE** — Charger tout puis filtrer en mémoire :
```typescript
const allTickets = await prisma.ticket.findMany();
const filtered = allTickets.filter(t => t.status === 'open');
```

### ✅ Solution — Filtrer au DB

```typescript
const tickets = await prisma.ticket.findMany({
  where: {
    status: 'open',
    // Multi-category filter (OR logic)
    ticketCategory: {
      category: {
        id: { in: [1, 2, 3] },  // ← IN clause, pas OR/AND
      },
    },
  },
  include: {
    ticketCategory: {
      include: { category: true },  // ← 1 query, JOIN at DB level
    },
  },
  orderBy: { createdAt: 'desc' },
});
```

**Performance** :
- `WHERE` au DB (Prisma compilé en SQL)
- `include` avec JOINs
- Pagination avec LIMIT/OFFSET

---

## 9. Checklist Pre-Deploy

- [ ] `.env` contient DATABASE_URL avec vraies valeurs (pas `<PLACEHOLDERS>`)
- [ ] Tous les IDs (PK, FK) utilisent le MÊME type (UUID ou INT)
- [ ] Validators Zod alignés avec types Prisma
- [ ] Relations explicitement nommées (`@relation("...")`)
- [ ] Seed utilise `upsert` pour idempotence
- [ ] PrismaClient utilisé via singleton seulement
- [ ] `npx prisma generate` exécuté après schema change
- [ ] `npx prisma db push` (dev) ou `npx prisma migrate deploy` (prod)
- [ ] Aucun `as any` en code relatif à Prisma
- [ ] Tests unitaires mockent Prisma (pas de DB réelle)

---

## References

- [Prisma Relations](https://www.prisma.io/docs/concepts/relations)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma ClientConstructor](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#prismaclient)
