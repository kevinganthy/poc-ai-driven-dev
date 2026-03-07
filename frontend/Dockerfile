# ── Stage: development (used by docker compose) ─────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY svelte.config.js vite.config.ts tsconfig.json ./

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

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

USER appuser
EXPOSE 5173
CMD ["node", "build"]
