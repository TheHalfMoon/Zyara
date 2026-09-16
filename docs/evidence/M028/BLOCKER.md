# External blocker packet — M028/M029/M030

## Blocker B-M028-01: pilot clinic recruitment

- Task ID: M028
- Blocked criteria: 10-20 recruited clinics in defined catchment; signed
  rights/agreements; named verification, reception, and escalation owners;
  real-staff rehearsal outcomes.
- Proof of externality: recruitment requires founder/operations outreach to
  real clinics, legal signatures, and human availability. No repository
  action can sign agreements or staff clinics.
- Responsible external role: founder/operations plus clinic management.
- Exact action required: recruit proposed 10-20 clinics; execute readiness
  checklist per clinic (`docs/pilot/readiness-checklist.md`); run the
  synthetic rehearsal with real staff (`docs/pilot/rehearsal-script.md`).
- Evidence required back: signed readiness checklists; rehearsal outcome
  sheets with unresolved blockers; actual supply/coverage record.
- Downstream blocked work: M029 (bounded live pilot), M030 (continuation
  decision), and transitively M031-M060.

## Blocker B-M029-01: live-pilot gates

- Task ID: M029
- Blocked criteria: real-data legal/clinical/vendor approvals; eight-week
  live run with >=100 authoritative completed visits.
- Proof of externality: requires M028 completion plus accountable
  legal/clinical signoffs and real patient traffic under the M003 gate.
- Responsible external role: legal counsel, clinical reviewer, pilot clinics.
- Exact action required: approve M003-gated services/cohorts; run bounded
  pilot; maintain incident/stop log.
- Evidence required back: dated pilot dataset/report with missingness; gate
  approvals; incident/stop log.
- Downstream blocked work: M030 through M060.

## Blocker B-M030-01: paid commitments

- Task ID: M030
- Blocked criteria: >=3 accepted paid proposals/renewals distinguishing
  commitment from interest.
- Proof of externality: requires real provider commercial decisions.
- Responsible external role: pilot clinics/procurement.
- Exact action required: issue and accept paid proposals; record decision
  memo inputs.
- Evidence required back: paid commitment evidence under restricted access.
- Downstream blocked work: M031 through M060.

## Repository-owned prerequisites completed

- Readiness checklist, rehearsal script, and capability modes in
  `docs/pilot/`; synthetic fixture and e2e proof in M026; reliability gates
  in M027. No unrelated dependency-ready repository task remains: every
  task M031-M060 transitively requires M030.
