# Zyara AI, search and voice plan

Canonical 2026-09-13. Search/AI lead with clinical safety owner. Text and speech share one intent, safety, retrieval and scheduling path. Generative models may interpret and explain; typed services own facts and actions.

## Search and map

Maintain a curated multilingual service/specialty taxonomy with Arabic native reviewers and clinician-reviewed symptom-to-service navigation mappings. Store original names and labels, normalized Arabic forms, optional diacritics-stripped fields, transliteration aliases, colloquial terms and spelling variants. Never overwrite the source spelling. Arabic stemming is an evaluated field, not a universal replacement for exact proper-name matching.

Queries combine lexical retrieval, aliases, geospatial filters and structured constraints. Later semantic retrieval may improve recall for unfamiliar terms, but all returned providers resolve to current graph IDs. Benchmark OpenSearch, Meilisearch and PostgreSQL baseline against the same judged Arabic/English/French/German/Spanish corpus; OpenSearch is the planning candidate because it exposes Arabic analysis controls ([official Arabic analyzer](https://docs.opensearch.org/latest/analyzers/language-analyzers/arabic/), checked 2026-09-13). No relevance or latency benchmark was run in this planning mission.

Rank in stages: hard eligibility/filter checks; service/role relevance; explicit patient preferences; evidence/freshness; distance/travel where licensed; availability and continuity when patient permits; experience quality with uncertainty. Commercial subscription, sales quota, booking commission, patient wealth and opaque predicted no-show are prohibited ranking inputs. Separate “best match,” “soonest,” and “nearest” views. Each result gives two or three factual reasons and any material unknown.

Insurance is a branch/service/network assertion, not a guarantee of benefits or prior authorization. Do not infer Bupa/Tawuniya coverage from payer logo alone. Accessibility is structured (step-free entrance, lift, accessible toilet, parking, interpreter, sensory accommodations) with source and last check. Travel time needs a contracted routing service; straight-line distance must be labeled as such.

Map/list preserve the same filter state and ranking intent. Public listing coordinates need verified precision and correct entrance; home addresses are private. Ask location permission when useful; accept manually entered district/postcode. Store precise geolocation only as needed for the active task. [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) constrain storage/attribution (official technical terms checked 2026-09-13); do not build a proprietary graph by copying a map vendor's entire dataset. Map renderer license does not grant tile/geocoder/data rights.

## Safety and intent contracts

NavigationIntent contains language, raw-input ephemeral reference, requested action, service hypotheses with uncertainty, location/radius, time window with timezone, clinician preferences, insurance network if known, accessibility, continuity preference and material unanswered questions. It must not contain a generated diagnosis disguised as a fact. Distinguish patient stated facts, model inference and tool-verified facts.

Safety pipeline: normalize language without removing meaning → detect policy-defined urgent-risk cues and vulnerable context → ask minimal material clarification when appropriate → route emergency/urgent uncertainty to approved human-care guidance → structured service search → eligibility → exact review → explicit action. Clinical safety owner authors and versions escalation content, independently reviews false negatives and signs the launch case. Saudi emergency destinations/numbers are localized from official sources and reverified before release; fallback uses a clear emergency-services direction if location is unknown.

Do not turn a lack of detected red flags into “you are safe.” Do not prescribe, change treatment, decide medical clearance or claim a diagnostic probability. High-risk symptoms, medication/drug-name confusion, child/vulnerable scenarios or uncertain urgency can trigger abstention and a human clinical route. The app must remain usable through ordinary search/call options when generative service is unavailable.

[SFDA software classification FAQ](https://sfda.gov.sa/en/faq/when-does-consider-software-program-or-electronic-application-medical-device) and [digital-health guidance](https://www.sfda.gov.sa/sites/default/files/2025-08/MDS-G027_1.pdf) (official government, checked 2026-09-13) make intended use a material review issue. A “not a doctor” disclaimer alone does not establish exemption from medical-device requirements. Regulatory classification and clinical safety signoff gate patient-facing symptom routing.

## Typed tools and confirmation

Read tools: resolveServiceIntent, searchProviders, getProviderFacts, getAvailability, evaluateEligibility, getBookingOperation, getAppointment. Write tools: createHold, submitBookingRequest, confirmBooking, cancelAppointment, rescheduleAppointment, acceptWaitlistOffer. Every tool derives authorization from server identity, never from model-supplied tenant or role.

Tool output includes authoritative IDs, source, observed time, expiry/version, confidence/unknown fields and display-safe explanations. Model cannot construct provider names, prices, insurance acceptance, time availability or confirmation IDs. Render a structured result card from tool data; prose is supplementary. Validate entity IDs against the current tool result set and current authorization.

Before write, server creates a confirmation challenge binding exact patient/delegate, service, provider/team, branch/modality, date/time/zone, policy version and operation digest. User explicitly accepts this current challenge through UI or confirmed voice. Any material change invalidates it. A prompt saying “I already confirmed” cannot bypass the server challenge. Repeated spoken action or network retry shares the operation's idempotency key.

Provider bios, reviews, imported documents and tool error strings are untrusted data. They cannot change system policy or grant tools. Tool names/arguments are allowlisted and schema-validated; outputs are size bounded, quoted as data and filtered for unauthorized fields. Safety tests use synthetic adversarial content and verify refusal/containment; this plan does not call for offensive probing of third-party systems.

RAG initially includes approved care-navigation guidance and verified public provider facts with provenance, version and expiry. It excludes raw patient records and unreviewed web medical advice. Retrieved guidance is not stronger evidence because multiple agents repeat it. Models cannot browse arbitrary websites during an active booking and treat scraped availability as truth.

## Model routing, data and evaluation

Abstract model provider with residency/processing policy, structured-output capability, timeout, cost budget and deterministic tool boundary. Do not silently fail over health data to a provider/region without approved processing terms. Use stateless minimized calls, contractually reviewed retention/training controls and explicit logging allowlists. No prompts/transcripts in ordinary observability. Opt-in evaluation captures are separate, redacted and expiring.

Release corpus: proposed minimum 500 clinician-reviewed navigation scenarios spanning five languages, with at least 200 Arabic cases and Saudi dialect/code-switch representation; additional minimum 100 critical escalation/adversarial cases. Targets: zero invented structured facts, zero unauthorized tool calls, zero unconfirmed writes and all designated critical escalation cases handled safely. Report confidence intervals and subgroup sample sizes; zero observed failures is not proof of universal safety. Ambiguous service mapping should ask rather than force a result. Human review must measure over-escalation and usability too.

Search evaluation uses at least 300 judged intents including exact names, colloquialisms, transliteration, insurer branches and zero-results cases. Proposed target top-5 clinically appropriate service/provider coverage >=90% on approved nonurgent test set, no >10 percentage-point locale gap without remediation; not a clinical diagnostic accuracy metric. Keep held-out evaluation data and reviewer disagreement log.

## Voice

First-class voice means a designed, tested path through the same product contracts, not voice-first implementation. Capture push-to-talk with visible microphone state, cancel and keyboard alternative. Default audio lifetime is the active transcription request; erase temporary chunks on completion/timeout. No passive listening. Read back/correct critical names, service, numbers and appointment date/time before action.

Evaluate private whisper.cpp/faster-whisper and approved cloud candidates for Arabic dialects, code switching, provider/specialty/drug names and French/German/Spanish. Model weights and inference runtime have separate license and hosting checks. Desktop sources OpenWhispr/OpenSuperWhisper contribute interaction/adapter lessons, not a proven mobile healthcare ASR stack. Source pins are in qualification.

[Casablanca](https://aclanthology.org/2024.emnlp-main.1211/) (EMNLP 2024 paper, checked 2026-09-13) covers eight dialects including Emirati but not a Saudi cohort. It is supplemental research, not Saudi validation. Build consented actor-read synthetic healthcare scripts covering Najdi/Hijazi/Eastern examples, varied speakers, noise, accents and code switching. Do not use real PHI to create the corpus.

Measure word error rate plus critical entity error rate, date/time normalization, confidence calibration, correction success and end-to-end safe completion. Proposed first voice gate: >=95% critical entity accuracy on held-out scripted corpus, zero unconfirmed critical-entity writes, and all low-confidence entities corrected/confirmed. WER alone cannot authorize a booking. Device latency/memory and private-ASR cost determine deployment; private-first is a preference requiring evidence. Cloud fallback is explicit and lawful, not covert.

TTS uses exact structured confirmation text, pronounces dates unambiguously, supports pause/repeat and always provides readable text. Low transcription confidence produces visible alternatives; “tomorrow after six” is interpreted in the user's declared zone and reviewed with exact date.

## Internal sandbox boundary

Internal graph-maintenance/research automation may later run in OpenSandbox-style ephemeral workloads with no patient data by default, egress allowlists, short-lived scoped credentials, filesystem/CPU/memory/time quotas, audit and approval for destructive administrative changes. Sandbox orchestration has no native database credential or appointment authority. A planning feature does not authorize deploying multi-agent clinical decision makers. No sandbox runtime is required for the pilot booking path.

Fallback hierarchy: deterministic manual search → typed filters → call/request; model/ASR outage never removes patient access. Monitor safe abstentions, uncertainty, failed entity resolution, tool mismatches and privacy-safe task outcomes, not unrestricted transcripts.
