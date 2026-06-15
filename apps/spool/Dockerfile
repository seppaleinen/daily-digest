FROM node:22-alpine

# Use the existing node user (UID 1000) instead of creating a new one to avoid conflicts
USER node

WORKDIR /app

# Copy package files
COPY --chown=node:node package.json pnpm-lock.yaml* ./

# Install dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source code
COPY --chown=node:node src ./src

# Expose port
EXPOSE 3001

# Start the service
CMD ["pnpm", "dev"]
