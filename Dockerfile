# --- Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache python3 py-pip g++ make
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
# Copy all package.jsons and configs from all workspaces
COPY apps/api/package.json apps/api/tsconfig* ./apps/api/
COPY apps/reader/package.json apps/reader/tsconfig* ./apps/reader/
COPY apps/reader/vite.config* ./apps/reader/
COPY apps/spool/package.json apps/spool/tsconfig* ./apps/spool/
COPY packages/shared/package.json packages/shared/tsconfig* ./packages/shared/
COPY packages/tsconfig-base/package.json packages/tsconfig-base/tsconfig* ./packages/tsconfig-base/
RUN pnpm install --frozen-lockfile

# --- Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache python3 py-pip g++ make
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
# Copy all package.jsons and configs from all workspaces
COPY apps/api/package.json apps/api/tsconfig* ./apps/api/
COPY apps/reader/package.json apps/reader/tsconfig* ./apps/reader/
COPY apps/reader/vite.config* ./apps/reader/
COPY apps/spool/package.json apps/spool/tsconfig* ./apps/spool/
COPY packages/shared/package.json packages/shared/tsconfig* ./packages/shared/
COPY packages/tsconfig-base/package.json packages/tsconfig-base/tsconfig* ./packages/tsconfig-base/
RUN pnpm install --frozen-lockfile

# --- Builder ---
FROM deps AS builder
# Copy all source and config files for build
COPY apps/api/src ./apps/api/src
COPY apps/reader/src ./apps/reader/src
COPY apps/reader/vite.config* ./apps/reader/
COPY apps/reader/index.html ./apps/reader/
COPY apps/spool/src ./apps/spool/src
COPY packages/shared/src ./packages/shared/src
RUN npx turbo build

# --- Production Dependencies ---
FROM base AS prod-deps
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/reader/package.json apps/reader/
COPY apps/spool/package.json apps/spool/
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig-base/package.json packages/tsconfig-base/
RUN pnpm install --prod --frozen-lockfile

# --- Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV DATABASE_URL=file:/data/daily-digest.db
# Copy the prod dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
# Copy the build artifacts from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/reader/dist ./apps/reader/dist
COPY --from=builder /app/apps/spool/dist ./apps/spool/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]

# --- Migrator ---
FROM base AS migrator
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig-base/package.json packages/tsconfig-base/
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
CMD ["node", "apps/api/dist/index.js"]


# --- Production Dependencies ---
FROM base AS prod-deps
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/reader/package.json apps/reader/
COPY apps/spool/package.json apps/spool/
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig-base/package.json packages/tsconfig-base/
RUN pnpm install --prod --frozen-lockfile

# --- Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV DATABASE_URL=file:/data/daily-digest.db
# Copy the prod dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
# Copy the build artifacts from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/reader/dist ./apps/reader/dist
COPY --from=builder /app/apps/spool/dist ./apps/spool/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]

# --- Migrator ---
FROM base AS migrator
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig-base/package.json packages/tsconfig-base/
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
CMD ["node", "apps/api/dist/index.js"]
