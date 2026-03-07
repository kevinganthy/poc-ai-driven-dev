# ── Stage: development (used by docker compose) ─────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

# src/ is bind-mounted at runtime by docker compose
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── Stage: builder ────────────────────────────────────────────────────────────
FROM development AS builder

COPY src/ ./src/
RUN npm run build

# ── Stage: runner (production image) ─────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=builder /app/dist ./dist

USER appuser
EXPOSE 5173
CMD ["node", "dist/server.js"]
