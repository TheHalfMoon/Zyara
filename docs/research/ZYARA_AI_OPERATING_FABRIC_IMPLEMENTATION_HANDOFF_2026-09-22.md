# Zyara AI Operating Fabric — Implementation Handoff

Date: 2026-09-22  
Planning base: `7caa5da39bbf6d1157f42d183280b0e4682bdcf5`  
Authority: `docs/canonical/ZYARA_AI_OPERATING_FABRIC_PLAN_2026-09-22.md`

This handoff is implementation-ready but does not authorize big-bang delivery. Each leaf must be revalidated against live main before branch creation.

## 1. Live-state rule

Before every leaf:

1. fetch canonical `main`;
2. inspect open PRs;
3. inspect current migrations;
4. inspect affected packages;
5. re-evaluate whether another canonical slice already solved part of the problem;
6. branch from exact main;
7. use the next available migration number;
8. preserve PR #94 or its successor unless separately reconciled.

N6 Connect remains independently executable. Do not stall N6 while implementing AIF foundations.

## 2. Existing Zyara primitives to reuse

The fabric must compose the existing system rather than replace it.

| Existing package | Reuse |
|---|---|
| `@zyara/authorization` | tenant/branch/human-role authorization |
| `@zyara/collaboration` | agent identity, activity, approvals/exceptions, audit chain |
| `@zyara/adapter-harness` | certified external adapter capability concepts |
| `@zyara/adapter-ops` | durable external operation + UNKNOWN/reconciliation semantics |
| `@zyara/integration-ops` | staged rollout and reconciliation |
| `@zyara/action-confirmation` | exact challenge binding |
| `@zyara/consent-boundaries` | purpose-bound consent |
| `@zyara/events` | versioned minimal-PHI events/outbox semantics |
| `@zyara/navigation-safety` | existing safe-navigation policy where applicable |
| `@zyara/navigation-tools` | existing typed AI/navigation tools |
| `@zyara/analytics` / `@zyara/partner-analytics` | metrics and governed exports |

Do not create a second authorization system, second approval system, second outbox, or second exception queue.

## 3. Dependency graph

```text
AIF-01A Capability contract
  -> AIF-01B registry/resolver
      -> AIF-02A data/egress policy
      -> AIF-02B credential mediation
          -> AIF-03 decision plane
          -> AIF-04 agent runtime
          -> AIF-05 browser bridge
          -> AIF-06 local bridge
              -> AIF-07 action center execution controls
              -> AIF-08 operations insights
                  -> AIF-09 whole-fabric qualification
```

Parallelism:

- N6 may run in parallel with AIF-01/AIF-02.
- AIF-03 and AIF-04 may proceed in parallel after AIF-02 contracts stabilize.
- AIF-05 and AIF-06 require AIF-01/AIF-02.
- AIF-07 read-only views can begin after C2/C3/C4; action execution waits for AIF-01.
- AIF-08 can start metric-contract work early but external BI admission waits for privacy-approved views.
- AIF-09 requires all enabled fabric classes.

## 4. AIF-01A — Capability contract

### Goal

Create the provider-neutral contract that all AI/workflow/browser/local execution must use.

### Preferred repository shape

New package candidate:

`packages/capability-gateway`

It should **compose**, not replace, `adapter-harness`.

Minimum types:

- `CapabilityId`
- `CapabilityVersion`
- `CapabilityDefinition`
- `CapabilityInvocation`
- `CapabilityGrant`
- `CapabilityRiskClass`
- `CapabilityAuthorityClass`
- `CapabilityDataClass`
- `CredentialBindingRef`
- `EgressPolicyRef`
- `InvocationReceipt`
- `VerificationContract`

### Closed authority classes

Reuse the AI-era automation model:

```text
A0_OBSERVE
A1_DRAFT
A2_PREPARE
A3_EXECUTE_LOW
A4_EXECUTE_MED
A5_HUMAN_ONLY
```

### Requirements

- immutable definition version;
- exact JSON-compatible input/output schema reference;
- tenant/branch scope;
- read/write declaration;
- data classification;
- authority class;
- consent purpose;
- credential reference only;
- egress policy reference;
- idempotency contract;
- timeout/retry;
- receipt/verification contract;
- explicit owner domain.

### Tests

- duplicate capability version rejected;
- unknown capability denied;
- write cannot be registered as A0/A1;
- A5 cannot be granted to an AgentIdentity;
- tenant/branch widening rejected;
- credential plaintext rejected;
- unsupported data class rejected;
- version mismatch rejected.

### Non-goals

No external provider call. No model. No browser. No secret store.

### Exit

`CAPABILITY_CONTRACT_QUALIFIED = TRUE`

## 5. AIF-01B — Registry + deny-by-default resolver

### Goal

Resolve a requested capability against actor, tenant, branch, workflow, approval and certification state.

### Integration

Use:

- human membership from `authorization`;
- agent identity/capability from `collaboration`;
- C3 approval for protected actions;
- adapter certification from `adapter-harness`;
- exact confirmations from `action-confirmation` where required.

### Decision output

```text
ALLOW
ASK
DENY
UNDECIDABLE
```

Every decision must carry stable reason codes and an audit/activity-safe receipt.

### Tests

- body-supplied tenant ignored/rejected;
- revoked agent denied;
- expired agent denied;
- cross-branch denied;
- stale approval denied;
- wrong parameter digest denied;
- uncertified adapter denied;
- human-only denied for agent;
- unknown state returns UNDECIDABLE rather than ALLOW.

### DB

Use the next available migration number. Add only the minimum registry/version/grant tables needed for durable qualification, with RLS and append-only history where appropriate.

### Exit

`CAPABILITY_RESOLVER_QUALIFIED = TRUE`

## 6. AIF-02A — Privacy and egress policy

### Goal

Make data movement explicit before any model/tool/browser/local invocation.

### Candidate package

`packages/privacy-egress`

### Must model

- data class;
- source trust zone;
- destination/provider;
- purpose;
- consent requirement;
- minimization transform;
- retention;
- local-only flag;
- egress allow/deny;
- reason;
- policy version.

### Required rule

`CREDENTIAL` is never exportable as payload.

### Tests

- PHI to unapproved provider denied;
- no-silent-cloud-fallback;
- missing purpose denied;
- revoked consent denied;
- minimization happens before egress receipt;
- logs never contain redacted source values;
- local-only class refuses remote provider.

### Exit

`PRIVACY_EGRESS_GATE_QUALIFIED = TRUE`

## 7. AIF-02B — Credential mediation

### Goal

Resolve an opaque `CredentialBindingRef` only inside the execution adapter.

### Contract

The gateway sees metadata; the adapter receives a short-lived resolved secret through a bounded process boundary; the agent/model never receives it.

### Requirements

- tenant ownership;
- branch/provider scope;
- rotation;
- expiry;
- least-privilege metadata;
- no secret serialization;
- no secret in events/traces;
- redacted failure messages;
- credential health without exposing value.

### Tests

- wrong tenant denied;
- wrong branch denied;
- expired credential denied;
- rotation invalidates old binding;
- logs/receipts contain only opaque refs;
- model/tool payload serialization fails if secret-like field is attempted.

### Exit

`CREDENTIAL_MEDIATION_QUALIFIED = TRUE`

## 8. AIF-03 — Decision plane

### Goal

Select bounded operational options with explicit uncertainty, never authority.

### Candidate package

`packages/decision-plane`

### Providers

Start with a provider SPI. Deterministic rules are provider zero.

Benchmark candidates separately:

- SemIf;
- Decider;
- structured-prediction local models;
- existing approved remote/local model providers.

### Evaluation dimensions

- exact option accuracy;
- calibration;
- abstention quality;
- false confident unsafe routing;
- Arabic;
- Saudi Arabic;
- Arabic/English code switching;
- latency;
- CPU/GPU/RAM;
- cost;
- privacy;
- adversarial prompt resistance;
- structured-output validity.

### Rule

A provider is admitted **per decision class**, not globally.

### Receipt

`DecisionReceipt` must include:

- task class;
- options;
- selected option;
- score/probability if meaningful;
- abstained;
- evidence refs;
- provider/model/version;
- policy/threshold version;
- downstream authorization outcome.

### Exit

At least deterministic provider qualified. Model providers remain optional until benchmarked.

`DECISION_PLANE_FOUNDATION_QUALIFIED = TRUE`

## 9. AIF-04 — Agent runtime

### Candidate package

`packages/agent-runtime`

### Runtime contract

- create run;
- start;
- observe;
- cancel;
- suspend/resume only if backend supports safe checkpointing;
- terminate;
- cleanup;
- retrieve receipts.

### Mandatory limits

- time;
- model/token/cost;
- CPU/memory where backend supports;
- parallelism;
- delegation depth;
- capability count;
- egress hosts.

### Backend 1

Use the smallest bounded local/container backend that can be proven in the current CI environment.

Do not introduce Kubernetes just to imitate AX.

### Required negative tests

- child capability > parent capability;
- host secret inheritance;
- non-allowlisted network;
- timeout ignored;
- cancellation race;
- orphan process;
- runaway loop/cost;
- workspace escape;
- stale approval;
- agent attempts to modify its own policy.

### Exit

`AGENT_RUNTIME_LOCAL_BACKEND_QUALIFIED = TRUE`

## 10. AIF-05 — Governed browser bridge

### Candidate package

`packages/browser-bridge`

### Build order

1. deterministic browser session contract;
2. allowlisted navigation;
3. credential mediation;
4. structured extraction;
5. bounded actions;
6. evidence capture;
7. outcome verification;
8. optional semantic selector/extraction layer after benchmark.

### Threat campaign

- prompt injection in page text;
- hidden instructions;
- redirect to foreign domain;
- download malware/unexpected type;
- upload from unapproved path;
- form-action mismatch;
- duplicate submit;
- ambiguous confirmation;
- DOM changed after approval;
- session expired;
- provider returns success page without business receipt;
- screenshot/HTML contains PHI beyond retention policy.

### Admission candidates

AgentQL/TinyFish patterns may be admitted only after this deterministic contract exists.

### Exit

`GOVERNED_BROWSER_SYNTHETIC_QUALIFIED = TRUE`

Real portal qualification remains separate.

## 11. AIF-06 — Local bridge

### Candidate package/service

`packages/local-bridge-contracts` plus a separately isolated runtime if implementation requires OS access.

### First capabilities

Choose only two or three for qualification, e.g.:

- approved import folder read;
- approved document print;
- approved scanner ingest.

### Required platform tests

Windows first if that is the clinic/development target; explicitly record unsupported semantics on other platforms rather than pretending equivalence.

### Security campaign

- path traversal;
- symlink/reparse escape;
- UNC/network path widening;
- device path;
- hidden file;
- oversized file;
- file-type confusion;
- command injection;
- arbitrary executable path;
- secret-store access.

### Exit

`LOCAL_BRIDGE_BOUNDED_CAPABILITIES_QUALIFIED = TRUE`

## 12. AIF-07 — Action Center

### Backend contract first

Action Center is a projection of:

- C2 activity;
- C3 approvals/exceptions;
- workflow runs;
- capability receipts;
- provider/integration health;
- SLA/anomaly state.

### UI groups

- Needs attention;
- Waiting for approval;
- Automation running;
- Unknown outcomes;
- Failed/retryable;
- Provider/integration issues;
- Data freshness;
- Recently completed.

### Required interaction

Every protected action opens:

1. authoritative context;
2. proposed exact action;
3. evidence;
4. approval/confirmation;
5. result receipt.

No one-click mutation from an AI summary.

### UX gates

- Arabic/English;
- RTL;
- keyboard;
- screen reader;
- mobile/responsive;
- loading/error/unknown;
- no PHI in notification preview by default.

### Exit

`ACTION_CENTER_OPERATIONAL_QUALIFIED = TRUE`

## 13. AIF-08 — Operations Insights

### Reuse

Extend existing `analytics` / `partner-analytics` rather than creating a second metric authority.

### New metric families

- workflow;
- agent;
- tool;
- model;
- approval;
- exception;
- provider reliability;
- cost;
- unknown outcomes.

### Governed analytical views

Every analytical view must define:

- owner;
- purpose;
- source events;
- data classes;
- joins;
- suppression;
- retention;
- denominator;
- missingness;
- refresh lag.

### Optional Superset

Only through an adapter to approved views. No direct raw transactional DB credentials.

### Exit

`AI_OPERATIONS_ANALYTICS_QUALIFIED = TRUE`

## 14. AIF-09 — End-to-end qualification

Run representative scenarios:

1. routine appointment reminder;
2. patient reschedule request;
3. external provider timeout;
4. prior-auth administrative preparation;
5. legacy portal browser check using synthetic portal;
6. local document ingest;
7. model classification abstention;
8. approval required;
9. revoked agent during workflow;
10. provider credential rotation;
11. network outage;
12. recovery after worker crash.

For every scenario prove:

- actor;
- authority;
- privacy;
- consent;
- capability;
- credential scope;
- idempotency;
- receipt;
- verification;
- activity;
- audit;
- exception;
- analytics.

### Exit

`AI_OPERATING_FABRIC_SYNTHETIC_QUALIFIED = TRUE`

This does not mean:

- real clinic validated;
- real payer validated;
- real browser portal validated;
- production security approved;
- production authorized.

## 15. Evidence packet convention

Each leaf creates:

`docs/evidence/AIF/<slice>/`

Minimum:

- `WORK_PACKET.md`
- `PROVENANCE.md`
- `THREAT_MODEL.md` or threat delta
- `JEV_REVIEW.md`
- `OCR_REVIEW.md`
- `RESULT.md`

For donor admission add:

- exact revision;
- exact paths;
- license/permission;
- modifications;
- dependencies;
- security/privacy disposition.

## 16. CI conventions

Each slice may add one bounded workflow if existing CI cannot qualify it.

Every final candidate requires:

- package typecheck;
- package lint;
- targeted tests;
- impacted regression tests;
- boundary check;
- database smoke under non-superuser when schema/RLS changes;
- HTTP `Fastify.inject()` tests when API authority changes;
- exact-head CI;
- post-merge verification.

Do not use green CI as proof of external production validity.

## 17. Jev and code review

If Jev is available, use it at design and exact-diff stages.

Challenge especially:

- confused deputy;
- privacy/egress;
- secret exposure;
- stale approval;
- external unknown outcome;
- browser prompt injection;
- sandbox escape;
- analytics re-identification;
- cost loops.

Use Alibaba Open Code Review when genuinely available. Record tool availability truthfully.

Neither tool can override deterministic repository evidence or policy.

## 18. First executable task

After this planning amendment merges, the first AIF task is:

`AIF-01A — Capability contract`.

However, the project-wide next task may still be N6/T1 if the active canonical roadmap prioritizes Connect. The two are dependency-independent and may be executed on separate branches only if repository governance permits concurrent work.

Do not implement AIF-02+ until AIF-01 contracts are canonical.

## 19. Completion matrix

At AIF closure report separately:

```text
AIF_REPOSITORY_IMPLEMENTATION_COMPLETE
AIF_SYNTHETIC_QUALIFICATION_COMPLETE
REAL_BROWSER_PROVIDER_VALIDATION_COMPLETE
REAL_LOCAL_CLINIC_BRIDGE_VALIDATION_COMPLETE
REAL_MODEL_DECISION_VALIDATION_COMPLETE
PRODUCTION_SECURITY_REVIEW_COMPLETE
PRODUCTION_AUTHORIZED
```

No synthetic/local test may set the real-world fields to true.

`ZYARA_AI_OPERATING_FABRIC_IMPLEMENTATION_HANDOFF_READY = YES`
