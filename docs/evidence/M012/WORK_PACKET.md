# M012 Work Packet (immutable)

- Task: M012 — Deliver trustworthy profiles and accessible map/list discovery
- Task contract: docs/research/muse-task-contracts.json (M012, deps [M005, M008, M011])
- Source refs: A04, A21, S104, C29. Requirements: R03, R04, R06.
- Base SHA: 781904c10184178bbfc84753fdccebcd6c1bab5a (origin/main, verified live 2026-09-15)
- Dependency evidence: M005 (PR #11), M008 (PR #17), M011 (PR #23)
- Allowed surface: apps/web/profiles, apps/web/map, packages/geospatial,
  tests/m012, docs/evidence/M012, .github/workflows/m012-ci.yml
- Excluded: tile procurement, geocoding vendor, booking actions, real locations
- Acceptance: (1) list offers all map actions; (2) verified fields show exact
  scope/freshness; (3) precise location permission optional
- Tests: map/list filter parity + geospatial fixtures; keyboard, low-bandwidth,
  location-denied tests
- Security/privacy: no home/patient locations in indexes or URLs
- Localization: native Arabic layout, multilingual names, unambiguous formats
- Observability: profile/directions/phone clicks as distinct minimized events
- Failure modes: wrong pin, tile outage, unverified price/insurance
- Recovery: list/address fallback; suppress inaccurate coordinates
- Risk: medium
