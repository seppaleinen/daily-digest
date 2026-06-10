# Daily Digest — AGENTS.md

## Architecture Decisions

### SQLite via Drizzle + better-sqlite3
- Single-writer model; Deployment runs 1 replica (no pod affinity issues)
- WAL mode enabled (`PRAGMA journal_mode = WAL`) for read concurrency
- better-sqlite3 sync API is used directly — no WorkerThread needed at this traffic level
- Migrations run in a Kubernetes initContainer via `drizzle-kit push` before the main container starts

### XSS Mitigation
- Client-side sanitization with DOMPurify on render (not at write time, to preserve formatting)
- Server-side CSP header: `default-src 'none'; script-src 'none'; style-src 'unsafe-inline'` — blocks all inline scripts while allowing reader styling

### Upsert Pattern
- Development phase: POST /digest/:date/items upserts by date+title+html (prevents duplicates during development)
- Stable phase: change to dedup error response when row already exists

### Auth Model
- No direct auth on the API — it sits behind an Authentik proxy
- Internal cluster services access without auth; external traffic requires authentication via Authentik

## Project Conventions

### Monorepo Structure
```
daily-digest/
├── apps/api/src/          # Hono app, routes, DB
│   ├── db/schema.ts       # Drizzle schema (NOT in shared)
│   └── routes/digest.ts   # API route handlers
├── packages/shared/src/   # Zod schemas + TS types only
│   └── schemas.ts         # CreateItemSchema + Source type
└── deploy/k8s/            # Kubernetes manifests
```

- Drizzle schema lives in `apps/api/src/db/schema.ts` — the reader never needs it
- Shared package exports Zod schemas and inferred TS types only (`z.infer`)
- No cross-app dependencies beyond shared types

### Naming Conventions
- Database: `YYYY-MM-DD` format for dates (ISO 8601)
- Source enum values: lowercase, underscore-separated if needed (`email`, `podcast`, `youtube`)
- API routes: `/digest/...` prefix only; no RESTful nesting beyond that

### Code Style
- TypeScript strict mode throughout
- No `any` — use explicit types or Zod inference
- Hono route handlers return typed responses with status codes (201 for create/upsert, 400 for validation errors)

## Testing Strategy

**All new features must have tests. This is not optional.** The three-tier model:

### Unit Tests — Complex Function-Level Logic
- **When:** Business logic that doesn't depend on external services or DB (validation functions, upsert algorithms, data transforms)
- **Framework:** Vitest in `apps/api/src/**/*.test.ts` alongside the source files
- **Scope:** Isolated — mock everything outside the function under test

### Integration Tests — Code Integration Points
- **When:** Features that touch multiple layers (e.g., route handler → DB query → response formatting)
- **Framework:** Vitest with `@hono/testing` and an in-memory SQLite instance (`:memory:`)
- **Scope:** One feature boundary end-to-end within the API layer

### E2E Tests — Main and Critical Flows
- **When:** User-facing flows that must work together (create → read → verify)
- **Framework:** Vitest with `@hono/testing` against a real SQLite file-backed DB
- **Scope:** Full request lifecycle over HTTP-like interface; tests are in `e2e/` directory at the monorepo root

### Test Execution
```bash
pnpm test        # Run all tests (unit + integration + e2e)
pnpm test:unit   # Unit tests only
pnpm test:integ  # Integration tests only
pnpm test:e2e    # E2E tests only
```

### Test Patterns to Follow
- One test file per source module or feature boundary
- Describe blocks match the function/feature name; it blocks describe each scenario
- Use `beforeEach` for DB setup (seed data), `afterEach` for teardown
- Name files: `<module>.test.ts` for unit, `*-integration.test.ts` for integration, `<flow-name>.e2e.test.ts` for E2E

## Deployment Practices

### K8s Layout (`deploy/k8s/`)
```yaml
base/
├── deployment.yaml    # Hono app + initContainer for migrations
├── service.yaml       # ClusterIP service (internal only)
└── pvc.yaml           # SQLite volume claim
ingress/
├── ingressroute.yaml  # Traefik IngressRoute
```

- Always use non-root UID/GID 1000 in Dockerfile
- PVC name matches the deployment's volumeMount path (`/app/data`)
- Traefik handles TLS termination; app serves HTTP internally

### Migration Strategy
- `drizzle-kit push` runs in initContainer on every pod start (idempotent — safe for rolling updates)
- Never edit already-deployed migration files — always add new migrations via `drizzle-kit migrate add <name>` and run in a separate init step if needed

### Dockerfile Requirements
- Non-root user (UID/GID 1000)
- Multi-stage build: install deps → copy source → strip devDeps
- SQLite binary must be available for better-sqlite3 native addon

## Home Lab Guardrails
- CloudNativePG is NOT used — SQLite with PVC instead
- NFS-backed volumes on Synology are acceptable if persistence across node failures is needed (PVC storageClass: `nfs`)
- Traefik handles all external routing and TLS
