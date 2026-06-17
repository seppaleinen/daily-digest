# --- STAGE 1: Build ---
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/reader/package.json ./apps/reader/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN pnpm --filter reader build

# --- STAGE 2: Production ---
FROM nginx:stable-alpine AS runner
# Install envsubst (part of gettext)
RUN apk add --no-cache gettext
# Create cache dirs and make nginx config writable by UID 1000
RUN mkdir -p /var/cache/nginx /var/run && \
    chown -R 1000:1000 /var/cache/nginx /var/run && \
    touch /var/run/nginx.pid && \
    chown 1000:1000 /var/run/nginx.pid && \
    rm -f /etc/nginx/conf.d/default.conf && \
    mkdir -p /etc/nginx/templates /etc/nginx/conf.d && \
    chown 1000:1000 /etc/nginx/templates /etc/nginx/conf.d
WORKDIR /usr/share/nginx/html
COPY --from=build --chown=1000:1000 /app/apps/reader/dist .
COPY --chown=1000:1000 apps/reader/nginx.conf.template /etc/nginx/templates/
# Default API URL (in-cluster K8s service)
ENV API_URL=http://daily-digest-api.daily-digest.svc.cluster.local:3000
USER 1000
EXPOSE 80
CMD ["sh", "-c", "envsubst '${API_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
