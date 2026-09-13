# Zyara privacy, security and compliance plan

Canonical planning, 2026-09-13. Accountable privacy/legal, security and clinical-safety owners must be assigned in M003. This is an engineering control plan with regulatory evidence and explicit legal review gates; it is not legal advice or a certification.

## Saudi evidence and limits

| Primary source, checked 2026-09-13 | Observed scope / confidence | Required decision |
|---|---|---|
| [SDAIA regulations hub](https://sdaia.gov.sa/en/SDAIA/about/Pages/RegulationsAndPolicies.aspx), [PDPL English text](https://sdaia.gov.sa/en/SDAIA/about/Documents/Personal%20Data%20English%20V2-23April2023-%20Reviewed-.pdf) | Government law publication; high confidence in text, applicability counsel-owned | Determine controllers/processors, lawful bases, notices, data-subject rights and accountable entity |
| [Implementing Regulation](https://sdaia.gov.sa/en/SDAIA/about/Documents/ImplementingRegulation.pdf) | Government; health-data handling includes restricted access/purpose and traceability provisions | DPIA, health-data controls, processor agreements, retention and role design reviewed before real data |
| [Transfer regulation](https://sdaia.gov.sa/Documents/RegulationonPersonalDataEN.pdf) | Government transfer framework | Review every cross-border processor, support route, backup, telemetry, ASR and AI transfer; no blanket assumption that all PDPL data must always remain locally hosted |
| [SFDA digital-health guidance](https://www.sfda.gov.sa/sites/default/files/2025-08/MDS-G027_1.pdf) | Government guidance; intended-use-dependent classification | Legal/clinical review of symptom navigation, marketing wording and any later decision support |
| [SCFHS registration verification](https://scfhs.org.sa/en/E-Services/regvaliddescription) | Government/professional authority verification service | Establish lawful verification workflow; public lookup does not grant bulk scraping/API permission |
| [MOH healthcare licensing](https://static.moh.gov.sa/assets/pdf/Healthcare-Licensing-EN.pdf) | Government licensing process | Facility/service privilege evidence and verification cadence; no presumed public bulk registry |
| [National Address API](https://api.address.gov.sa/apidocumentation) | Official API documentation | Confirm subscription/rights, address confidence and permissible storage |
| [NPHIES public IG](https://portal.nphies.sa/ig/index.html) and [vendor onboarding](https://v-academy.nphies.sa/courses/11/system-vendors-onboarding-course?lang=en) | Public IG identifies local development draft 1.0.0; onboarding lists later release material | Contracted current version, credentials and allowed insurance workflows required; NPHIES is not a universal booking API |
| [CST SMS rules](https://www.cst.gov.sa/en/regulations-and-licenses/regulations/Document-504), [WhatsApp Business policy](https://whatsappbusiness.com/policy/) | Government regulation / vendor platform policy | Sender setup, opt-in, templates, purposes and stop behavior confirmed with qualified vendors |
| [National SSO](https://www.iam.gov.sa/) | Login surface observed; institutional access requirements not established | Nafath/SSO is optional future identity assurance; no fabricated open API integration |

MOH [Sehhaty](https://www.moh.gov.sa/en/eservices/sehhaty/pages/default.aspx), [unified health file](https://www.moh.gov.sa/en/ministry/unified-health-file/Pages/default.aspx) and [Health Holding](https://www.health.sa/en) demonstrate national digital-health activity, not permission for Zyara to obtain records. Saudi launch requires local operations, family patterns, Arabic safety content and real clinic workflows, beyond translation.

## Data flow and lawful purpose

Map collection → purpose → lawful basis → controller/processor → storage region → recipients → retention → deletion for every dataset. Separate provider public information, private verification evidence, operational booking, optional analytics, communications and clinical imports. Consent is granular and revocable where it is the applicable basis; do not pretend a blanket checkbox authorizes all health processing.

Booking shares the minimum demographics/contact/service information with the chosen practice. A patient explicitly sees the recipient and purpose before submission. Marketplace search does not authorize a provider to browse other appointments. Analytics and AI processing are separate purposes with minimization and vendor controls. Do not sell or expose individual health-query trails as “demand analytics.”

Shared phones and dependents require explicit contact preferences. Guardian authority and identity assurance are counsel-reviewed; Relationship/RelatedPerson records alone prove neither. Appointment delegation grants booking/change scope without automatic clinical record access. Sensitive adolescent/adult care rules, guardian age transitions, revocation, incapacity and cross-border guardianship require defined policies before enablement.

## Authorization and tenant isolation

Use OIDC identity, verified contact, secure sessions and MFA for provider/admin roles. Authorize subject + tenant + branch + role + patient relationship + purpose + resource sensitivity. Tenant derived from authenticated membership, not trusted request body. RLS covers operational tables; app policy remains necessary for domain actions and clinical scopes. Migration/service accounts cannot serve ordinary traffic.

Roles: patient, limited delegate, receptionist, scheduler, practitioner, branch manager, organization administrator, verifier, trust moderator, integration service, support and security auditor. Reception sees necessary appointment/intake-completion status, not every clinical attachment. Sales cannot change reviews or ranking. Support defaults to redacted data; privileged access is time-bounded, purpose logged, approved and periodically reviewed. Break-glass clinical access is deferred until a legitimate clinical role/workflow and review regime exists.

Every resource read/write/export gets authorization tests, including cross-tenant IDs, dependent revocation, stale memberships and indirect object references. These are local synthetic control tests, not third-party exploitation. Patient corrections and merges require review; search engines index only approved public projections.

## Storage, secrets and application controls

Encrypt transport/storage with managed keys and documented rotation/backup policy. Separate production, staging and evaluation; synthetic data only outside production unless a specifically approved process exists. Secrets live in a managed vault, referenced by adapter, with least privilege and tenant separation where practical. No credentials in event payloads, logs or model prompts.

Private documents upload to quarantine with type/size limits, malware scanning and metadata stripping policy. Signed URLs are short-lived and bound to authorized access; enumeration never exposes object lists. Safe rendering/extraction is isolated and does not execute embedded content. Clinical text extraction remains unverified until confirmed by a permitted person/source.

Rate limits protect login, search scraping, hold abuse, review spam, messaging and cost-heavy AI. Design accessible recovery paths; no blanket denial based on disability, language, insurance or predicted no-show. CSRF/session/cookie controls, input validation, secure headers, dependency scanning and secret scanning are release baseline. No test payloads or offensive workflows are part of this plan.

Audit includes access decision, purpose, actor, tenant, object reference, action, result and correlation; avoid copying clinical bodies. Restrict audit readers and use append-only/tamper-evident retention controls. Alert on unauthorized access patterns, privilege changes, export spikes and disabled controls.

## Retention and rights design

The following are starting minimization proposals, not asserted Saudi statutory retention periods:

| Dataset | Proposed default / decision gate |
|---|---|
| Raw audio / navigation prompts | Transient processing only; no routine persisted history |
| Opt-in AI/ASR evaluation | Separate consented store, default 30-day expiry, deletion verified |
| Operational application logs | Allowlisted identifiers/codes, default 30 days |
| Raw pseudonymous funnel events | Default 90 days, then aggregated/suppressed |
| Public graph assertions | Active record plus necessary correction/provenance history under rights review |
| Appointment/attendance/audit | Counsel/provider contract sets schedule before production; do not choose an arbitrary clinical retention period |
| Clinical imports/documents | Per purpose/source/contract/legal schedule and consent; no indefinite default |
| Backups | Vendor/restore design sets bounded retention; deletions reapplied on restoration |

Rights workflow verifies requester, discovers data/provenance, handles access/export/correction/restriction/deletion as applicable, accounts for third-party rights/legal holds and records completion. Revocation stops future optional processing promptly; deletion and lawful retention are separately evaluated. Health data export requires step-up and secure delivery.

## Safety and compliance gates

Before pilot real patient data: signed data-flow inventory/DPIA, controller/processor roles, legal entity/brand clearance, privacy notices in five locales, approved provider agreement, hosting/transfer processor inventory, retention schedule, incident plan, clinical intended-use determination and guardrails. Before clinical imports: separate consent scopes, partner rights, clinical retention/identity match and import provenance. Before each country: legal/licensing/terminology/communications/identity/routing review; localization alone is insufficient.

Incident procedure: detect/contain, preserve minimal evidence, protect access and appointment continuity, assess impact, involve accountable counsel/clinical owner, make required notices within applicable time limits and rehearse recovery. Exact legal notification clocks are to be confirmed by counsel rather than guessed here. Do not erase logs or silently cancel care to conceal an incident.

Risks and closure owners are tracked in the master plan. Product implementation may begin with synthetic data while legal/procurement work proceeds; real-patient launch remains gated.
