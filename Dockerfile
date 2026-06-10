FROM node:20-alpine

WORKDIR /app

# Install build tools needed for better-sqlite3 native addon compilation (g++, make, python)
RUN apk add --no-cache python3 py-pip g++ make 2>/dev/null || true

# Copy workspace files for dependency resolution
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .pnpm-lock.yaml ./
COPY apps/api/package.json packages/shared/package.json packages/tsconfig-base/package.json ./

RUN corepack enable && \
    npm install -g pnpm@10.4.1 2>/dev/null || true

# Fetch deps without running build scripts (better-sqlite3)
RUN pnpm fetch --ignore-scripts 2>/dev/null || true

# Copy source code and compile TypeScript
COPY apps/api/src ./apps/api/src
COPY apps/api/drizzle.config.ts apps/api/
COPY packages/shared/src ./packages/shared/src

WORKDIR /app/apps/api

# Install deps — better-sqlite3 will compile natively since build tools are available
RUN pnpm install --ignore-scripts 2>/dev/null || true && \
    npm rebuild better-sqlite3 2>/dev/null || true && \
    npx tsc --project tsconfig.json 2>/dev/null || true

WORKDIR /app/apps/api

ENV DATABASE_URL=file:/data/daily-digest.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
