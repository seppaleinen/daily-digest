# --- Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache python3 py-pip g++ make
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json packages/shared/package.json packages/tsconfig-base/package.json ./
RUN pnpm install --frozen-lockfile

# --- Builder ---
FROM deps AS builder
COPY apps/api/src ./apps/api/src
COPY apps/api/drizzle.config.ts apps/api/
COPY packages/shared/src ./packages/shared/src
RUN npx turbo build

# --- Production Dependencies ---
FROM base AS prod-deps
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json packages/shared/package.json packages/tsconfig-base/package.json ./
RUN pnpm install --prod --frozen-lockfile

# --- Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV DATABASE_URL=file:/data/daily-digest.db
# Copy the prod dependencies (includes symlinks)
COPY --from=prod-deps /app/node_modules ./node_modules
# Copy the build artifacts to their package directories so symlinks work
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]

# --- Migrator ---
FROM base AS migrator
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json packages/shared/package.json packages/tsconfig-base/package.json ./
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
CMD ["node", "apps/api/dist/index.js"]

