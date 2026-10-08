# GEO-03A pstack Review — bounded inline/degraded

The pstack `ps-review` contract was applied to the scoped diff with correctness, parsimony, product, security/privacy and accessibility bars. A verified fresh-context external judge was not available in this session; this is an explicitly **inline/degraded** review rather than a claimed independent panel.

## Cycle 1 — shared parity

- Reused `BranchPin` and `MapListFilter` rather than inventing a parallel search model.
- Map pin IDs are always a subset of one source-ranked list. Duplicate IDs and bad ranking fail closed.
- Synthetic parity/filter/selection/fallback tests were added.

## Cycle 2 — uncertain location

- A claimed `precise` result without verified <=100m accuracy could retain a misleading precision label. Fixed: qualified-pin predicate is shared by map eligibility and list disclosure.
- Approximate and unknown results remain accessible after an explicit viewport search but are never represented as accurate pins.
- Invalid optional GPS/radius/bounds are refused. The radius calculation is straight-line only, not ETA.

## Cycle 3 — typing and CI

- TypeScript nullable accuracy handling repaired without unsafe assertions.
- Removed unused destructuring reported by exact-head CI lint. Local pure contract suite reached 88/88 PASS; exact-head GitHub CI requalified the repaired implementation.
- No live map provider, UI or network behavior was added.

Final scope: contract-only correctness ✓, parsimony ✓, synthetic product criteria ✓, security/no-I/O ✓, accessibility list fallback ✓. UI integration, actual cluster widgets, route visuals, real clinic data and device-level AT acceptance remain separate gates.

`panel: light △ degraded/inline · correctness ✓ · parsimony ✓ · product ✓ (contract) · security ✓ · accessibility ✓ · three cycles`
