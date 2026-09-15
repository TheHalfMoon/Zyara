# M012 Result

Status: COMPLETE (merged).

- Base SHA: 781904c10184178bbfc84753fdccebcd6c1bab5a
- Implementation head: 2f99256
- Merge commit on main: 3ce50070c1455ca173adbda027bc0d5aff8c36c9 (PR #25)
- CI: m012-ci green on head (typecheck + lint + 7/7 tests).
- Branch: muse/M012-profiles-map
- Acceptance 1 (list parity): PASS — shared applyFilter; every map action in list
- Acceptance 2 (scope/freshness): PASS — profile shows both + insurer caveat
- Acceptance 3 (location optional): PASS — null location lists all
- Tests: 7/7 discovery green (parity, suppression, fixtures, denied, rights)
- Tile rights: MapLibre renderer only; tile/geocoding terms still PENDING
  procurement (M029 vendor gate) — no grant assumed.
