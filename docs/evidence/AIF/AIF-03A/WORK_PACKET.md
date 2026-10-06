# AIF-03A Work Packet — Model + Prompt Registry

Base: `main` @ `8aa0fd5f8a1ab0d6721e17bc8e2c9f2b39207e47`.
Branch: `feat/zyara-network-aif03a-model-prompt-registry`.
Authority: AIF plan §12 (AIF-03A), §12A.1 (Model Fleet Registry), §12A.2 (Prompt / policy / schema registry), §12A.5 (Agent-class separation), §12A.6 (Kill switches); AIF handoff §8 (AIF-03A).
Exit marker: `MODEL_PROMPT_REGISTRY_QUALIFIED = TRUE`.

## Scope

A pure, provider-neutral package, `@zyara/model-registry`. It makes no model call, network call or secret resolution. It is not durable storage, which belongs to the AIF-04 runtime.

## Model profiles (§12A.1)

A `ModelProfile` is an immutable version keyed by (id, version) with a canonical digest. It holds:

- `provider` and `modelId`;
- `modelRevision`: an exact revision or a weights digest. Floating aliases (`latest`, `stable`, `default`, `preview`, `current`, `beta`, or anything ending in `-latest`) are refused, because a remote alias alone is not a production identity;
- `runtimeClass` (`LOCAL` or `REMOTE`) and `deploymentLocation`: `TENANT_DEVICE` (local only), `ZYARA_KSA`, `PROVIDER_KSA`, `PROVIDER_GCC` or `PROVIDER_OTHER`;
- `licenseRef`;
- `allowedDataClasses` (AIF-01A data classes; `CREDENTIAL` never), `allowedTaskClasses` and `allowedAgentClasses`;
- `contextLimit`, `toolUseAllowed` and `structuredOutputSchema` `{ id, version }`;
- `latencyClass`;
- `evaluationBundleDigest` (`evb_` + hex);
- `egressProviderId`: the AIF-02A provider manifest this model's traffic is governed by;
- `admissionState`: `CANDIDATE`, `SHADOW`, `ADMITTED`, `SUSPENDED` or `REVOKED`;
- `healthState`: `HEALTHY`, `DEGRADED` or `DOWN`.

Admission state and health are mutable status. They are kept in an append-only status log apart from the immutable profile content.

## Prompt templates (§12A.2)

A `PromptTemplate` is an immutable version: (id, version) holds the same content forever. It holds:

- the owning `taskClass` and `agentClass`;
- `outputSchema` `{ id, version }` and `allowedCapabilities` (capability ids);
- `instructionDigest` (SHA-256 of the instruction text, computed by the registry; the text itself is stored only in the registry);
- `locale` (for example `ar-SA` or `en`);
- `compatibleModels` (profile ids);
- `safetyPolicyVersion`, `evaluationBundleDigest` and `rollbackTarget` (a previous version or null).

The rollout state (`DRAFT`, `CANARY`, `ACTIVE`, `RETIRED`, `REVOKED`) is status, not content. It is kept in the same append-only status log as model admission, so promoting or retiring a prompt never edits its version.

Registering the same (id, version) again with any difference is refused, so a prompt edit is a new version.

## Agent classes (§12A.5)

`PATIENT_NAVIGATION`, `CLINIC_OPERATIONS`, `CLINICIAN_ASSIST`, `ANALYTICS_RESEARCH` and `INTEGRATION_BROWSER`.

Each `AgentClassProfile` has a data-class ceiling and a capability allowlist. **Patient-navigation and clinic-operations allowlists must be disjoint.** Registering a class profile that overlaps the other is refused, so one agent class can never inherit the other's capabilities, even on a shared model backend. `CLINICIAN_ASSIST` can never hold a capability whose id names signing, prescribing or clinical-truth writes (`.sign`, `.prescribe`, `.order.place`, `.result.finalize`).

## Selection

`selectModel({ agentClass, taskClass, dataClasses, capabilityId, residency, primary, fallbacks })` considers the primary profile first, then each listed fallback in order. It never invents a candidate. A candidate is eligible only when all of these hold:

1. it is `ADMITTED` (with no global admission: the task class, data classes and agent class must each be allowed by the profile);
2. it is not disabled by any kill switch;
3. it is healthy (`DEGRADED` is allowed only when no healthy eligible candidate exists);
4. its deployment satisfies the requested residency (`KSA_ONLY` → `TENANT_DEVICE`, `ZYARA_KSA` or `PROVIDER_KSA`; `GCC` adds `PROVIDER_GCC`);
5. the agent class allowlist contains `capabilityId`, and the data classes are within the agent class ceiling.

A **fallback never widens** the primary's boundary:

- a fallback whose deployment is less restricted than the primary's is refused (order: `TENANT_DEVICE` < `ZYARA_KSA` < `PROVIDER_KSA` < `PROVIDER_GCC` < `PROVIDER_OTHER`);
- a `REMOTE` fallback for a `LOCAL` primary is refused (no silent cloud fallback);
- a fallback with a different `egressProviderId` and a broader data-class set is refused.

The result is the chosen profile with a reason, or `NONE` with a per-candidate refusal list. It never silently picks something outside the request.

## Kill switches (§12A.6)

A `KillSwitchState` store, separate from the profiles, holds global, provider, model (profile id), capability and prompt (id) switches. Each switch records who set it, when and why, and is append-only.

`isDisabled(...)` reads only this store and never calls a model or provider, so an emergency disable works while the affected provider is down. Selection and prompt binding consult it first.

## Invocation binding

`bindInvocation(profileRef, promptRef)` checks:

- the profile and prompt exist at those exact versions;
- the prompt is compatible with the model;
- nothing is revoked or disabled;
- the prompt's rollout state is `CANARY` or `ACTIVE`.

It returns a frozen `InvocationBinding`: profile id and version, model revision, prompt id and version, instruction digest, safety policy version, output schema, evaluation bundle digest and a binding digest. Because prompt and profile versions are immutable, a later prompt edit (a new version) cannot change a historical binding. Revoking or suspending a profile, or revoking or retiring a prompt, blocks new bindings and leaves existing bindings untouched.

## Registration authority, health freshness, rollback and in-flight work

- **Who may register or change status.** Model profiles, prompts, agent-class profiles, status changes and kill switches are accepted only from a `platform_admin` human or the `release_pipeline` system principal, the same registrar authority as AIF-01A. An agent principal is always refused, so no agent can admit a model or prompt or lift a kill switch.
- **Prompt capability bound.** At registration, a prompt's `allowedCapabilities` must be a subset of its agent class's allowlist. A prompt can never grant more than its agent class holds.
- **Health freshness.** Each health report carries `observedAt`. A report older than `HEALTH_MAX_AGE_MS` (5 min) at selection time, or one that is missing, counts as `DOWN`. Unknown health is never treated as healthy.
- **Rollback target.** A prompt's `rollbackTarget` must name an earlier version of the same prompt id that has been `ACTIVE` at some point (the status log proves it) and is not `REVOKED`, or be null. Rolling back activates that version again; it never edits the current one.
- **In-flight work.** `assertBindingLive(binding)` re-checks the kill switches and the revocation, suspension and retirement state of the bound profile and prompt. The runtime (AIF-04C) calls it before each dispatch step, so a kill switch stops in-flight work at its next step. An external call already dispatched is not recalled here; its outcome stays subject to AIF-01A UNKNOWN-outcome reconciliation.

## Required tests (handoff §8)

- a remote provider alias alone is insufficient for production identity;
- a fallback cannot silently widen residency or data use;
- patient-agent and clinic-agent profiles cannot exchange capabilities;
- revoked or suspended model profiles cannot execute new work;
- prompt version changes do not mutate historical receipts;
- the kill switch works without invoking the affected provider.

Plus:

- no global admission (a task, data or agent class outside the profile is refused);
- a clinician-assist agent can never hold signing or prescribing capabilities;
- a duplicate version with different content is refused;
- `CREDENTIAL` can never be an allowed data class;
- selection degrades only among authorized alternatives.

## Hardening from the pstack panel (recorded as rules)

- **Model identity.** A revision is refused when any of its words (split on `- _ . : / @`) is a floating alias (`latest`, `stable`, `default`, `preview`, `current`, `beta`, `alpha`, `newest`, `auto`, `main`, `master`, `head`, `nightly`, `next`, `edge`, `canary`, `dev`, `trunk`, `tip`). It must also carry an actual pin: a date (YYYYMMDD or YYYY-MM-DD), a semantic version or a digest (`sha256-…`, or 12+ hex). A provider alias that merely contains a number (`gpt-4o`) is not a pin.
- **Profile fields.** `costPolicyRef` and `updateStrategyRef` are required (plan §12A.1).
- **Agent-class fields.** `retentionDays`, `approvalPolicyRef` and `disclosureRef` are required (plan §12A.5).
- **Fallback.** A fallback with a **different** `egressProviderId` is always refused, because another provider has other data-use and retention terms. An optional `runtimeClass: LOCAL` in the request restricts every candidate, the primary included, to local runtimes.
- **Kill switches.** A capability kill switch on any of a prompt's `allowedCapabilities` blocks new bindings and in-flight work. Kill-switch changes are recorded in time order per switch, and the target must be a valid id.
- **Binding compatibility.** The prompt's output schema must equal the model's structured output schema, and a prompt with capabilities needs a model admitted for tool use. The binding also carries the profile digest. `assertBindingLive` refuses a binding whose revision, instruction digest or profile digest does not match the registered versions.
- **Clinician-assist.** Every capability must end in a preparatory verb (`read`, `draft`, `summarize`, `suggest`, `prepare`, `propose`, `explain`, `search`, `list`, `view`, `translate`). This is an allowlist, so new authority verbs (cosign, esign, attest) are refused by default. The data ceiling can never include `CLINICAL_SIGNING_REQUIRED`.
- **Status.** Model admission follows CANDIDATE→SHADOW|ADMITTED, SHADOW→ADMITTED, ADMITTED↔SUSPENDED, and any state→REVOKED (final); a shadow model cannot reach ADMITTED through SUSPENDED. `assertBindingLive` compares every bound field (revision, digests, agent class, safety policy, evaluation bundle, output schema) with the registered versions. Prompt rollout follows DRAFT→CANARY→ACTIVE→RETIRED (RETIRED→ACTIVE is a rollback re-activation), with REVOKED final. Every change needs a reason and is recorded in time order; registration takes an ISO time.
- **Health.** A report up to 30 s in the future is tolerated (clock skew), and an older report never overwrites a newer one.
