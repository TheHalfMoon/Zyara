# Zyara V1 AScout Completion Checklist — 2026-09-16

Use this checklist only after live re-verification. It is a planning quality gate, not implementation evidence.

## Live truth

- [ ] Exact `main` SHA recorded
- [ ] Open PRs recorded
- [ ] Current canonical documents identified
- [ ] Current implementation inspected
- [ ] Current migrations/data model inspected
- [ ] Current tests/evidence inspected
- [ ] Any repository changes after this packet reconciled

## V1 capability reconciliation

- [ ] Doctors/practitioners
- [ ] Clinics/hospitals/facilities
- [ ] `All / Doctors / Clinics & Hospitals`
- [ ] Specialty search/browse
- [ ] Subspecialty model
- [ ] Service/procedure search
- [ ] Common care-language search
- [ ] Arabic normalization/transliteration
- [ ] Map/list parity
- [ ] Distance/travel time policy
- [ ] Open-now/working hours
- [ ] Phone
- [ ] WhatsApp
- [ ] Directions
- [ ] Website/contact
- [ ] Native booking/request/call/redirect modes
- [ ] Practitioner multi-location
- [ ] Insurance branch/service/role scope
- [ ] Doctor profile depth
- [ ] Facility profile depth
- [ ] Doctor reviews
- [ ] Facility reviews
- [ ] Separate reputation aggregates
- [ ] Claim/correction
- [ ] Clinic Portal V1
- [ ] Monthly freshness attestation
- [ ] Public freshness display
- [ ] Provider analytics event foundation
- [ ] Natural-language AI search
- [ ] Explainable result reasons
- [ ] Voice/search shared pipeline

## Architecture deltas

- [ ] No duplicate practitioner-per-clinic identity model introduced
- [ ] No global insurance boolean introduced
- [ ] No blended doctor/facility score introduced
- [ ] No second AI/voice reasoning stack introduced
- [ ] Existing provenance model reused
- [ ] Existing FHIR boundaries preserved
- [ ] Existing booking authority/unknown-outcome safety preserved
- [ ] Existing privacy/tenant boundaries preserved
- [ ] Existing review safety/moderation rules preserved

## Competitive feature handling

- [ ] Doctolib features classified
- [ ] Zocdoc features classified
- [ ] Healthgrades features classified
- [ ] Vezeeta features classified
- [ ] NexHealth features classified
- [ ] Solv features classified
- [ ] Tebra features classified
- [ ] Every adopted feature tied to a V1 job-to-be-done
- [ ] Future features assigned to explicit V2/V3+ seams
- [ ] No proprietary trade dress copied

## Plan quality

- [ ] V1 requirements updated
- [ ] Explicit exclusions updated
- [ ] Existing work preservation matrix complete
- [ ] Data-model delta complete
- [ ] Search/ranking contract complete
- [ ] Review/trust redesign complete
- [ ] Clinic Portal V1 plan complete
- [ ] AI/voice V1 plan complete
- [ ] Dependency graph complete
- [ ] Phases -> slices -> tasks complete
- [ ] Each task has tests/evidence/rollback/completion criteria
- [ ] External validation separated from repository implementation
- [ ] First implementation task identified
- [ ] Final implementation-agent prompt produced

## Completion marker

Only when every required planning item is complete and internally consistent:

```text
ASCOUT_ZYARA_V1_PLAN_COMPLETE = YES
```

Report exact base SHA, planning HEAD SHA, generated/updated artifacts, validation checks, unresolved external gates and the first implementation task identifier.