FROM node:22-alpine
RUN corepack enable
WORKDIR /app
# Copy root lockfile and all package.jsons
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY apps/spool/package.json ./apps/spool/
RUN pnpm install --filter @daily-digest/spool --frozen-lockfile

# Expose port
EXPOSE 3001

# Start the service
CMD ["pnpm", "dev"]

