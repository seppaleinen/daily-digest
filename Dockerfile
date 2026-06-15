# ─────────────────────────────────────────────────────────────────────────────
# daily-digest monorepo Docker build
#
# This root Dockerfile is a reference template.
# Each service has its own optimized multi-stage Dockerfile:
#
#   apps/api/Dockerfile       → API server (Hono + SQLite)
#   apps/spool/Dockerfile     → Content pipeline service
#   apps/reader/Dockerfile    → Vite frontend (Nginx)
#
# Build commands:
#   docker build -t daily-digest-api:latest     --target runner -f apps/api/Dockerfile .
#   docker build -t daily-digest-api:migrator    --target migrator -f apps/api/Dockerfile .
#   docker build -t daily-digest-spool:latest    --target runner -f apps/spool/Dockerfile .
#   docker build -t daily-digest-reader:latest   -f apps/reader/Dockerfile .
# ─────────────────────────────────────────────────────────────────────────────
