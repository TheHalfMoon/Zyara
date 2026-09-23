# Zyara AI Operating Fabric — Readiness / Gap Closure Checklist

Initial date: 2026-09-22  
Amended: 2026-09-23  
Initial planning base: `7caa5da39bbf6d1157f42d183280b0e4682bdcf5`  
2026-09-23 hardening base: `c17b654f6836997751967157728c664227b3e7e2`

Purpose: prevent the AI Operating Fabric from being called implementation-ready while a major architectural concern is absent.

A checked planning item means the contract is defined in the planning packet. It does **not** mean implementation or production validation is complete.

| # | Dimension | Planning status | Owning section / slice |
|---|---|---|---|
| 1 | Healthcare authority separation | COVERED | canonical plan §§2, 4; N5 authority plane |
| 2 | Human vs agent identity | COVERED | N5/C1 + AIF-01 resolver |
| 3 | Tenant isolation | COVERED | AIF-01, AIF-02, all DB gates |
| 4 | Branch isolation | COVERED | AIF-01, AIF-02 |
| 5 | Capability registry/versioning | COVERED | AIF-01A |
| 6 | Authority/risk classes | COVERED | AIF-01A |
| 7 | Consent/purpose binding | COVERED | AIF-02A + existing consent-boundaries |
| 8 | Data classification | COVERED | AIF-02A |
| 9 | Secret/credential isolation | COVERED | AIF-02B |
| 10 | Network egress policy | COVERED | AIF-02A/AIF-04/AIF-05 |
| 11 | No-silent-cloud-fallback | COVERED | AIF-02A |
| 12 | Model uncertainty/abstention | COVERED | AIF-03 |
| 13 | Arabic/Saudi Arabic/code-switch evaluation | COVERED | AIF-03 |
| 14 | Model output cannot grant authority | COVERED | permanent invariant + AIF-03 |
| 15 | Agent workspace/process isolation | COVERED | AIF-04 |
| 16 | Time/cost/token/parallelism budgets | COVERED | AIF-04 |
| 17 | Delegation scope/depth | COVERED | source matrix + AIF-04 |
| 18 | Cancellation/orphan cleanup | COVERED | AIF-04 |
| 19 | Browser prompt-injection boundary | COVERED | AIF-05 |
| 20 | Browser redirect/host allowlist | COVERED | AIF-05 |
| 21 | Browser outcome verification | COVERED | AIF-05 |
| 22 | Local filesystem/device allowlists | COVERED | AIF-06 |
| 23 | Local path/symlink/reparse defense | COVERED | AIF-06 |
| 24 | Human approval | COVERED | N5/C3 + AIF-01 |
| 25 | Human exception queue | COVERED | N5/C3 |
| 26 | Append-only/reconstructable audit | COVERED | N5/C4 |
| 27 | Idempotency/replay | COVERED | AIF-01 + execution semantics |
| 28 | Timeout/retry/backoff | COVERED | AIF-01 + reliability section |
| 29 | UNKNOWN external outcome | COVERED | existing adapter-ops + AIF-05 |
| 30 | Receipt/evidence semantics | COVERED | AIF-01 + C4 |
| 31 | Workflow versioning | COVERED | workflow compilation |
| 32 | Rollback/correction | COVERED | reliability section |
| 33 | Provider/tool health | COVERED | AIF-07/AIF-08 |
| 34 | Operator pause/resume/disable | COVERED | AIF-07 |
| 35 | Cost visibility | COVERED | AIF-04/AIF-08 |
| 36 | Quality/automation metrics | COVERED | AIF-08 |
| 37 | Analytics privacy views | COVERED | AIF-08 |
| 38 | External BI isolation | COVERED | AIF-08 |
| 39 | PHI-light logs/traces | COVERED | AIF-02/AIF-09 |
| 40 | Supply-chain/donor provenance | COVERED | source adoption matrix |
| 41 | Public-license special terms | COVERED | source matrix; Treg explicit |
| 42 | Source exact pin before copy | COVERED | source matrix admission rule |
| 43 | Dependency/SBOM review | COVERED | source admission rule |
| 44 | Upgrade strategy | COVERED | source admission rule |
| 45 | Local/small-clinic deployment | COVERED | deployment profiles |
| 46 | Enterprise/cluster path | COVERED | deployment profiles/AIF-04 |
| 47 | N6 independence | COVERED | roadmap insertion |
| 48 | N8 browser dependency | COVERED | roadmap insertion |
| 49 | N9 automation dependency | COVERED | roadmap insertion |
| 50 | Synthetic-vs-real completion semantics | COVERED | handoff completion matrix |
| 51 | Jev review truth | COVERED | implementation handoff §17 |
| 52 | Alibaba OCR truth | COVERED | implementation handoff §17 |
| 53 | HTTP authority tests | COVERED | CI conventions |
| 54 | Non-superuser DB/RLS smoke | COVERED | CI conventions |
| 55 | Adversarial threat campaigns | COVERED | canonical security model + AIF-09 |
| 56 | Recovery/provider outage campaigns | COVERED | AIF-09 |
| 57 | Accessibility/RTL | COVERED | AIF-07 |
| 58 | Action Center evidence drill-down | COVERED | AIF-07 |
| 59 | Raw shell/filesystem prohibited for care agents | COVERED | AIF-04/AIF-06 |
| 60 | Canonical owner remains Zyara domains | COVERED | permanent authority rules |
| 61 | Capability registry mutation authority | COVERED | frozen architecture decisions |
| 62 | Capability definition digest/version integrity | COVERED | AIF-01A |
| 63 | Ephemeral workload identity | COVERED | frozen decisions + AIF-04 |
| 64 | Credential subject binding | COVERED | AIF-02B |
| 65 | Local bridge pairing/revocation | COVERED | AIF-06 |
| 66 | MFA/human takeover without credential capture | COVERED | AIF-05 |
| 67 | Provider rate limits/backpressure/circuit breakers | COVERED | reliability + frozen decisions |
| 68 | External portal automation-rights qualification | COVERED | source/admission + frozen decisions |

| 69 | Model fleet/provider-neutral registry | COVERED | canonical plan §12A.1 + AIF-03A |
| 70 | Exact model revision/digest + license/terms provenance | COVERED | §12A.1 + source admission |
| 71 | Prompt/template registry and immutable versioning | COVERED | §12A.2 + AIF-03A |
| 72 | Retrieval/RAG permission-before-ranking | COVERED | §12A.3 + AIF-03C |
| 73 | Index/embedding deletion + revocation propagation | COVERED | §12A.3/12A.7 |
| 74 | Retrieval prompt-injection + stale-evidence handling | COVERED | §12A.3 + AIF-03C |
| 75 | Evaluation bundle / shadow / canary rollout | COVERED | §12A.4 + AIF-03B |
| 76 | Model/provider drift monitoring | COVERED | §12A.4 + AIF-08/AIF-09 |
| 77 | Patient vs clinician vs operations agent separation | COVERED | §12A.5 |
| 78 | Feature flags / emergency kill switches | COVERED | §12A.6 + lifecycle gates |
| 79 | AI/browser/retrieval retention + deletion | COVERED | §12A.7 |
| 80 | AI execution SLIs/SLOs + PHI-light observability | COVERED | §12A.8 |
| 81 | Capability/workflow/event schema evolution | COVERED | §12A.9 |
| 82 | Model fallback cannot widen privacy/data residency | COVERED | §12A.1/AIF-03A |

| 83 | Local typed-decision provider profile | COVERED | canonical §12B.1 + AIF-03B |
| 84 | Local-only decision no-silent-remote-fallback | COVERED | §12B.1 + AIF-02 |
| 85 | Calibration artifact/version in decision identity | COVERED | §12B.1 |
| 86 | Conversion fidelity separated from task accuracy | COVERED | §12B.1/source deep dive |
| 87 | Batch decision stable item ids/order | COVERED | §12B.2 + AIF-03C |
| 88 | Batch partial-failure semantics | COVERED | §12B.2 + AIF-03C |
| 89 | Null/unavailable confidence handling | COVERED | §12B.2 + AIF-03C |
| 90 | Uncertain-item escalation without authority widening | COVERED | §12B.2 |
| 91 | Hosted classifier endpoint prohibited for PHI by default | COVERED | §12B.2/source deep dive |
| 92 | Retrieval semantic prefilter after authorization | COVERED | §12B.3 + AIF-03D |
| 93 | Retrieval candidate filter cannot grant authorization | COVERED | §12B.3 |
| 94 | Search prefilter path/symlink boundary | COVERED | §12B.3 |
| 95 | Stable caller input id / redelivery dedup | COVERED | §12B.4 + AIF-04A |
| 96 | Input dedup distinct from external action idempotency | COVERED | §12B.4 |
| 97 | Versioned append-only agent session history | COVERED | §12B.4/AIF-04A |
| 98 | I/O-pure context builder | COVERED | §12B.7/AIF-04B |
| 99 | Context omission/truncation receipt | COVERED | §12B.7 |
| 100 | Pure tool-call translation before execution | COVERED | §12B.5/AIF-04B |
| 101 | Versioned serializable operation specs | COVERED | §12B.5/AIF-04B |
| 102 | Persist status + operations before dispatch | COVERED | §12B.5/12B.6 |
| 103 | Crash after external side effect requires reconciliation | COVERED | §12B.6/AIF-04C |
| 104 | Unsupported session version explicit failure | COVERED | AIF-04A |
| 105 | Fork lineage + authorization re-evaluation | COVERED | §12B.8/AIF-04D |
| 106 | Fork cannot replay completed side effects | COVERED | §12B.8 |
| 107 | New donor exact pins + permissions recorded | COVERED | donor deep dive/source adoption |
| 108 | Jev Search public-license ambiguity isolated from runtime admission | COVERED | donor deep dive/source adoption |

| 109 | Decision-class/label-set registry versioning | COVERED | canonical §12C.1 + AIF-03C |
| 110 | Explicit none/unknown outcome where required | COVERED | §12C.1 |
| 111 | Thresholds scoped by class/provider/locale | COVERED | §12C.1 |
| 112 | Administrative fairness/operational-harm evaluation | COVERED | §12C.2 |
| 113 | Local model artifact digest/toolchain provenance | COVERED | §12C.3 |
| 114 | Local model artifact rollback/quarantine | COVERED | §12C.3 |
| 115 | Apple-specific local provider remains optional | COVERED | §12C.3 |
| 116 | Canonical session event ordering/causal lineage | COVERED | §12C.4 |
| 117 | Consequential agent state rejects blind last-write-wins | COVERED | §12C.4 |
| 118 | Explicit multi-operation dependency graph | COVERED | §12C.5 |
| 119 | UNKNOWN predecessor blocks unsafe successor | COVERED | §12C.5 |
| 120 | Worker lease/fencing against concurrent execution | COVERED | §12C.6 + AIF-04C |
| 121 | Stale worker cannot commit newer result | COVERED | §12C.6 |
| 122 | Transactional outbox / committed dispatch intent | COVERED | §12C.7 + AIF-04C |
| 123 | No exactly-once overclaim | COVERED | §12C.7 |
| 124 | Execution receipt integrity/provenance binding | COVERED | §12C.8 |
| 125 | Human-intent/parameter-digest confirmation binding | COVERED | §12C.9 |
| 126 | Session retention/compaction/legal hold | COVERED | §12C.10 |
| 127 | Hard parser/fan-out/amplification limits | COVERED | §12C.11 |

| 128 | Persistent agent memory is governed/non-authoritative | COVERED | canonical §12C.12 |
| 129 | Memory authorization/provenance/expiry/deletion propagation | COVERED | §12C.12 |
| 130 | Trusted server time + clock-skew semantics | COVERED | §12C.13 |
| 131 | Client/model timestamps cannot grant time authority | COVERED | §12C.13 |
| 132 | Model/provider/runtime incident quarantine + re-admission | COVERED | §12C.14 |

## Explicit unresolved items that are intentionally not design gaps

These remain evidence/admission gates rather than missing architecture:

1. exact canonical source repository/revision for the Laya Action Center product before any Action Center code copy (this is distinct from the now-pinned `mizorewww/laya-coreml` runtime donor);
2. exact source repository/revision/license for Desktop Commander before code copy;
3. provider-specific browser portal rights and terms;
4. real clinic local-device validation;
5. production secret manager selection;
6. production workload identity choice;
7. real model/provider benchmark results;
8. real Arabic/Saudi Arabic decision-plane benchmark results;
9. real payer/NPHIES credentials and contracts;
10. production security/privacy review;
11. external clinical/legal/regulatory authority.

The plan must not fabricate closure of these items.

## Plan readiness decision

All architecture categories currently known to be required for bounded implementation are covered, including the 2026-09-23 decision/runtime hardening pass. External evidence gates below remain intentionally unresolved and must not be misreported as repository completion.

The first executable leaf remains:

`AIF-01A — Capability contract`

It requires none of the unresolved external items above.

`ZYARA_AI_OPERATING_FABRIC_GAP_REVIEW = PASS_FOR_BOUNDED_IMPLEMENTATION`
