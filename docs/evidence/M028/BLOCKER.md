# External blocker packet — M028/M029/M030 (corrected per PR #58)

> Canonical correction: `docs/governance/M028_M030_DEPENDENCY_CORRECTION.md`.
> M030 was a business-sequencing edge, not a technical/safety/data/
> interoperability dependency for M031-M060. Repository implementation
> M031-M060 is complete and is NOT blocked by M028/M029/M030. The gates
> below block only real-world validation, production, commercial, and
> expansion claims.

## Blocker EXT-M028-RECRUIT: pilot clinic recruitment

- BLOCKER_ID: EXT-M028-RECRUIT
- TASK_ID: M028
- EXACT_GATE: 10-20 recruited clinics in defined catchment; signed
  rights/agreements; named verification, reception, and escalation owners;
  real-staff rehearsal outcomes.
- WHY_EXTERNAL: recruitment requires founder/operations outreach to real
  clinics, legal signatures, and human availability. No repository action
  can sign agreements or staff clinics.
- CURRENT_EVIDENCE: readiness checklist, rehearsal script, and capability
  modes in `docs/pilot/`; synthetic fixture and e2e proof in M026;
  reliability gates in M027.
- MISSING_EVIDENCE: signed readiness checklists; rehearsal outcome sheets
  with unresolved blockers; actual supply/coverage record.
- EXACT_EXTERNAL_ACTION: recruit proposed 10-20 clinics; execute readiness
  checklist per clinic (`docs/pilot/readiness-checklist.md`); run the
  synthetic rehearsal with real staff (`docs/pilot/rehearsal-script.md`).
- RESPONSIBLE_ROLE: founder/operations plus clinic management.
- RETURN_EVIDENCE_REQUIRED: signed readiness checklists; rehearsal outcome
  sheets; actual supply/coverage record.
- WHAT_MUST_NOT_BE_CLAIMED: M028 complete; real pilot complete; production
  authorized; expansion ready.
- WHAT_UNBLOCKS_AFTERWARD: M029 real bounded live pilot. Does NOT unblock
  M031-M060 repository implementation (already complete under corrected graph).

## Blocker EXT-M029-PILOT: live-pilot gates

- BLOCKER_ID: EXT-M029-PILOT
- TASK_ID: M029
- EXACT_GATE: real-data legal/clinical/vendor approvals; eight-week live run
  with >=100 authoritative completed visits.
- WHY_EXTERNAL: requires M028 completion plus accountable legal/clinical
  signoffs and real patient traffic under the M003 gate.
- CURRENT_EVIDENCE: synthetic qualification only; no real patient traffic.
- MISSING_EVIDENCE: dated pilot dataset/report with missingness; gate
  approvals; incident/stop log.
- EXACT_EXTERNAL_ACTION: approve M003-gated services/cohorts; run bounded
  pilot; maintain incident/stop log.
- RESPONSIBLE_ROLE: legal counsel, clinical reviewer, pilot clinics.
- RETURN_EVIDENCE_REQUIRED: dated pilot dataset/report with missingness;
  gate approvals; incident/stop log.
- WHAT_MUST_NOT_BE_CLAIMED: M029 complete; commercial validation complete;
  production authorized.
- WHAT_UNBLOCKS_AFTERWARD: M030 external commercial decision. Does NOT
  retroactively block repository implementation already completed.

## Blocker EXT-M030-COMMERCIAL: paid commitments

- BLOCKER_ID: EXT-M030-COMMERCIAL
- TASK_ID: M030
- EXACT_GATE: >=3 accepted paid proposals/renewals distinguishing
  commitment from interest.
- WHY_EXTERNAL: requires real provider commercial decisions.
- CURRENT_EVIDENCE: repository implementation M031-M060 complete with
  synthetic qualification; no paid commitment evidence.
- MISSING_EVIDENCE: paid commitment evidence under restricted access;
  decision memo inputs.
- EXACT_EXTERNAL_ACTION: issue and accept paid proposals; record decision
  memo inputs.
- RESPONSIBLE_ROLE: pilot clinics/procurement.
- RETURN_EVIDENCE_REQUIRED: paid commitment evidence under restricted access.
- WHAT_MUST_NOT_BE_CLAIMED: commercial validation complete; real production
  authorization; expansion readiness; final project completion.
- WHAT_UNBLOCKS_AFTERWARD: real production/commercial/expansion claims where
  applicable (per M058/M060). Does NOT block M031-M060 repository
  implementation (already complete).

## Repository-owned prerequisites completed

- Readiness checklist, rehearsal script, and capability modes in
  `docs/pilot/`; synthetic fixture and e2e proof in M026; reliability gates
  in M027. Repository implementation M031-M060 is complete and does not
  require M030 (see dependency correction above).
