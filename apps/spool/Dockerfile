# --- STAGE 1: Base (Build Essentials) ---
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++
RUN corepack enable
WORKDIR /app

# --- STAGE 2: Dependencies ---
FROM base AS deps
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/spool/package.json ./apps/spool/
COPY packages/shared/package.json ./packages/shared/
# CRITICAL: Do NOT use --ignore-scripts; better-sqlite3 requires native compilation
RUN pnpm install --frozen-lockfile

# --- STAGE 3: Builder ---
FROM deps AS builder
COPY . .
RUN pnpm --filter @daily-digest/spool build

# --- STAGE 4: Production Dependencies ---
FROM base AS prod-deps
RUN corepack enable
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/spool/package.json ./apps/spool/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --prod --frozen-lockfile

# --- STAGE 5: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
# node:20-alpine already has a node user with UID 1000
USER node
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/spool/dist ./apps/spool/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
EXPOSE 3001
CMD ["node", "apps/spool/dist/index.js"]
