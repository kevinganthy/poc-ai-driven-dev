# ── Stage: development (used by docker compose) ─────────────────────────────
FROM node:20-alpine AS development

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma/ ./prisma/
RUN npx prisma generate

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# src/ is bind-mounted at runtime by docker compose
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "run", "dev"]

# ── Stage: builder (production compile) ──────────────────────────────────────
FROM development AS builder

COPY src/ ./src/
RUN npm run build

# ── Stage: runner (production image) ─────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl && addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER appuser
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/app.js"]
