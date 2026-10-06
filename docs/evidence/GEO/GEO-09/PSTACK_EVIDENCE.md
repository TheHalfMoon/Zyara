# GEO-09 pstack Evidence

`/ps-review` interface: fresh-context judges over the diff (`~/.agents/skills/ps-review/SKILL.md`). The security trigger applies (re-identification of person-derived location aggregates, SECURITY DEFINER paths, RLS), so one fresh-context judge carried all four bars. It read the PR only through the GitHub API, with no local checkout. Delta cycles are capped at 3.

## Panel on `d50c5ef`

Four must-fix items:

1. The smoke's column guard matched `subject_kind`. Fixed in `f9238a4`.
2. Several small hidden cells could be differenced from the released total.
3. Overlapping windows could be differenced.
4. A release at several grids or scopes could be differenced.

Items 2–4 were fixed in `9d4f9c1`:

- a complementary-suppression loop with total withholding;
- a fixed window grid;
- a release header table with one person-numerator release per window, and cells pinned by composite FK.

Worth-considering items applied:

- the export re-checks the cohort;
- the capacity gap checks cohort and window;
- reads are view-only;
- there is a retention purge;
- counts are integers;
- `subjectRef` is required;
- cell parsing uses integer bounds.

## Delta cycle 1 (`d50c5ef..9d4f9c1`)

Three must-fix items:

1. Stored ratios were a re-release path.
2. Windows of different lengths could nest.
3. The purge re-opened a slot for re-release.

Fixed in `ecce18c`:

- ratios are computed on read and never stored;
- a `btree_gist` exclusion allows one person release per source over any overlapping span;
- the purge tombstones headers.

Also applied:

- releases sealed to their transaction;
- complementary suppression re-checked at commit;
- supply pinned to its numerator and source;
- the export refuses facility relabels and small hidden mass;
- `branchId` carried in releases;
- the window length is checked in UTC;
- the OCR rule fix (no nested ternary).

## Delta cycle 2 (`9d4f9c1..ecce18c`)

One must-fix: `SET CONSTRAINTS … IMMEDIATE` could run the deferred hidden-mass check before any cells existed.

Fixed in `0e0544d` with a single `SECURITY DEFINER` write path, `geo_publish_insight()`:

- it writes the header and cells atomically for the current tenant;
- it copies governance from the header;
- it checks the hidden mass inline;
- the application has no table privileges.

Worth-considering item applied: a migrator-managed source registry maps each source to a population, and the exclusion keys on population. Subset and renamed sources are therefore covered.

Accepted product cost, recorded in the packet: disjoint branch scopes and different window lengths over one population cannot coexist for the same span.

## Delta cycle 3 (`ecce18c..0e0544d`)

No must-fix. The judge verified:

- the closure of the bypass;
- `SECURITY DEFINER` safety: no dynamic SQL, pinned `search_path`, tenant taken from the setting, and safe JSON cast and NULL handling;
- `RETURNING INTO` under FORCE RLS for a non-superuser owner;
- the population exclusion;
- every smoke expectation.

Two stale documentation lines were corrected in the final docs commit.

panel: light ✓ combined (session model, fresh-context subagent, remote-only reads) · security ✓ (inline bar) · deltas: 3 cycles (cap)
