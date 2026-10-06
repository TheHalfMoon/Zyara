# GEO-01C pstack Evidence

`/ps-review` interface: fresh-context judges over the diff (`~/.agents/skills/ps-review/SKILL.md`). The security trigger applies (authorization through RLS, grants and actor gates, and raw external input reaching SQL), so one fresh-context judge carried all four bars: correctness, parsimony, product and security. Delta cycles are capped at 3.

## Panel on `origin/main...a4187cc`

Three must-fix items:

1. **Broken dollar quoting.** Two 049 function bodies had lost a `$`. Fixed in `5b2e794`; CI had independently failed on it.
2. **Wrong expected SQLSTATE.** The smoke's `unlink-mismatch` expected 23503, but the unique index fires first (23505). Fixed in `477953d`.
3. **Small-step walk.** Steps of 50 m or less, each measured from the previous point, could walk a facility any distance with no correction record. Fixed in `477953d` by measuring from an audited anchor.

Also applied: the work packet now names the sixth table, and the provider-declared-id and reviewer-identity boundaries are recorded as forward requirements.

## Delta cycle 1 (`a4187cc..477953d`)

The three must-fixes are resolved. One new must-fix: with an UNKNOWN root and no correction, there is no anchor, so the audit was skipped (a regression).

Fixed in `14af224`:

- an oldest-point fallback;
- anchors are now required parameters in TypeScript;
- the 1 000 m reviewer rule also applies to drift from the last reviewed anchor;
- `geo_anchor_point` moved after `geo_coordinate_corrections`, fixing CI 42P01.

## Delta cycle 2 (`477953d..14af224`)

No must-fix. Worth-considering: Zyara re-verifications do not reset the reviewed anchor. This is accepted as conservative and recorded in the work packet.

## Delta cycle 3 (`14af224..b5cb0d1`)

One must-fix. The isolation guard allowed SERIALIZABLE, but SSI does not protect a SERIALIZABLE writer that waits on a READ COMMITTED writer, so it could fail open. The evidence also overclaimed SERIALIZABLE safety.

Fixed in `432f61d`:

- both guards accept READ COMMITTED only;
- the smoke proves both guards at REPEATABLE READ and SERIALIZABLE;
- the wording is corrected, including "a dispute cannot *materially* move a point".

The cycle cap was reached. This last fix is mechanical; it was verified by exact-head CI (`432f61d`, all three PostGIS smoke PASS lines) and a final Jev run, not by a fourth judge cycle.

panel: light ✓ combined (session model, fresh-context subagent) · security ✓ (inline bar) · deltas: 3 cycles (cap)
