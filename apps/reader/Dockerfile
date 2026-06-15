# Stage 1: Build stage
FROM node:22-alpine AS build-stage
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

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
