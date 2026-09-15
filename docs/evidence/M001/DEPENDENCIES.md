# M001 Dependencies

Pinned direct dependencies (exact versions in package.json + `pnpm-lock.yaml`):

| Package | Version | Role | License |
|---|---|---|---|
| next | 15.5.25 | web framework | MIT |
| react / react-dom | 19.3.0 | UI | MIT |
| fastify | 5.12.4 | API server | MIT |
| pg | 8.13.1 | PostgreSQL driver | MIT |
| tsx | 4.19.2 | dev runner | MIT |
| typescript | 5.6.3 | typecheck | Apache-2.0 |
| eslint | 9.14.0 | lint | MIT |
| typescript-eslint | 8.12.0 | typed lint | MIT |
| @types/node / pg / react | 22.9.0 / 8.11.0 / 19.0.1 | types | MIT |

Upgrades during M001 (advisory-driven, minor only): next 15.0.3→15.5.25,
react 19.0.0→19.3.0, fastify 5.2.0→5.12.4. Removed `@cyclonedx/cyclonedx-npm`
(unpatched transitive criticals, dev-only tool).

Audit trail: 65 findings (6 critical) → 6 findings (0 critical; 1 low,
3 moderate, 2 high — transitive postcss/esbuild pinned by Next.js,
dev/build-time only). Full outputs summarized in TEST_RESULTS.md §11.

Install scripts observed: esbuild, sharp, libxmljs2 (transitive, removed with
cyclonedx dep), Next.js telemetry disabled by default in CI (no login).
No unreviewed major-version changes. SBOM decision: see TEST_RESULTS.md §13.
