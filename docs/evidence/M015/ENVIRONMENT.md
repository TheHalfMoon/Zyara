# M015 Environment

- Base SHA: e2d8afa4b4e0066c48f51775580b7149d9f927dc (origin/main)
- Branch: muse/M015-holds-expiry
- Node v22.23.1, tsx 4.19.2, tsc 5.6.3, eslint 9.14.0 (repo-pinned toolchain)
- No local PostgreSQL; local Docker daemon storage corrupted
  (read-only file system / I/O errors on pull, images, ps) — real-DB proof
  runs in CI on postgres:16. Recorded honestly; not silently skipped.
