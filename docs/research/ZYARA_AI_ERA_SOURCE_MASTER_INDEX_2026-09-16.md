# Zyara AI-Era Source Master Index

**Research date:** 2026-09-16
**Purpose:** give Astro a curated source universe for building the full Zyara Network and clinic-automation architecture.
**Relationship to existing work:** `ZYARA_SOURCE_QUALIFICATION.md` remains the broader 115-entry source qualification ledger. This file adds the AI-era/automation view and identifies the highest-value founder-owned and external sources Astro should study first.

## Source-use policy

The founder states permission to use/copy source from explicitly supplied repositories and founder-owned GitHub sources. That permission does not eliminate:

- exact repository/revision pinning;
- file/component-level provenance;
- public license and NOTICE obligations;
- private permission evidence handling;
- dependency/SBOM review;
- security review;
- data/PHI/privacy review;
- maintenance/update strategy;
- proof that reuse is better than a stable dependency or native implementation.

Do not copy whole platforms merely because access or permission exists.

### Public/private boundary

Zyara is a public repository. Founder-owned private repositories discovered through connected GitHub access must **not** be named, summarized, copied or otherwise disclosed into this public repository unless the founder separately authorizes public disclosure of that source. Astro may use private connected material only within its permitted session context and must keep public planning artifacts disclosure-safe.

## A. Founder-owned public sources with direct Zyara value

| Source | Zyara value | Recommended mode |
|---|---|---|
| [TheHalfMoon/Zyara](https://github.com/TheHalfMoon/Zyara) | Product authority: discovery, provider graph, scheduling, reviews, FHIR model, privacy, analytics, patient/provider surfaces | PRIMARY_AUTHORITY |
| [TheHalfMoon/MedScale](https://github.com/TheHalfMoon/MedScale) | FHIR/SMART boundaries, provenance, privacy-first medical data patterns, interoperability contracts | REFERENCE / selective adaptation |
| [TheHalfMoon/MESC](https://github.com/TheHalfMoon/MESC) | FHIR validation/canonicalization, synthetic medical fixtures and reproducibility patterns | RESEARCH / VALIDATION |
| [TheHalfMoon/commandMed](https://github.com/TheHalfMoon/commandMed) | medical AI safety, evidence/tool separation, abstention/escalation, Arabic/English evaluation, deterministic checks | RESEARCH / SAFETY |
| [TheHalfMoon/commandF](https://github.com/TheHalfMoon/commandF) | FHIR package resolution, conformance/breaking-change intelligence and interoperability change impact | ENGINEERING / INTEROP REFERENCE |
| [TheHalfMoon/Himsat](https://github.com/TheHalfMoon/Himsat) | local-first capture/transcription/diarization, evidence-linked summaries, document intelligence | REFERENCE for ambient/visit intelligence |
| [TheHalfMoon/Wispral](https://github.com/TheHalfMoon/Wispral) | voice command vs aside, interruption, structured agent control, provenance and local-first voice | REFERENCE for voice/phone UX |
| [TheHalfMoon/Qdrat](https://github.com/TheHalfMoon/Qdrat) | clinic-workforce donor: organization/roles, shifts/leave, staff lifecycle, approvals, helpdesk/tasks, WhatsApp, reporting and audit patterns; see dedicated deep dive | HIGH-PRIORITY SELECTIVE ADAPTATION CANDIDATE |
| [TheHalfMoon/Signthos](https://github.com/TheHalfMoon/Signthos) | document/PDF/e-sign workflows and provenance discipline | REFERENCE for consent/forms/documents |
| [TheHalfMoon/Sentrdel](https://github.com/TheHalfMoon/Sentrdel) | security invariants, authorization evidence, explicit coverage gaps and policy control-plane patterns | SECURITY / ENGINEERING |
| [TheHalfMoon/Tarif](https://github.com/TheHalfMoon/Tarif) | deterministic AI-agent action authority, default deny, secret isolation, receipts and enforcement coverage | HIGH-PRIORITY REFERENCE for Zyara automation authority |
| [TheHalfMoon/Ecra](https://github.com/TheHalfMoon/Ecra) | browser/search/agent execution substrate, capability routing, receipts, compiled deterministic skills, human takeover | HIGH-PRIORITY REFERENCE for workflow automation/browser fallback |
| [TheHalfMoon/Golam](https://github.com/TheHalfMoon/Golam) | local-first agent OS, tool/memory/policy separation | LATER AGENT ARCHITECTURE REFERENCE |
| [TheHalfMoon/Golam-research](https://github.com/TheHalfMoon/Golam-research) | provider routing, MCP/tool bridging, desktop agent/sandbox research | REFERENCE_ONLY; fresh provenance/legal review required before any transfer |
| [TheHalfMoon/Kodac](https://github.com/TheHalfMoon/Kodac) | bounded execution, action receipts, provenance and proof-oriented completion | ENGINEERING / AGENT GOVERNANCE |
| [TheHalfMoon/Winds](https://github.com/TheHalfMoon/Winds) | exact-snapshot verification and execution evidence | ENGINEERING_ONLY |
| [TheHalfMoon/Ascout](https://github.com/TheHalfMoon/Ascout) | changed-code verification receipts and explicit not-run/unknown semantics | ENGINEERING_ONLY |
| [TheHalfMoon/SpecGrain](https://github.com/TheHalfMoon/SpecGrain) | recursive decomposition, bounded grains/work packets, evidence requirements | PLANNING METHOD |
| [TheHalfMoon/Diffcipline](https://github.com/TheHalfMoon/Diffcipline) | Think -> Challenge -> Minimize -> Change -> Prove | EXECUTION METHOD |
| [TheHalfMoon/Delethos](https://github.com/TheHalfMoon/Delethos) | bounded delegation, independent review and proof-carrying patches | ENGINEERING_ONLY |
| [TheHalfMoon/MSTR](https://github.com/TheHalfMoon/MSTR) | local model/runtime/harness evaluation and verified completion patterns | RESEARCH for future local/private model lane |
| [TheHalfMoon/Flake](https://github.com/TheHalfMoon/Flake) | local-first continuity, evidence-linked decisions and replaceable-agent context | ENGINEERING / continuity reference |
| [TheHalfMoon/wepld](https://github.com/TheHalfMoon/wepld) | governance/orchestration research lineage; current implementation state must be reverified before reuse | ENGINEERING_ONLY |

## B. Founder-supplied real-time/meeting sources

| Source | Zyara use | Initial mode |
|---|---|---|
| [block/buzz](https://github.com/block/buzz) | human-agent collaboration, scoped identities, event/activity streams, workflow approval patterns, tenant isolation, search and tamper-evident audit concepts; see dedicated deep dive | HIGH-PRIORITY SELECTIVE ADAPTATION / REFERENCE |
| [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) | real-time map/layer state, entity selection and contextual voice/tool UX | PATTERN_REIMPLEMENTED |
| [openimsdk/openmeeting](https://github.com/openimsdk/openmeeting) | meeting/mobile component patterns | ADAPTATION CANDIDATE after exact qualification |
| [suitenumerique/meet](https://github.com/suitenumerique/meet) | LiveKit-based self-hostable meeting product, recording/transcription/telephony patterns | STRONG ZYARA CONNECT CANDIDATE |
| [jitsi/jitsi-meet](https://github.com/jitsi/jitsi-meet) | mature WebRTC meeting UX and SDK patterns | INTEGRATION / REFERENCE |
| [bigbluebutton/bigbluebutton](https://github.com/bigbluebutton/bigbluebutton) | group care, education, breakout/whiteboard/polls/recording | GROUP-CARE REFERENCE |
| [nextcloud/talk-desktop](https://github.com/nextcloud/talk-desktop) | desktop/background communications client lifecycle | DESKTOP REFERENCE |
| [livekit/livekit](https://github.com/livekit/livekit) | primary real-time media infrastructure candidate | DEPENDENCY CANDIDATE |

## C. Healthcare core and FHIR/open clinical systems

| Source | Why Astro needs it | Mode |
|---|---|---|
| [medplum/medplum](https://github.com/medplum/medplum) | FHIR CDR, auth, API/SDK, bots/workflows and healthcare UI | DEPENDENCY/ADAPTATION CANDIDATE |
| [openemr/openemr](https://github.com/openemr/openemr) | whole-clinic EHR + practice management + scheduling + billing + FHIR comparator | REFERENCE_ONLY first; GPL boundary |
| [openmrs/openmrs-core](https://github.com/openmrs/openmrs-core) | mature modular longitudinal EMR domain model | REFERENCE_ONLY |
| [Bahmni](https://github.com/Bahmni) | integrated clinical/hospital workflows based on OpenMRS | REFERENCE_ONLY |
| [earthians/marley](https://github.com/earthians/marley) | Frappe Health open healthcare management/EHR patterns | REFERENCE / exact license review |
| [hapifhir/hapi-fhir](https://github.com/hapifhir/hapi-fhir) | mature FHIR server/client/validation ecosystem | DEPENDENCY/REFERENCE CANDIDATE |
| [synthetichealth/synthea](https://github.com/synthetichealth/synthea) | synthetic patient/test fixtures | DEVELOPMENT DEPENDENCY CANDIDATE |
| [hapifhir/org.hl7.fhir.core](https://github.com/hapifhir/org.hl7.fhir.core) | HL7 FHIR Java reference tooling lineage; exact use/license must be qualified | VALIDATION REFERENCE |
| [FHIR/sushi](https://github.com/FHIR/sushi) | FHIR Shorthand tooling when profiles/IG work requires it | DEVELOPMENT TOOL CANDIDATE |

## D. Labs, imaging and medical documents

| Source | Zyara use | Mode |
|---|---|---|
| [OHIF/Viewers](https://github.com/OHIF/Viewers) | DICOMweb viewer and imaging UX | INTEGRATION CANDIDATE |
| [jodogne/Orthanc](https://github.com/jodogne/Orthanc) | DICOM server/PACS interoperability patterns | INTEGRATION/REFERENCE CANDIDATE |
| [dcm4che/dcm4che](https://github.com/dcm4che/dcm4che) | DICOM tooling/PACS ecosystem | REFERENCE / component qualification |
| [DIGI-UW/OpenELIS-Global-2](https://github.com/DIGI-UW/OpenELIS-Global-2) | laboratory information-system workflow and integration model | REFERENCE/INTEGRATION CANDIDATE |
| [openboxes/openboxes](https://github.com/openboxes/openboxes) | medical inventory/supply-chain patterns when clinic inventory is in scope | REFERENCE_ONLY |
| [documenso/documenso](https://github.com/documenso/documenso) | e-signature workflow | REFERENCE / integration candidate after AGPL review |
| [Stirling-Tools/Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF) | self-hosted PDF operations | COMPONENT/REFERENCE; qualify license/dependencies |
| [microsoft/markitdown](https://github.com/microsoft/markitdown) | document-to-structured-text conversion for governed ingestion | DEVELOPMENT/INGESTION CANDIDATE |
| [google/magika](https://github.com/google/magika) | file-type detection before document processing | SECURITY/INGESTION CANDIDATE |

## E. Workflow engines, durable jobs and automation infrastructure

Astro must decide whether to extend current Zyara job/outbox architecture or admit a larger workflow engine. Do not add one by fashion.

| Source | Capability | Mode |
|---|---|---|
| [temporalio/temporal](https://github.com/temporalio/temporal) | durable long-running workflows, retries, signals and history | QUALIFICATION CANDIDATE for complex workflows |
| [n8n-io/n8n](https://github.com/n8n-io/n8n) | visual integrations/automation patterns; license/business model requires review | REFERENCE_ONLY first |
| [activepieces/activepieces](https://github.com/activepieces/activepieces) | open workflow/connector automation patterns | REFERENCE / component candidate after license review |
| [windmill-labs/windmill](https://github.com/windmill-labs/windmill) | scripts/workflows/jobs/admin automation patterns | REFERENCE / internal tooling candidate |
| [kestra-io/kestra](https://github.com/kestra-io/kestra) | durable event/workflow orchestration patterns | REFERENCE / qualification candidate |
| [timgit/pg-boss](https://github.com/timgit/pg-boss) | PostgreSQL-backed durable jobs already aligned with Zyara's existing architecture research | DEPENDENCY CANDIDATE |

## F. Notifications, conversations and contact-center infrastructure

| Source | Capability | Mode |
|---|---|---|
| [novuhq/novu](https://github.com/novuhq/novu) | unified notification workflows for in-app/email/SMS/push/chat, preferences and digests | DEPENDENCY/ADAPTATION CANDIDATE |
| [chatwoot/chatwoot](https://github.com/chatwoot/chatwoot) | omnichannel inbox, assignment, notes, automations and reports | PATTERN/SELECTIVE ADAPTATION CANDIDATE |
| [matrix-org/synapse](https://github.com/element-hq/synapse) | federated/secure messaging architecture reference | REFERENCE_ONLY unless a clear need emerges |
| [nextcloud/spreed](https://github.com/nextcloud/spreed) | Nextcloud Talk server/app communication patterns | REFERENCE_ONLY |

Channel vendors such as WhatsApp Business, SMS, email and voice providers are external integrations, not sources of clinical truth.

## G. Identity, authorization, policy and secrets

| Source | Capability | Mode |
|---|---|---|
| [keycloak/keycloak](https://github.com/keycloak/keycloak) | OIDC/OAuth identity, MFA, federation | DEPENDENCY CANDIDATE |
| [openfga/openfga](https://github.com/openfga/openfga) | relationship-based authorization | QUALIFICATION CANDIDATE |
| [cerbos/cerbos](https://github.com/cerbos/cerbos) | policy decision service | QUALIFICATION CANDIDATE |
| [open-policy-agent/opa](https://github.com/open-policy-agent/opa) | general policy engine | REFERENCE/QUALIFICATION CANDIDATE |
| [zitadel/zitadel](https://github.com/zitadel/zitadel) | identity platform alternative already in Zyara source research | ALTERNATIVE / DEFER unless selected |

The chosen model must support patient/delegate/clinic/practitioner/service-account/agent authority without flattening healthcare roles into generic app roles.

## H. Browser, agent and external-system automation

| Source | Capability | Mode |
|---|---|---|
| [microsoft/playwright](https://github.com/microsoft/playwright) | deterministic browser control/testing primitive | DEPENDENCY/ENGINEERING CANDIDATE |
| [browser-use/browser-use](https://github.com/browser-use/browser-use) | agent/browser automation patterns | REFERENCE_ONLY for model-assisted navigation |
| [opensandbox-group/OpenSandbox](https://github.com/opensandbox-group/OpenSandbox) | bounded execution/sandbox patterns | INTERNAL AUTOMATION REFERENCE |
| [tinyfish-io](https://github.com/tinyfish-io) | browser-agent/web-automation patterns from founder research | REFERENCE_ONLY unless exact repo/component qualified |

Browser automation is a last-mile adapter for systems without adequate APIs. It must not become the canonical data model.

## I. Search, geo, analytics and observability

| Source | Capability | Mode |
|---|---|---|
| [postgis/postgis](https://github.com/postgis/postgis) | geospatial storage/query | DEPENDENCY CANDIDATE |
| [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) | map renderer | DEPENDENCY CANDIDATE; tile/geocoder rights separate |
| [opensearch-project/OpenSearch](https://github.com/opensearch-project/OpenSearch) | search/index platform | BENCHMARK-GATED DEPENDENCY CANDIDATE |
| [apache/superset](https://github.com/apache/superset) | BI/analytics reference | INTERNAL ANALYTICS REFERENCE |
| [metabase/metabase](https://github.com/metabase/metabase) | operational analytics/BI patterns | INTERNAL REFERENCE / license review |
| [open-telemetry/opentelemetry-collector](https://github.com/open-telemetry/opentelemetry-collector) | telemetry collection | DEPENDENCY CANDIDATE |
| [prometheus/prometheus](https://github.com/prometheus/prometheus) | metrics | DEPENDENCY CANDIDATE |
| [grafana/grafana](https://github.com/grafana/grafana) | observability dashboards | OPERATIONS CANDIDATE / license review |

## J. Security and AI-safety sources

| Source | Capability | Mode |
|---|---|---|
| [Tencent/AI-Infra-Guard](https://github.com/Tencent/AI-Infra-Guard) | AI/agent/MCP security assurance patterns | SECURITY REFERENCE |
| [Tencent/AICGSecEval](https://github.com/Tencent/AICGSecEval) | AI security engineering evaluation | SECURITY REFERENCE |
| [OWASP GenAI Security Project](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications) | threat classes for LLM/agent systems | SECURITY REFERENCE |

Zyara-specific authorization, PHI handling and clinical/financial authority remain stricter than generic agent security.

## K. Planning/engineering source priority for Astro

Astro should spend source-research effort in this order:

```text
1. current Zyara implementation and canonical documents
2. official Saudi/HL7/DICOM/terminology authorities
3. GenHealth + Plena public feature/workflow evidence
4. founder-owned public healthcare/agent/authority sources
5. mature open healthcare systems and FHIR tooling
6. communications/workflow/identity infrastructure candidates
7. long-tail reference sources only when a concrete gap remains
```

## Required source-adoption output

For every source that survives research, Astro must produce:

```text
source
exact revision/release
public/private disclosure status
license + NOTICE obligations
target Zyara subsystem
capability sought
REFERENCE / DEPENDENCY / ADAPT / COPY / REJECT
security/data implications
transitive dependencies
upgrade strategy
native alternative
proof required before admission
```

A source list is not an architecture. Astro must converge on a small maintainable dependency set and reject overlapping platforms when one clear boundary is enough.

## L. 2026-09-22 AI Operating Fabric additions

The founder supplied additional sources specifically to strengthen Zyara's agent/tool/browser execution architecture. Detailed decisions live in `ZYARA_AI_OPERATING_FABRIC_SOURCE_ADOPTION_2026-09-22.md`.

| Source | Verified reference | Zyara use | Initial mode |
|---|---|---|---|
| [google/ax](https://github.com/google/ax) | `d8ed0fe38bceb7842d3c47817d53d16ccdfcb601` | task/workspace/gateway/model workload separation, isolation, budgets, lifecycle | REFERENCE / ADAPT |
| [superdesigndev/treg](https://github.com/superdesigndev/treg) | `6e667a4c6f7c70c448ea6574c5a038ba8f14bc5f` | capability/tool registry, server-side credential mediation, tool health/audit | ADAPT / COPY_SELECTIVE after permission evidence + exact path audit |
| [TheoLeeCJ/SemIf](https://github.com/TheoLeeCJ/SemIf) | `1f2dea3e25379f9dfc98cb83c324f00ab5deda37` | bounded semantic decisions | QUALIFY |
| [Mapika/decider](https://github.com/Mapika/decider) | `104b844b4b8b5d6993523af8cba1e62ef0c9c2e1` | typed probability/routing decisions | QUALIFY / REFERENCE |
| [tinyfish-io/agentql](https://github.com/tinyfish-io/agentql) | `418ba8ad1c69dfac134a6833369a01dfba5a24a7` | structured browser extraction/interaction | QUALIFY / DEPENDENCY candidate |
| [tinyfish-io/tinyfish-cookbook](https://github.com/tinyfish-io/tinyfish-cookbook) | `8615317f6db58ae776dd53817ac30668c1db5ef8` | browser workflow/reference corpus | REFERENCE |
| [tinyfish-io/bigset-oss](https://github.com/tinyfish-io/bigset-oss) | `73b5fd0289d17bf99f14e770eabc6b7ec7406bc5` | large-scale web/data patterns | REFERENCE / REJECT_DEFAULT runtime |
| [laya.aay.sh](https://laya.aay.sh/) | exact canonical source repo not pinned in this pass | Action Center / approval-centric operations UX | REFERENCE_PENDING_SOURCE_PIN |
| [desktopcommander.app](https://desktopcommander.app/) | exact canonical source repo not pinned in this pass | bounded local-machine bridge UX/operations reference | REFERENCE_PENDING_SOURCE_PIN |
| [bespokelabs/Bespoke-Nimble-9B](https://huggingface.co/bespokelabs/Bespoke-Nimble-9B) | HF metadata observed 2026-09-22 | structured evidence-grounding candidate | QUALIFY only |

### Relevant founder-owned source clusters

For the operating fabric, prioritize:

- `Sentrdel` — deny-by-default security/evidence/policy;
- `Ecra` — intent/tool/receipt patterns;
- `Kodac`, `Golam`, `MESC`, `MedScale` — sandbox, execution, model/process and privacy boundaries;
- `Qdrat` — clinic operations/tasks/reporting;
- `Winds`, `Delethos`, `kernux` — delegation/run/context/compare patterns;
- `commandF`, `commandMed` — healthcare interoperability/model safety;
- `Himsat`, `Wispral` — future local audio/voice control;
- `Signthos` — forms/consent/documents.

The detailed AIF plan owns admission order. No donor becomes runtime authority merely by appearing in this index.

