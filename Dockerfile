# --- Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache python3 py-pip g++ make
WORKDIR /app

# --- Builder ---
FROM base AS builder
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json packages/shared/package.json packages/tsconfig-base/package.json ./
RUN pnpm install --frozen-lockfile
COPY apps/api/src ./apps/api/src
COPY apps/api/drizzle.config.ts apps/api/
COPY packages/shared/src ./packages/shared/src
WORKDIR /app/apps/api
RUN pnpm install --ignore-scripts && npm rebuild better-sqlite3 && npx tsc --project tsconfig.json

# --- Runner ---
FROM node:20-alpine AS runner
RUN apk add --no-cache python3 py-pip g++ make
WORKDIR /app
ENV DATABASE_URL=file:/data/daily-digest.db
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

# --- Migrator ---
FROM base AS migrator
RUN npm install -g pnpm
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
CMD ["node", "dist/index.js"]


# --- Migrator ---
FROM node:20-alpine AS migrator
RUN apk add --no-cache python3 py-pip g++ make
WORKDIR /app
ENV DATABASE_URL=file:/data/daily-digest.db
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
CMD ["node", "dist/index.js"]
