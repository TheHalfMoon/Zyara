# M053 work packet — provenance-labeled patient timeline

- Task: M053 (P10/S10A). Objective: patient timeline where every entry
  carries source, effective time, freshness and correction history.
- Base SHA: 1f9b4d9. Dependencies: M052, M021, M005 (all evidenced).
- Allowed paths: packages/patient-timeline, tests/m053,
  docs/evidence/M053.
- Exclusions: no documents/meds (M054), no new clinical content.
- Requirements: entries carry source, effective time, freshness,
  external ids, provenance; corrections append (never rewrite);
  ordering deterministic by effective time; minimized payloads; timeline
  respects M051 consent purpose.
- Test plan: provenance completeness, correction append, ordering,
  consent gating.
- Rollback: remove package/tests.
