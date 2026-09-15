# M014 Dependencies

- M013 COMPLETE: PR #27 merged as c2d8c53dbb1994fda40bd9d8e35e518ac24d16ef;
  evidence finalized PR #28 (main 3cf7c0b). Reuses RecipeRegistry,
  matchRecipe/qualifies, typed qualifications, immutable-version pattern.
- M004 COMPLETE: PR #9. Reuses `projection.invalidated` envelope code,
  string-ID payload rule, MemoryOutbox semantics, scoped consumer registry.
- No other dependencies. M015 (holds ledger) consumes `recheckCandidate` and
  the BusyInterval shape; it is downstream, not a prerequisite.
