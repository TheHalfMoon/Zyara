# M001 Scope Review

In scope (per M001 contract): minimal TS workspace (web/api/worker/domain/contracts),
PostgreSQL/PostGIS dev service definition, readiness endpoint, locale/direction
contract, import boundaries + automated check, CI workflow, evidence.

Explicitly NOT implemented (deferred to later tasks): authentication, Keycloak, RLS,
provider graph/onboarding, search, OpenSearch, map, appointment engine, booking, FHIR,
reviews, analytics, AI, voice, waitlist, SMS, patient data, provider integrations,
clinical workflows, payments. Verified: none of these terms appear as implemented
modules; `grep` over the change surface shows only evidence-doc mentions.

No donor platform code copied. Direct dependencies are ordinary framework packages
(Next.js, React, Fastify, pg, tsx, TypeScript, ESLint) with pinned versions + lockfile.

Observed paths (new files): package.json, pnpm-workspace.yaml, pnpm-lock.yaml,
tsconfig.base.json, eslint.config.mjs, .nvmrc, .gitignore, apps/web/**, apps/api/**,
apps/worker/**, packages/domain/**, packages/contracts/**, tests/m001/**,
scripts/check-boundaries.mjs, infra/dev/docker-compose.yml,
.github/workflows/m001-ci.yml, DEVELOPMENT.md, docs/evidence/M001/**.
No founder/canonical docs modified.
