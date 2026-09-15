# M014 Environment

- Base SHA: 3cf7c0b826a0cac029abf0d4b955e17d5f247634 (origin/main)
- Branch: muse/M014-availability
- Node v22.23.1, tsx 4.19.2, tsc 5.6.3, eslint 9.14.0 (repo-pinned toolchain)
- ICU tzdata: runtime Node build (behavior verified against known 2026
  Berlin/New York transitions in tests; tzdb label recorded on schedules)
- No local PostgreSQL (residual, same as M013): migration validated
  structurally + by SQL-text guards; CI + review qualify before merge.
