# AIF-03A Result — Model + Prompt Registry

Base: `main` @ `8aa0fd5f`, merged forward with `main` @ `7c11a52d`. Branch: `feat/zyara-network-aif03a-model-prompt-registry`.
Scope: `WORK_PACKET.md`. The exit marker `MODEL_PROMPT_REGISTRY_QUALIFIED = TRUE` is recorded after exact-head CI and merge.

## Delivered (`@zyara/model-registry`)

- **Model profiles:** immutable, digested versions pinned to an exact revision (date, semver or digest; floating aliases refused). Each carries runtime, deployment, license, cost and update references, data/task/agent-class admission, output schema, evaluation bundle and the AIF-02A egress provider. Admission and health live in an append-only status log with legal transitions.
- **Prompt templates:** immutable versions with a registry-computed instruction digest. Rollout is status. A rollback target must be an earlier, once-active, unrevoked version. A prompt cannot exceed its agent class.
- **Agent classes:**
  - each carries a data ceiling, capability allowlist, retention, approval policy and disclosure;
  - patient-navigation and clinic-operations never share capabilities;
  - clinician-assist uses only preparatory verbs and never holds CLINICAL_SIGNING_REQUIRED.
- **Selection:** only listed, admitted, healthy (fresh) candidates. A fallback never widens residency, goes local to remote, or uses another egress provider. An optional LOCAL constraint is available.
- **Kill switches:** global, provider, model, capability and prompt switches, read from registry state only, in time order.
- **Invocation bindings:** frozen and digested, so prompt edits never change history. `assertBindingLive` re-checks every bound field, revocation, rollout and kill switch before each dispatch step.

## Handoff §8 tests → proof (`tests/aif03a/registry.test.ts`)

| Handoff test | Test |
| --- | --- |
| a remote provider alias alone is insufficient | "refuses a floating alias…", "refuses floating aliases in any position…" |
| fallback cannot silently widen residency or data use | "refuses a fallback that widens…", "refuses any fallback to another egress provider…" |
| patient-agent and clinic-agent profiles cannot exchange capabilities | "keeps patient-navigation and clinic-operations capabilities apart" |
| revoked or suspended profiles cannot execute new work | "blocks new work from a revoked or suspended profile" |
| prompt version changes do not mutate historical receipts | "never lets a prompt edit change a historical binding" |
| the kill switch works without invoking the provider | "disables without invoking the affected provider…", "refuses a capability kill switch…" |

## Runs

- AIF-03A: 19/19.
- Typecheck and lint (`model-registry`, `aif03a-tests`) and boundaries: clean.
- **CI gap:** a workflow to run `@zyara/aif03a-tests` (`aif03a-ci.yml`) is written but **not pushed**. The current GitHub credential lacks the `workflow` scope. Until it is added, CI covers this package only through `foundation` (workspace typecheck and lint); the tests are verified locally. The PR is not merged until the workflow runs at the exact head.

## Reviews

- Jev: `JEV_REVIEW.md`. Four design gaps closed before code; all blocking questions are "no" on the final code.
- OCR (delegate mode): `OCR_REVIEW.md`.
- pstack: `PSTACK_EVIDENCE.md`. A full-in-one panel plus 2 delta cycles; all must-fix items closed.
- Graft (local): `bindInvocation` and the registry have no production caller yet. The AIF-04 runtime is the intended caller.

## Residual risks

- The registry is in-process (no durable table yet). AIF-04 or a later migration adds persistence.
- The runtime must call `assertBindingLive` before each dispatch step and must route model calls through AIF-02 egress and credential mediation. This slice cannot force that (AIF-04).
- Registrar authenticity sits at the API layer.
- No real model, license or evaluation is admitted. Real qualification is AIF-03B.
