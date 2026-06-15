FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
# Copy root lockfile and all package.jsons
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY apps/spool/package.json ./apps/spool/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --filter @daily-digest/spool --frozen-lockfile

# --- Production Stage ---
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/apps/spool/package.json ./apps/spool/
COPY --from=base /app/apps/spool/src ./src
# Expose port
EXPOSE 3001
# Start the service
CMD ["pnpm", "dev"]
