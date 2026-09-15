# M001 Test Results (2026-09-15, host Windows, Node v22.23.1, pnpm 9.12.0)

## 1. Frozen-lockfile install — PASS

`pnpm install --frozen-lockfile` succeeds from clean `pnpm-lock.yaml`.

## 2. Typecheck — PASS

`pnpm typecheck` passes for all 7 workspace projects
(root, @zyara/domain, @zyara/contracts, @zyara/api, @zyara/web, @zyara/worker,
@zyara/m001-tests).

## 3. Lint — PASS

`pnpm lint` passes (ESLint 9.14.0 + typescript-eslint 8.12.0).

## 4. Focused unit tests — PASS (5/5)

`pnpm --filter @zyara/m001-tests test` (`tests/m001/foundation.test.mjs`):

- five locale identifiers exist
- arabic rtl, others ltr
- readiness distinguishes reachable vs unavailable
- api ready endpoint exposes no secrets (has /ready + /live, no connectionString)
- worker has start/stop lifecycle

## 5. Module boundary check — PASS (incl. negative case)

`node scripts/check-boundaries.mjs` → "Boundary check passed."
Negative proof: a probe file in `packages/domain/src` importing `fastify`
made the check exit 1; removed after verification.

## 6. Web production build — PASS

`pnpm --filter @zyara/web build` (Next.js 15.5.25) prerenders `/` statically.

## 7. Readiness: DB healthy — PASS (real PostgreSQL 18.4, same dev creds/ports)

`GET /ready` → `{"status":"healthy","database":"reachable","build":"m001-dev","version":"0.1.0"}`

## 8. Readiness: DB down — PASS (mandatory acceptance)

With PostgreSQL stopped, the API process stays up:
`GET /live` → `{"alive":true}`,
`GET /ready` → `{"status":"not_ready","database":"unavailable",...}`.

## 9. Restart: readiness recovers without repair — PASS

After restarting PostgreSQL: `GET /ready` → `healthy`/`reachable` again.

## 10. Worker lifecycle — PASS

`worker started` on launch; SIGTERM/SIGINT handler stops cleanly
(`worker stopped`, exit 0 path in code; observed start, stop via job control).

## 11. Dependency audit — reviewed, actioned

- Initial `pnpm audit`: 65 findings (6 critical: Next.js 15.0.3 RCE/auth-bypass,
  Fastify 5.2.0 content-type bypass, transitive tar/sharp).
- Action: upgraded Next.js 15.0.3 → 15.5.25, React 19.0.0 → 19.3.0,
  Fastify 5.2.0 → 5.12.4 (minor bumps, re-verified type/lint/test/build).
- Removed `@cyclonedx/cyclonedx-npm` from installed deps (its transitive
  libxmljs2/node-tar carried the last 2 criticals, no patch available, dev-only).
- Final `pnpm audit`: 6 findings (0 critical: 1 low, 3 moderate, 2 high),
  all transitive build-time postcss/esbuild pinned by Next.js 15.5.25 —
  accepted residual risk for a local dev foundation, recorded for re-check
  on every dependency change.
- Licenses: MIT/ISC/Apache-2.0 across direct deps (next, react, fastify, pg,
  tsx, typescript, eslint). No copyleft in direct dependency set.

## 12. Secret scan — PASS

Pattern scan (private keys, tokens, API keys, passwords) over workspace
sources/config: no findings. Only synthetic dev password `zyara_dev_only`
in compose + API defaults, unmistakably development-only. No secrets printed
in evidence.

## 13. SBOM

Full CycloneDX generation via `@cyclonedx/cyclonedx-npm` is incompatible with
the pnpm workspace layout (npm-ls fails) and the tool itself carried
unpatched transitive criticals, so it is NOT an installed dependency.
Dependency inventory evidence: `pnpm-lock.yaml` (hash-bound) + `pnpm list`
output captured at verification. A standalone SBOM generation step
(e.g. cdxgen in CI) is a follow-up, not claimed here.
