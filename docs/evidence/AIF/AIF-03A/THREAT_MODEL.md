# AIF-03A Threat Model (delta)

| Threat | Mitigation | Proof (`tests/aif03a/registry.test.ts`) |
| --- | --- | --- |
| A model runs as a floating alias that silently changes underneath | a pin is required (date, semver or digest); a floating word in any position is refused | "refuses a floating alias…", "refuses floating aliases in any position…" |
| A model is used outside what it was qualified for | no global admission: task, data and agent class must each be admitted; CREDENTIAL never | "admits nothing globally…" |
| Fallback widens residency, runtime or data use | only listed and admitted candidates; a fallback can never be less restricted in residency, go local to remote, or use another egress provider; an optional LOCAL constraint | "refuses a fallback that widens…", "refuses any fallback to another egress provider…" |
| A patient agent obtains clinic capabilities, or the reverse | disjoint allowlists in either registration order; prompts bounded by their agent class; selection checks the agent class | "keeps patient-navigation and clinic-operations capabilities apart" |
| A clinician-assist agent signs or prescribes | a preparatory-verb allowlist; CLINICAL_SIGNING_REQUIRED never in its ceiling | "never lets a clinician-assist agent sign…", "allows clinician-assist only preparatory verbs…" |
| A prompt edit rewrites history | immutable versions, a registry-computed instruction digest, frozen bindings with a binding digest | "never lets a prompt edit change a historical binding" |
| A revoked or suspended model, or a retired prompt, keeps working | `assertBindingLive` before each dispatch step; legal transitions only; REVOKED is final | "blocks new work…", "blocks new bindings for a retired or draft prompt", "enforces legal transitions…" |
| A kill switch depends on the failing provider, or can be undone out of order | switches are read from registry state only, with monotonic time per switch; capability switches cover prompt capabilities | "disables without invoking the affected provider…", "refuses a capability kill switch…" |
| A forged binding passes the runtime check | every bound field is compared with the registered versions | "binds only schema- and tool-compatible pairs and refuses a forged binding" |
| An agent changes the registry | only a platform admin or the release pipeline may | "…lets only trusted registrars change state" |
| Stale or unknown health is trusted | older than 5 min, or missing, counts as down; 30 s skew tolerance; older reports never overwrite newer ones | "treats missing or stale health as down…", "tolerates small clock skew…" |

Residuals:

- The registry is in-process. Durable storage and an audited status-log table belong to the AIF-04 runtime, or to a later migration.
- Registrar authenticity (that `platform_admin` is a real authenticated admin) sits at the API layer, as in AIF-01A.
- Selection quality (cost, latency) is not optimized. Selection only enforces authority boundaries.
- No real model is admitted. Evaluation bundles and licenses are references, and real qualification is AIF-03B.
