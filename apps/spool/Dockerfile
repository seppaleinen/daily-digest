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
RUN pnpm install --prod --frozen-lockfile --config.node-linker=hoisted

# --- STAGE 5: Runner ---
FROM node:20-alpine AS runner
RUN mkdir -p /data && chown node:node /data
WORKDIR /app
COPY --from=prod-deps /app/package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY apps/spool ./apps/spool
# pnpm hoisted linker skips workspace symlinks with --prod; create manually
RUN mkdir -p node_modules/@daily-digest && ln -sf /app/packages/shared node_modules/@daily-digest/shared
USER node
EXPOSE 3001
CMD ["npx", "tsx", "apps/spool/src/index.ts"]
