# Stage 1: Build stage
FROM node:22-alpine AS build-stage
RUN corepack enable
WORKDIR /app
# Copy root lockfile and all package.jsons
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY apps/reader/package.json ./apps/reader/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --filter @daily-digest/reader

# Copy source code
COPY . .
RUN pnpm build

# Stage 2: Production stage
FROM nginx:stable-alpine
# Copy build artifacts to nginx html directory
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Copy custom nginx config if needed (we'll assume default for now)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
