---
applyTo: "**/schema.prisma,**/migrations/**,**/seed.ts"
---

# SQL Database Design Standards & Best Practices (PostgreSQL)

## 1. Identifiants et Clés Primaires (`PK`)

* **Format** : Utiliser exclusivement des identifiants non-prévisibles pour les clés exposées. Le format  **UUID v4/v7** est requis.
* **Type de donnée** : Utiliser `UUID`.
* **Séquences** : Ne jamais utiliser de `SERIAL` ou `BIGSERIAL` (auto-increment) pour des entités métier accessibles via API afin d'éviter les attaques par énumération (IDOR).

## 2. Timestamps et Audit

* **Systématiques** : Chaque table doit comporter les colonnes de traçabilité suivantes :
* `created_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* `updated_at` : `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

* **Mise à jour automatique** : L'actualisation de `updated_at` doit être gérée par un trigger `BEFORE UPDATE` pour garantir l'intégrité sans dépendre de la couche applicative.

## 3. Conventions de Nommage

| Élément | Convention | Exemple |
| --- | --- | --- |
| **Tables** | `snake_case` au pluriel | `users`, `audit_logs` |
| **Colonnes** | `snake_case` au singulier | `author_id`, `is_active` |
| **Enums** | `snake_case` (Nom et Valeurs) | `ticket_status` (`in_progress`) |
| **Contraintes** | `{table}_{colonne}_{type}` | `users_email_unique` |

## 4. Intégrité Référentielle (`FK`)

* **Déclaration** : Les clés étrangères doivent être explicitement nommées et pointées vers la clé primaire de la table parente.
* **Action au Delete** :
* `ON DELETE CASCADE` : Pour les entités dépendantes n'ayant pas de sens seules (ex: items d'une commande).
* `ON DELETE RESTRICT` : Pour les données à valeur d'archive ou comptable (ex: factures, logs).


* **Tables de Jointure** : Pour les relations Many-to-Many, créer une table pivot explicite avec ses propres colonnes d'audit (`created_at`).

## 5. Indexation et Performance

* **Stratégie d'indexation** :
* Indexer systématiquement les clés étrangères (`FK`).
* Indexer les colonnes fréquemment utilisées dans les clauses `WHERE` et `ORDER BY`.


* **Index Composites** : Ordonner les colonnes de la plus sélective à la moins sélective.
* **Types d'index** :
* `B-TREE` par défaut.
* `GIN` pour les colonnes de type `JSONB` ou la recherche textuelle.


* **Cardinalité** : Éviter d'indexer des colonnes à faible cardinalité (ex: booléens seuls).

## 6. Types de Données Préconisés

| Usage | Type PostgreSQL | Raison |
| --- | --- | --- |
| **Montants Monétaires** | `DECIMAL(12,2)` | Évite les erreurs d'arrondi des flottants. |
| **Dates** | `TIMESTAMPTZ` | Stockage avec fuseau horaire (UTC). |
| **Données Flexibles** | `JSONB` | Performance supérieure au `JSON` simple et indexation possible. |
| **Texte** | `TEXT` | Préférable au `VARCHAR(N)` sauf contrainte métier stricte. |

## 7. Soft Delete

* **Implémentation** : Utiliser une colonne `deleted_at TIMESTAMPTZ` (nullable).
* **Indexation** : Ajouter un index partiel sur les enregistrements actifs pour optimiser les lectures :
`CREATE INDEX idx_active_rows ON table (columns) WHERE deleted_at IS NULL;`

## 8. Stratégies de Requêtage

* **Pagination** :
* Utiliser `LIMIT` / `OFFSET` uniquement pour les petits volumes.
* Privilégier la **pagination par curseur** (Keyset pagination) avec une clause `WHERE id > last_id` pour la performance sur les grandes tables.


* **Sélection** : Ne jamais utiliser `SELECT *`. Lister explicitement les colonnes nécessaires pour réduire la charge I/O et éviter l'exposition de données sensibles.
* **Atomicité** : Regrouper les opérations liées dans des blocs `BEGIN;` ... `COMMIT;`.
