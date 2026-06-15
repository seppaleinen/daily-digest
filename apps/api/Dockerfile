FROM node:22-alpine AS base

# Install corepack to use pnpm
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy root lockfile and all package.jsons
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --filter @daily-digest/api --frozen-lockfile

# --- Production Stage ---
FROM node:22-alpine AS production

RUN corepack enable
WORKDIR /app

# Copy only necessary files from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/src ./src

# Expose the API port
EXPOSE 3001

# Start the service
CMD ["pnpm", "start"]
