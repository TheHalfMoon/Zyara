# Zyara local development (M001 synthetic foundation)

Prerequisites: Node >=22.12.0, pnpm 9.12.0, Docker (for PostgreSQL/PostGIS).

```bash
pnpm install --frozen-lockfile
docker compose -f infra/dev/docker-compose.yml up -d
pnpm dev
```

- Web: http://localhost:3100 (Arabic RTL shell, `ar` default)
- API liveness: http://localhost:4100/live → `{"alive":true}`
- API readiness: http://localhost:4100/ready →
  `healthy`/`reachable` with DB up, `not_ready`/`unavailable` with DB down.
- Stop/reset: `docker compose -f infra/dev/docker-compose.yml down`
  (`-v` drops dev data; dev-only, never PHI).

Checks: `pnpm typecheck`, `pnpm lint`,
`pnpm --filter @zyara/m001-tests test`, `node scripts/check-boundaries.mjs`.
Module boundaries: `apps/*` may import `@zyara/contracts` and `@zyara/domain`;
`packages/domain` stays framework/infrastructure free; apps never import each other.
