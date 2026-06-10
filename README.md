# Daily Digest

A personal daily digest application — collect items (emails, podcasts, YouTube videos) tagged by date and read them back in a clean reader interface.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Reader SPA │     │   Hono API   │     │   SQLite DB  │
│             │◄────│              │◄────│              │
│ Date sidebar│     │ /digest/...  │     │ .sqlite file │
│ Main pane   │     │              │     │              │
└─────────────┘     └──────────────┘     └──────────────┘
        ▲                    ▲                   ▲
        │                    │                   │
    Traefik Ingress      Authentik proxy     PVC (Synology NFS)
```

- **Monorepo**: pnpm workspaces + Turborebo, TypeScript throughout
- **API**: Hono with Drizzle ORM + better-sqlite3
- **Validation**: Zod schemas shared in `packages/shared`
- **Auth**: Authentik proxy for external access; internal cluster services unauthenticated
- **Deploy**: K8s on home lab (K3s), Traefik for ingress/TLS

## Quick Start

```bash
# Install dependencies
pnpm install

# Run API locally (auto-migrates via Drizzle)
cd apps/api && pnpm dev

# Run all tests
pnpm test

# Build everything
pnpm build
```

## Project Structure

```
daily-digest/
├── apps/api/src/          # Hono app, routes, DB layer
│   ├── db/schema.ts       # Drizzle schema (SQLite)
│   └── routes/digest.ts   # API route handlers
├── packages/shared/src/   # Zod schemas + TypeScript types
│   └── schemas.ts         # Shared validation and type definitions
├── deploy/k8s/            # Kubernetes manifests for deployment
```

## API Endpoints

| Method | Path                | Description              |
|--------|---------------------|--------------------------|
| POST   | /digest/items       | Upsert an item           |
| GET    | /digest             | List all dates with digests |
| GET    | /digest/:date       | Get items for a date     |

### Create/Update Item Request Body

```json
{
  "source": "email",        // "email" | "podcast" | "youtube"
  "title": "Subject line",
  "html": "<p>Content here</p>"
}
```

## Testing

Three-tier testing strategy — unit, integration, and E2E:

```bash
pnpm test        # All tests
pnpm test:unit   # Unit tests only
pnpm test:integ  # Integration tests only
pnpm test:e2e    # E2E tests only
```

See [AGENTS.md](./AGENTS.md) for detailed testing conventions.

## Deployment

### Docker

```bash
# Build the Docker image
docker build -t daily-digest-api .

# Run locally with a SQLite volume mount
docker run --rm -p 3000:3000 \
  -v $(pwd)/data:/data \
  -e DATABASE_URL=file:/data/daily-digest.db \
  daily-digest-api
```

### Kubernetes (Kustomize)

```bash
# Deploy to production namespace
kubectl apply -k deploy/k8s/overlays/prod

# Or for local development
kubectl apply -k deploy/k8s/overlays/dev
```

The deployment includes:
- **initContainer**: Runs `drizzle-kit push` before the main container starts (idempotent, safe for rolling updates)
- **PersistentVolumeClaim**: SQLite data stored on Synology NFS-backed PVC
- **ClusterIP Service**: Internal-only service for Traefik to route traffic
- **Traefik IngressRoute**: Handles TLS termination and routing

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database file path (K8s: `/data/daily-digest.db`) | `file:/data/daily-digest.db` |
