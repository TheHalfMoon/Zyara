# M039 result — legacy SIU ingestion and batch/calendar fallback

- Base SHA: 0674234. Dependencies: M036, M007, M004 (all evidenced).
  Child packet M039.1 (SIU transport parse) covered inline in siu.ts.
- Implementation: packages/legacy-ingest (siu.ts); tests/m039/siu.test.ts.
  No migration (reuses external_operations ledger for any follow-on ops).
- Semantics: MSH/EVN/PID/SCH validation; S12 event gate; AA/AE/AR ACK
  builder; unknown segments tolerated; invalid messages rejected;
  fallback modes honest (invitation-only, no holds, no clinical authority).
- Synthetic evidence only. No live feed, no PHI.
- Commands:
  - pnpm --filter @zyara/m039-tests test → 4 pass, 0 fail
  - pnpm --filter @zyara/legacy-ingest typecheck → clean
  - pnpm --filter @zyara/legacy-ingest lint → clean
  - pnpm --filter @zyara/m039-tests lint → clean
- Defects found and fixed (regression covered by the same suite):
  1. SCH time fields read from wrong HL7 positions (10/11 → 3/4).
  2. Segment splitter missed lone-CR separators used by real HL7 feeds
     (`/\r?\n/` → `/\r\n|\r|\n/`).
