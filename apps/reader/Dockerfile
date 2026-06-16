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
# Pre-create cache dirs and make them writable by UID 1000 (Helm securityContext)
RUN mkdir -p /var/cache/nginx /var/run && \
    chown -R 1000:1000 /var/cache/nginx /var/run && \
    touch /var/run/nginx.pid && \
    chown 1000:1000 /var/run/nginx.pid
WORKDIR /usr/share/nginx/html
COPY --from=build --chown=1000:1000 /app/apps/reader/dist .
USER 1000
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
