# AI, Search, Ranking, Reviews, and Trust

## Core concept

AI is the conversational interface to a deterministic healthcare discovery system.

The user may speak in natural language, but provider facts, verification, insurance participation, distance and appointment availability must come from trusted system tools/data—not model memory.

## AI request pipeline

1. Detect language and locale.
2. Normalize/transcribe voice input when applicable.
3. Extract intent and constraints.
4. Run urgent/red-flag safety checks.
5. Ask only necessary clarifying questions.
6. Map intent to care-navigation taxonomy.
7. Query provider graph/search with hard eligibility filters.
8. Rank eligible results.
9. Generate an explanation grounded in result facts.
10. Offer booking/action tools.
11. Log minimized evaluation/safety metadata.

## Safety classification

At minimum classify:

- emergency/red-flag intent;
- urgent care;
- routine care navigation;
- administrative intent;
- medication question;
- mental-health crisis/safety risk;
- pediatric/pregnancy-sensitive context;
- insufficient/ambiguous input.

A safety response can override ranking. The system must not bury urgent-care guidance under commercial provider results.

## AI output rules

AI can say:

- “Based on what you described, this type of service is a reasonable starting point.”
- “These providers match your requested insurance, language, location and availability.”

AI should avoid unsupported certainty such as:

- “You have condition X.”
- “This doctor will cure you.”
- “This medication is safe for you” without an approved clinical workflow and evidence.

## Tool-first facts

The model must call deterministic tools for:

- provider identity;
- facility details;
- regulatory verification state;
- insurance data;
- location/distance;
- appointment availability;
- booking creation/cancellation;
- patient timeline retrieval;
- consent state.

## Search architecture

Search is hybrid but should be benchmark-driven.

### Lexical/faceted layer

Use a fast index for:

- names;
- specialties;
- services;
- synonyms;
- insurance;
- languages;
- location labels;
- filters/facets;
- autocomplete.

### Semantic layer

Use embeddings only where they improve measured healthcare-intent retrieval, particularly for lay-language symptom/service phrasing and multilingual matching.

Semantic retrieval must not bypass hard filters such as provider verification/visibility, country, tenant rules or required service constraints.

## Multilingual terminology

Maintain curated, versioned vocabularies for:

- specialty names;
- service names;
- common lay terms;
- Arabic variants;
- transliteration;
- French/German/Spanish synonyms;
- common misspellings.

Do not depend on real-time machine translation for every query.

## Ranking design

Use hard eligibility first, then scoring.

### Hard gates

Examples:

- provider/facility is active/visible;
- relevant service/specialty exists;
- required modality exists;
- country/regulatory constraints satisfied;
- insurance match when user marks it required;
- appointment is actually bookable when filtering by availability.

### Candidate score features

Potential features:

- clinical/service relevance;
- subspecialty match;
- proximity/travel time;
- availability/lead time;
- insurance match;
- language match;
- modality match;
- verified encounter rating;
- review confidence/volume;
- profile completeness/freshness;
- continuity of care;
- accessibility preferences;
- patient explicit preferences.

### Ranking explainability

Persist the top ranking reasons so the UI can say:

> Accepts your insurance · Arabic speaking · 8 minutes away · next appointment today · 4.9 from verified visits.

Do not expose internal weights in a way that enables manipulation, but do expose understandable reasons.

## Commercial neutrality

Provider subscription level must not silently raise organic medical relevance rank.

If sponsored placement is ever added:

- it must pass the same eligibility/safety gates;
- it must be clearly labeled;
- it must not replace emergency/safety messages;
- it must be separate from organic rank calculations.

## Review trust model

### Preferred eligibility

A review is “Verified Visit” when Zyara has evidence that:

- an appointment/encounter existed;
- the provider/practice marked it attended or an integration produced completion evidence;
- the review maps to that encounter.

### Alternative evidence

If the appointment was not created through Zyara, a later phase may support other verification evidence, but the method must be disclosed and fraud-reviewed.

### Moderation

Moderate for:

- personal information;
- abuse/harassment;
- spam;
- impersonation;
- conflicts of interest;
- promotional content;
- fabricated encounter claims;
- prohibited clinical accusations presented as proven fact.

Negative sentiment is not a moderation violation.

### Provider response

Providers may reply. They may dispute policy violations. They may not suppress a compliant review merely because it is negative.

## Rating integrity

Display:

- aggregate score;
- number of verified visits/reviews;
- recency;
- dimensions where useful;
- confidence/low-volume handling.

Avoid misleading precision when a provider has very few reviews.

## AI evaluation program

Before broad launch, create multilingual evaluation sets for:

- specialty routing;
- symptom-to-care navigation;
- emergency escalation;
- Arabic dialect/medical terminology;
- insurance constraint retention;
- ranking explanation faithfulness;
- hallucination resistance;
- refusal/abstention;
- voice transcription robustness;
- adversarial prompts.

Track model/prompt/version changes. A model upgrade is a product change and needs evaluation, not a silent config edit.
