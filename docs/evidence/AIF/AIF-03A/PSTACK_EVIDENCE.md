# AIF-03A pstack Evidence

The security trigger applies (which AI may run, under which authority, and how it is stopped), so one fresh-context judge carried all four bars.

## Panel on `7c11a52..4bf5f04`

Five must-fix items, all fixed in `6abc8c8`:

- the floating-alias check missed `@latest`, `main`, `nightly`, `canary` and similar;
- a fallback to another egress provider with the same classes was allowed;
- a capability kill switch did not stop binding or in-flight work;
- binding did not check the output schema or tool use;
- the clinician-assist blocklist had gaps (cosign, esign, attest, prescription.issue…). It is now an allowlist of preparatory verbs, and CLINICAL_SIGNING_REQUIRED is never in the ceiling.

Worth-considering items applied:

- forged-binding detection;
- legal transitions with reasons, in time order;
- monotonic kill switches;
- health clock skew, and out-of-order reports ignored;
- a runtime constraint;
- cost/update and agent-class retention, approval and disclosure fields;
- the profile digest in the binding;
- a test that previously claimed more than it asserted, repaired.

Recorded rather than changed: a PROMPT kill switch covers every version of a prompt id (the safer choice), and duplicate candidates are harmless.

## Delta re-reviews

| Cycle | Delta | Result |
| --- | --- | --- |
| 1 | `4bf5f04..6abc8c8` | all 6 CLOSED. New must-fix: `+` was not a word separator (`gpt4+latest`). Worth-considering items applied in `18da0f6`: a real pin is required (date, semver or digest; `gpt-4o` is not a pin), every bound field is compared, and SHADOW can no longer reach ADMITTED through SUSPENDED |
| 2 | `6abc8c8..18da0f6` | all 3 CLOSED, **no must-fix**. Applied: calendar-valid dates in the pin rule, a test that SHADOW→SUSPENDED is refused, and tamper tests for evaluation bundle and output schema. OCR's nested-ternary rule is also fixed (lookup table) |

## Mechanical gate

AIF-03A 19/19. Typecheck and lint (`model-registry`, `aif03a-tests`) and boundaries: clean.
