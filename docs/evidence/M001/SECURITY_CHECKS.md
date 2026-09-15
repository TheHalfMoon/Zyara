# M001 Security Checks

- No PHI, no provider credentials, no production secrets anywhere in the change surface.
- Readiness `/ready` returns only `{status, database, build, version}` — verified by
  test 4 (no connection strings, no env dump). `/live` returns only `{alive:true}`.
- Dev database credentials (`zyara_dev` / `zyara_dev_only`) are local-only defaults,
  documented non-production, never reusable in production (no prod environment exists).
- Secret pattern scan: clean (see TEST_RESULTS.md §12).
- Dependency review: see TEST_RESULTS.md §11. No install scripts of concern in the
  final direct set; Next.js postinstall noted (esbuild/sharp optional binaries).
- No auth, no network ingress beyond localhost dev ports, no deployment added.
- Residual: Docker Desktop daemon corrupted on this host (dev-only availability issue);
  postcss/esbuild transitive advisories pinned by Next.js (dev/build-time only).
