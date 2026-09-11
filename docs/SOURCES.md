# Source and Donor Landscape

Snapshot: 2026-09-11.

This repository records **85 general source/reference projects** supplied or researched for the broader platform landscape, plus healthcare-native additions below.

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

The founder states that the 62 founder-provided sources are authorized for use/copying. The repository should still preserve upstream provenance and license/notice obligations.

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
| Rules | GoRules |
| Local integration testing | LocalStack |

## 85-project landscape

### Founder-provided / founder-authorized sources (62)

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

### Additional researched sources (23)

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

## Healthcare-native additions

These are specifically relevant to Zyara's health domain and should be considered in addition to the 85 general sources:

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

The highest-value custom Zyara code should concentrate on healthcare graph semantics, multilingual healthcare discovery, explainable ranking, verified trust, provider integrations, patient continuity and safe AI navigation.
