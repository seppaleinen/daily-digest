# --- STAGE 1: Build ---
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/reader/package.json ./apps/reader/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter reader build

# --- STAGE 2: Production ---
FROM nginx:stable-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=build /app/apps/reader/dist .
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
