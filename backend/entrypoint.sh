#!/bin/sh
set -e

echo "Pushing Prisma schema to database..."
npx prisma db push --accept-data-loss

echo "Seeding database..."
npx ts-node --project tsconfig.json prisma/seed.ts

echo "Starting application..."
exec "$@"
