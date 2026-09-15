# M001 Work Packet — Synthetic development foundation

- Task ID: M001
- Task contract: `docs/canonical/ZYARA_MUSE_EXECUTION_HANDOFF.md` (M001, canonical baseline 2026-09-13, base SHA 0c4d47b)
- Canonical plan: `docs/canonical/ZYARA_CANONICAL_BUILD_PLAN.md`
- Base Git SHA: e420e163d46e3f53e1a862441de26be875a1df85 (`main`, verified live 2026-09-15)
- Dependencies: none
- Allowed change surface: `apps/web`, `apps/api`, `apps/worker`, `packages/domain`,
  `packages/contracts`, `infra/dev`, `scripts/`, `tests/m001`, `.github/workflows`,
  `docs/evidence/M001`, root workspace config only. No product features, no auth,
  no booking/search/AI/provider code.
- Acceptance criteria: (1) clean checkout installs from lockfile and starts synthetic stack;
  (2) readiness distinguishes unavailable DB from healthy process; (3) CI runs
  type/lint/focused smoke checks and records exact versions.
- Tests: frozen-lockfile install; typecheck; lint; focused unit tests (locales, RTL/LTR,
  readiness interpretation, boundaries); DB healthy/down/restart; worker lifecycle;
  import-boundary check (negative case: forbidden import fails the check).
- Security/privacy: no PHI; local-only defaults; dev credentials `zyara_dev` /
  `zyara_dev_only` unmistakably non-production; readiness exposes no secrets.
- Localization: five locale identifiers + `ar=rtl`, others `ltr` contract only.
- Observability: `/live` + `/ready` with safe build/version identifiers only.
- Failure modes: unsupported runtime, failing install, missing DB, scope expansion,
  broken Docker Desktop (observed), full disk (observed, mitigated with temp cleanup).
- Risk level: medium. Recovery: revert this bounded scaffold; founder docs untouched.
- Source references: A01, A02, A03, A25, S017, S115. No donor platform code copied.
- Tool versions: Node v22.23.1 (>=22.12.0), pnpm 9.12.0, TypeScript 5.6.3,
  Next.js 15.5.25, React 19.3.0, Fastify 5.12.4, pg 8.13.1, tsx 4.19.2,
  ESLint 9.14.0, DB image postgis/postgis:16-3.4 (pinned in compose),
  Docker 29.7.2 (daemon storage corrupted on this host — see RESULT.md).
- SpecGrain decision: bounded scope + independent evidence methods adopted;
  no native SpecGrain CLI/runtime claims.
