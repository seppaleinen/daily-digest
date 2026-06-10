FROM node:22-alpine

RUN apk add --no-cache yt-dlp ffmpeg

# Create a non-root user with UID 1000
RUN addgroup -g 1000 spooluser && \
    adduser -u 1000 -G spooluser -D spooluser

USER spooluser

WORKDIR /app

# Copy package files
COPY --chown=spooluser:spooluser package.json pnpm-lock.yaml* ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY --chown=spooluser:spooluser src ./src

# Expose port
EXPOSE 3000

# Start the service
CMD ["pnpm", "dev"]
