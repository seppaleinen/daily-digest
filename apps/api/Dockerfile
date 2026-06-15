FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# Copy root files
COPY package.json pnpm-lock.yaml ./

# Copy all package.json files to satisfy workspace resolution
COPY apps/api/package.json ./apps/api/
COPY apps/spool/package.json ./apps/spool/
COPY apps/reader/package.json ./apps/reader/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies for the specific service
RUN pnpm install --filter @daily-digest/api --frozen-lockfile

# --- Production Stage ---
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/apps/api/package.json ./apps/api/
COPY --from=base /app/apps/api/src ./src
EXPOSE 3001
CMD ["pnpm", "start"]
