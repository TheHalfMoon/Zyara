# M041 work packet — reviewed navigation safety and intent contract

- Task: M041 (P08/S08A). Objective: patient-facing AI routes safely with
  a controlled intended use.
- Base SHA: b56ac00. Dependencies: M011, M003 (evidenced; M030 removed as
  impl gate, retained external).
- Allowed paths: packages/navigation-safety, tests/m041,
  docs/evidence/M041.
- Exclusions: no diagnosis, no prescribing, no autonomous clinical acts,
  no M042 tool wiring.
- Requirements: typed intent contract (navigate, explain, handoff);
  prohibited intents refused (diagnose, prescribe, coverage guarantee,
  eligibility fabrication); uncertainty escalates to clinician handoff;
  symptom-style input triggers safety gate with no ranking override;
  every decision logged with intent, confidence and escalation.
- Test plan: intent allow/refuse matrix, escalation paths, symptom gate,
  audit logging.
- Rollback: remove package/tests.
