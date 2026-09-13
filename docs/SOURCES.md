# Source and Donor Landscape

Snapshot: 2026-09-11.

The [2026-09-13 canonical qualification](canonical/ZYARA_SOURCE_QUALIFICATION.md) evaluates these 90 entries, the eight existing healthcare additions and 17 new candidates (115 total), including the user-suggested SpecGrain. This original landscape remains the founder authorization record; new research does not expand private permissions implicitly.

This repository records **90 unique general source/reference projects** supplied or researched for the broader platform landscape, plus healthcare-native additions below.

## Governance rule

A source appearing here is not automatically a dependency and is not automatically copied wholesale.

Before direct code adoption, record:

- exact upstream URL;
- commit/tag;
- files/modules copied or adapted;
- authorization basis;
- upstream license/notices;
- security review;
- Zyara modifications;
- maintenance/update strategy.

The founder states that **all 90 unique sources in the combined landscape below are authorized for Zyara to use/copy**. This includes the five newly added unique sources in this revision, and explicitly re-confirms authorization for OpenRAG, which was already source #15 and therefore is not counted twice.

Founder authorization does not remove the need to preserve exact upstream provenance, applicable public license/notices, attribution obligations, security review, and the precise code/components adopted. If Zyara relies on a founder-held permission that is broader or different from an upstream public license, the donor-adoption record must preserve documentary evidence of that permission and its scope before direct incorporation.

The healthcare-native additions listed later were added during Zyara research and are not covered by the 90-source founder authorization statement unless separately confirmed; use them according to their upstream licenses/permissions.

## Highest-value mappings for Zyara

| Capability | First sources to study |
|---|---|
| Geospatial | PostGIS |
| Search | Meilisearch, Onyx, OpenRAG |
| Identity/auth | ZITADEL, Keycloak |
| Fine-grained authorization | OpenFGA, OPA |
| Scheduling patterns | Cal.com, Rallly |
| Analytics | PostHog, Apache Superset, Umami, Nao |
| Provider forms/admin | Formbricks, Baserow, Teable, Grist |
| Messaging/support | Chatwoot, Zammad, Chaskiq, UVDesk, Peppermint |
| Email/campaign/reminders | Listmonk, Mautic |
| Durable workflows | Temporal, Flowable |
| Integrations/automation | Activepieces, Apache Camel, Debezium |
| Secrets | Infisical |
| Feature flags | Flagsmith |
| Observability | OpenTelemetry Collector, Prometheus, SigLens, Uptime Kuma, Checkmate |
| Documents | Paperless-ngx, Gotenberg, Stirling PDF, Erugo |
| Enterprise metadata/workflows | Odoo, Frappe Framework, Corteza, Hasura |
| Collaboration/admin patterns | Huly, Mattermost, Element, Zulip, Outline, AppFlowy, AFFiNE, Block Buzz |
| AI/RAG/context | OpenRAG, Onyx, AnythingLLM, Graphify, code-graph-rag |
| Voice/local ASR | OpenWhispr, OpenSuperWhisper |
| Internal agent orchestration | Munder Difflin, fullstack-agent |
| Sandboxed AI/tool execution | OpenSandbox |
| Rules | GoRules |
| Local integration testing | LocalStack |

## 90-project landscape

### Founder-provided sources (62)

| # | Source | URL |
|---:|---|---|
| 1 | Horilla HR | https://github.com/horilla-opensource/horilla |
| 2 | code-graph-rag | https://github.com/vitali87/code-graph-rag |
| 3 | Graphify | https://github.com/Graphify-Labs/graphify |
| 4 | Odoo | https://github.com/odoo/odoo |
| 5 | Baserow | https://github.com/bramw/baserow |
| 6 | ZITADEL | https://github.com/zitadel/zitadel |
| 7 | Apache Superset | https://github.com/apache/superset |
| 8 | EspoCRM | https://github.com/espocrm/espocrm |
| 9 | Nao | https://github.com/getnao/nao |
| 10 | Erugo | https://github.com/ErugoOSS/Erugo |
| 11 | Huly Platform | https://github.com/hcengineering/platform |
| 12 | Papercups | https://github.com/papercups-io/papercups |
| 13 | Listmonk | https://github.com/knadh/listmonk |
| 14 | Kroki | https://github.com/yuzutech/kroki |
| 15 | OpenRAG | https://github.com/langflow-ai/openrag |
| 16 | Documenso | https://github.com/documenso/documenso |
| 17 | PostGIS | https://github.com/postgis/postgis |
| 18 | Label Studio | https://github.com/HumanSignal/label-studio |
| 19 | Onyx | https://github.com/onyx-dot-app/onyx |
| 20 | Peppermint | https://github.com/Peppermint-Lab/peppermint |
| 21 | Rallly | https://github.com/lukevella/rallly |
| 22 | Cal.com organization | https://github.com/calcom |
| 23 | Plane | https://github.com/makeplane/plane |
| 24 | PostHog | https://github.com/PostHog/posthog |
| 25 | Formbricks | https://github.com/formbricks/formbricks |
| 26 | Paperless-ngx | https://github.com/paperless-ngx/paperless-ngx |
| 27 | Attendize | https://github.com/Attendize/Attendize |
| 28 | Flarum organization | https://github.com/flarum |
| 29 | Mautic organization | https://github.com/mautic |
| 30 | Infisical | https://github.com/Infisical/infisical |
| 31 | Strapi | https://github.com/strapi/strapi |
| 32 | Flagsmith | https://github.com/Flagsmith/flagsmith |
| 33 | Chaskiq | https://github.com/chaskiq/chaskiq |
| 34 | Hasura organization | https://github.com/hasura |
| 35 | HumHub | https://github.com/humhub/humhub |
| 36 | Uptime Kuma | https://github.com/louislam/uptime-kuma |
| 37 | Taiga organization | https://github.com/taigaio |
| 38 | Outline | https://github.com/outline/outline |
| 39 | BigCapital | https://github.com/bigcapitalhq/bigcapital |
| 40 | Corteza | https://github.com/cortezaproject/corteza |
| 41 | Pretix | https://github.com/pretix/pretix |
| 42 | MiroTalk | https://github.com/miroslavpejic85/mirotalk |
| 43 | SigLens | https://github.com/siglens/siglens |
| 44 | Stirling PDF | https://github.com/Stirling-Tools/Stirling-PDF |
| 45 | Mattermost | https://github.com/mattermost/mattermost |
| 46 | Frappe HRMS | https://github.com/frappe/hrms |
| 47 | Snipe-IT | https://github.com/snipe/snipe-it |
| 48 | AnythingLLM | https://github.com/Mintplex-Labs/anything-llm |
| 49 | Teable | https://github.com/teableio/teable |
| 50 | GoRules organization | https://github.com/gorules |
| 51 | Checkmate | https://github.com/bluewave-labs/Checkmate |
| 52 | Umami | https://github.com/umami-software/umami |
| 53 | AppFlowy | https://github.com/AppFlowy-IO/AppFlowy |
| 54 | Gotenberg | https://github.com/gotenberg/gotenberg |
| 55 | Akaunting | https://github.com/akaunting/akaunting |
| 56 | AFFiNE | https://github.com/toeverything/AFFiNE |
| 57 | Grist Core | https://github.com/gristlabs/grist-core |
| 58 | Element organization | https://github.com/element-hq |
| 59 | LocalStack | https://github.com/localstack/localstack |
| 60 | Geta organization | https://github.com/Geta |
| 61 | UVDesk organization | https://github.com/uvdesk |
| 62 | Block Buzz | https://github.com/block/buzz |

### Additional researched sources — also founder-authorized for Zyara use/copying (23)

| # | Source | URL |
|---:|---|---|
| 63 | Kanboard | https://github.com/kanboard/kanboard |
| 64 | OpenProject | https://github.com/opf/openproject |
| 65 | Chatwoot | https://github.com/chatwoot/chatwoot |
| 66 | LiveHelperChat | https://github.com/LiveHelperChat/livehelperchat |
| 67 | Zammad | https://github.com/zammad/zammad |
| 68 | Frappe Helpdesk | https://github.com/frappe/helpdesk |
| 69 | GLPI | https://github.com/glpi-project/glpi |
| 70 | NetBox | https://github.com/netbox-community/netbox |
| 71 | Backstage | https://github.com/backstage/backstage |
| 72 | Temporal | https://github.com/temporalio/temporal |
| 73 | Flowable | https://github.com/flowable/flowable-engine |
| 74 | Activepieces | https://github.com/activepieces/activepieces |
| 75 | Apache Camel | https://github.com/apache/camel |
| 76 | Debezium | https://github.com/debezium/debezium |
| 77 | Keycloak | https://github.com/keycloak/keycloak |
| 78 | OpenFGA | https://github.com/openfga/openfga |
| 79 | Open Policy Agent | https://github.com/open-policy-agent/opa |
| 80 | Zulip | https://github.com/zulip/zulip |
| 81 | BookStack | https://github.com/BookStackApp/BookStack |
| 82 | Meilisearch | https://github.com/meilisearch/meilisearch |
| 83 | OpenTelemetry Collector | https://github.com/open-telemetry/opentelemetry-collector |
| 84 | Prometheus | https://github.com/prometheus/prometheus |
| 85 | Frappe Framework | https://github.com/frappe/frappe |

### Newly added founder-authorized sources (5 unique)

| # | Source | URL | Upstream license observed on 2026-09-11 | Primary Zyara role |
|---:|---|---|---|---|
| 86 | Munder Difflin | https://github.com/chaitanyagiri/munder-difflin | MIT | Internal multi-agent orchestration, memory/mailbox/blackboard, approvals, circuit breakers, budgets/telemetry |
| 87 | fullstack-agent | https://github.com/jaredrhod/fullstack-agent | AGPL-3.0-or-later in upstream README/repository metadata | Modular agent stack, persistent memory, voice integration, component assembly patterns |
| 88 | OpenSandbox | https://github.com/opensandbox-group/OpenSandbox | Apache-2.0 | Secure AI/tool sandboxing, Docker/Kubernetes runtime, egress controls, credential injection, MCP/SDK patterns |
| 89 | OpenWhispr | https://github.com/OpenWhispr/openwhispr | MIT | Cross-platform local/private ASR, voice UX, Whisper/Parakeet patterns, multilingual dictation, API/MCP patterns |
| 90 | OpenSuperWhisper | https://github.com/Starmel/OpenSuperWhisper | MIT | Lightweight real-time local transcription, Whisper/Parakeet engine patterns, model/microphone/shortcut UX |

### Explicitly re-confirmed existing source

`langflow-ai/openrag` is already #15 above. On 2026-09-11 the founder explicitly re-confirmed permission to copy/use its code. It remains one unique source and therefore does not increase the count from 90 to 91.

Observed upstream role: comprehensive RAG platform built around Langflow, Docling and OpenSearch. Observed upstream public license: Apache-2.0.

## Source-specific planning notes for the 2026-09-11 additions

### Munder Difflin

Study/adapt only the patterns that improve internal Zyara operations:

- supervisor/router orchestration;
- atomic mailbox/task handoff;
- shared blackboard/event-log concepts;
- long-term operational memory;
- approval queues;
- circuit breakers;
- agent budgets and telemetry;
- isolated workspaces/worktrees.

Do **not** use free-form multi-agent consensus as patient-facing clinical evidence.

### fullstack-agent

Study/adapt:

- modular composition of memory + voice + interface capabilities;
- install/configuration flow patterns;
- replaceable components and user-owned state;
- agent identity/memory separation.

Because upstream publicly identifies AGPL-3.0-or-later, direct code incorporation into any differently licensed Zyara component must rely on either AGPL compliance or documented separate permission with sufficient scope. The founder has stated that such code is authorized for use/copying; Astro must preserve the specific permission evidence if relying on it beyond the public license.

### OpenSandbox

Priority donor/reference for:

- sandbox lifecycle APIs;
- Docker/Kubernetes execution;
- command/filesystem/code-interpreter interfaces;
- network ingress/egress policy;
- scoped credential injection;
- strong workload isolation patterns;
- agent evaluation runners;
- MCP integration.

Use for non-clinical internal AI/tool execution with least privilege. No sandbox gets unrestricted production patient-store access.

### OpenWhispr

Priority donor/reference for:

- privacy-first local transcription;
- cross-platform audio capture;
- Whisper/Parakeet-style local ASR;
- optional cloud/BYOK provider abstraction;
- multilingual dictation/translation;
- transcript/notes/API/MCP patterns.

Zyara should reuse patterns, not inherit an unrestricted general desktop agent into the healthcare recommendation path.

### OpenSuperWhisper

Study/adapt:

- real-time recording/transcription flow;
- Whisper/Parakeet engine selection;
- local model download/management;
- microphone selection;
- push/hold-to-record UX;
- language autodetection;
- audio-file queue processing.

Current upstream is macOS-focused; Zyara must keep its patient voice architecture platform-neutral.

### OpenRAG

Continue using as an AI/RAG source for:

- ingestion/document processing;
- retrieval architecture;
- grounded internal knowledge assistants;
- provider policy/support knowledge;
- provenance-aware retrieval evaluation.

Generic RAG output is not authoritative medical advice. Patient-facing retrieval must use approved, versioned sources with provenance and safety evaluation.

## Healthcare-native additions

These are specifically relevant to Zyara's health domain and should be considered in addition to the 90 general sources:

| Source | URL | Study/reuse purpose |
|---|---|---|
| Medplum | https://github.com/medplum/medplum | FHIR-native healthcare app/server patterns |
| HAPI FHIR | https://github.com/hapifhir/hapi-fhir | FHIR implementation patterns |
| OpenEMR | https://github.com/openemr/openemr | EHR/practice/scheduling patterns |
| OpenMRS | https://github.com/openmrs/openmrs-core | Medical record platform/domain patterns |
| Bahmni | https://github.com/Bahmni/bahmni-core | Hospital workflows and integrations |
| Synthea | https://github.com/synthetichealth/synthea | Synthetic patient data/testing |
| OHIF Viewer | https://github.com/OHIF/Viewers | DICOMweb/imaging UI reference |
| Orthanc | https://github.com/orthanc-mirrors/orthanc | DICOM/PACS integration reference |

## Competitor/product research references

These are product references, not code donors:

- Doctolib — https://about.doctolib.com/patients/
- Zocdoc — https://www.zocdoc.com/about/
- Zocdoc verified reviews — https://www.zocdoc.com/about/verifiedreviews/
- Vezeeta Saudi — https://saudi.vezeeta.com/en
- Okadoc — https://www.okadoc.com/en-sa/pro
- Practo — https://www.practo.com/
- Docplanner — https://www.docplanner.com/
- Healthgrades — https://www.healthgrades.com/
- OneDoc — https://www.onedoc.ch/en/

## Official Saudi references

- SCFHS practitioner verification — https://scfhs.org.sa/en/node/1992
- National Address API documentation — https://api.address.gov.sa/apidocumentation
- MOH E-Health Complete Vision — https://www.moh.gov.sa/en/Ministry/nehs/Pages/The-Complete-Vision.aspx
- MOH interoperability direction — https://www.moh.gov.sa/Ministry/vro/eHealth/Documents/MoH-Digital-Health-Strategy-Update.pdf
- SDAIA PDPL knowledge center — https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/
- PDPL Implementing Regulation — https://sdaia.gov.sa/en/SDAIA/about/Documents/ImplementingRegulation.pdf

## Source-selection guidance

Astro should not ask “Which source can we copy?” first.

For every capability, ask:

1. What is the exact Zyara requirement?
2. Is it strategically differentiating?
3. Is a source mature and maintainable?
4. Can the relevant component be adopted cleanly?
5. What is its license/notice/security burden?
6. Will adopting it make upgrades easier or harder?
7. Can it be isolated behind an adapter?
8. Does direct reuse require documentary evidence of founder-held permission beyond the upstream public license?

The highest-value custom Zyara code should concentrate on healthcare graph semantics, multilingual healthcare discovery, explainable ranking, verified trust, provider integrations, patient continuity and safe AI navigation.
