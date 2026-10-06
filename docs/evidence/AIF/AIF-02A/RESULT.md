# AIF-02A Result — Privacy and Egress Gate

Base: `main` @ `f18aabc9`, merged forward with `main` @ `6d992fc3`. Branch: `feat/zyara-network-aif02a-privacy-egress`.
Scope: `WORK_PACKET.md`. The exit marker `PRIVACY_EGRESS_GATE_QUALIFIED = TRUE` is recorded after exact-head CI and merge.

## Delivered

- `@zyara/privacy-egress` `decideEgress()`. In order, it:
  - classifies fields from a server-held `PayloadSchema`;
  - refuses credentials;
  - enforces local-only classes, with no silent cloud fallback;
  - checks the provider manifest (class ceiling, allowed providers, purpose, retention);
  - checks subject-bound consent on parsed instants;
  - minimizes (drop, redact, or path-bound tenant-keyed HMAC pseudonym);
  - only then builds a receipt that holds paths, classes, transforms and keyed digests of what is sent, plus the policy, schema, provider, manifest version, zones, purpose, retention, human review and server time. It never holds values.
- `@zyara/capability-gateway` exports `containsCredentialShape`.
- Workflow `aif02a-ci`.

## Handoff §6 tests → proof (`tests/aif02a/egress.test.ts`)

| Handoff test | Test |
| --- | --- |
| PHI to an unapproved provider denied | "denies PHI to an unapproved provider" (local-only and class ceiling) |
| no silent cloud fallback | "never falls back silently to the cloud" |
| missing purpose denied | "denies a missing purpose" |
| revoked consent denied | "denies revoked or missing consent…", "compares consent instants…", "counts only the data subject's own consent" |
| minimization before the egress receipt | "minimizes before the receipt: digests match what is actually sent", DROP test |
| logs never contain redacted source values | "never logs source values in a denial receipt", "keeps the tenant key and raw values out of receipts" |
| a local-only class refuses a remote provider | "refuses a local-only class at a remote provider" |
| **required rule:** CREDENTIAL never exportable | "refuses a credential field even when the policy maps the class…" |

The handoff's "must model" items are all present: data class, source trust zone, destination/provider, purpose, consent requirement, minimization transform, retention, local-only flag, allow/deny, reason, and policy version.

## Runs (candidate content)

- AIF-02A: 28/28 tests.
- Regressions: AIF-01A 37, AIF-01B 50, M051 3.
- Typecheck and lint (`privacy-egress`, `capability-gateway`, `aif02a-tests`) and boundaries: clean.
- No database change, so there is no DB smoke.

## Reviews

- Jev: `JEV_REVIEW.md`. Five design gaps closed before code; all blocking questions are "no" on the final files.
- Alibaba Open Code Review, delegate mode: `OCR_REVIEW.md`.
- pstack: `PSTACK_EVIDENCE.md`. Full panel plus delta cycles, with all must-fix items closed.
- Graft 0.21.1 (local graph only, telemetry off):
  - `graft callers containsCredentialShape` shows `privacy-egress` `evaluate` as the only consumer.
  - `graft callers isConsented` shows M051 `authorizeClinicalRead`, `partner-analytics` `analyticsAllowed` and `patient-matching` `importAllowed`. Those are the callers affected by the pre-existing M051 defect below.

## Residual risks

- A mis-declared payload schema is the main residual, because classification is only as good as the admitted schema.
- Nothing yet makes every invocation call the gate. AIF-04 must persist an egress receipt per model/tool/browser/local invocation.
- Trace and log redaction for the runtime is AIF-02B/AIF-04. This gate has no log sink.
- **Pre-existing, outside this slice:** M051 `isConsented` compares ISO timestamps as strings. Mixed formats (sub-second precision or offsets) can misorder grant and revocation times, which affects `authorizeClinicalRead`, partner analytics and patient matching. This gate does not use it. A follow-up slice should fix M051 itself.
- The tenant pseudonym and digest key is supplied by the caller. Key custody and rotation belong to AIF-02B credential mediation.
