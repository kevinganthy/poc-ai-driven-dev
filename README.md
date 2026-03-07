# Test technique - Gestion de tickets

> Réaliser une petite application permettant de gérer des tickets.

## Backend (node) :

Créer une API REST permettant de gérer l’entité Ticket. Un ticket doit contenir au minimum un titre, une description, un auteur et un statut.

Fonctionnalités attendues :

- Authentification
- Rôles admin et user
- Un user a seulement accès à ses tickets
- Un admin peut voir tous les tickets
- CRUD Ticket
- Validation côté backend

## Frontend (Svelte)

Créer une interface simple permettant de :

- Se connecter
- Afficher les tickets
- Créer / modifier des tickets
- Filtrer les tickets par statuts

L’objectif n’est pas le design mais la structure de l’application et la gestion des appels API.

## Infra

- Docker
- Pgsql