FROM node:22-alpine AS base

# Install corepack to use pnpm
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

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
