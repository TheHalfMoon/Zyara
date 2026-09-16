# M027 Evidence — Reliability, restoration and release-control gates

- Task: M027
- Implementation PR: #55 (merge 9e0e4c7b407466f43285f90a75219650c4dd41b0)
- Base SHA: 76096fa84396368a33444664fc135dac3c4ad0c8
- Work packet: docs/evidence/M027/WORK_PACKET.md
- Implementation: tests/reliability/gates.test.ts, infra/runbooks/restore-and-reopen.md
- Tests: tests/reliability (4 passing: 100-contender single winner plus authoritative commit, 50x retry storm single operation, freeze plus kill switches, restore dedupe)
- Exact-head CI on PR #55: 3 passed, 0 failed
- Post-merge main: 9e0e4c7b407466f43285f90a75219650c4dd41b0
- Acceptance: (1) invariants under concurrency proven; (2) restore without duplication proven; (3) RPO 15min / RTO 4h pilot budgets defined, isolated-restore drill timing is a live-gate measurement recorded as pending
- Residual risks: full encrypted-backup restore drill in isolated environment requires a live-gate run; launch stays disabled until then
- Verdict: M027 COMPLETE_CANONICAL
