# GEO-10 Work Packet — AI / Voice Geo Capabilities

Base: `main` after the GEO-09 closure.
Branch: `feat/zyara-network-geo10-ai-geo`.
Authority: geospatial plan §23 (AI and voice integration), §20 (shareable scene state), §16/§16A (location privacy and sensitive intent) and §13A/GEO-01C (coordinate corrections); geospatial handoff §12 (GEO-10); AIF-01A/B capability contract and resolver.
Exit marker: `GEO_10_AI_GEO_QUALIFIED = TRUE`.

Invariant: **AI may interpret, retrieve, navigate, explain, draft and propose. Structured Zyara systems and authorized humans own facts and actions.**

## Placement

`@zyara/geospatial` gains `ai-tools.ts` and depends on `@zyara/capability-gateway` (a workspace dependency, added to `pnpm-lock.yaml` as a `link:`). Tests live in `tests/geo01a`, which also depends on the gateway, so the existing `geo01a-ci` runs them. There is no migration: capabilities are typed AIF-01 definitions, and grants and resolution use the merged AIF-01B registry and resolver.

## Typed geo capabilities (`GEO_CAPABILITY_DEFINITIONS`)

All five are validated by `validateCapabilityDefinition` and admitted through `CapabilityContractRegistry`.

| id | read/write | authority | data | scope | purpose |
| --- | --- | --- | --- | --- | --- |
| `geo.directory.search_nearby` | read | A0_OBSERVE | PUBLIC | TENANT_WIDE | nearby public directory results (result ids issued) |
| `geo.map.set_view` | read | A0_OBSERVE | PUBLIC | TENANT_WIDE | change the client map view only |
| `geo.scene.share` | write | A2_PREPARE | PUBLIC | TENANT_WIDE | prepare a public share state (private fields stripped) |
| `geo.location.propose_correction` | write | A2_PREPARE | INTERNAL | BRANCH | prepare a coordinate-correction proposal for review (the AIF-01A contract registers no write below A2; the proposal never changes a fact) |
| `geo.location.correct` | write | A5_HUMAN_ONLY | INTERNAL | BRANCH | the admin command (GEO-01C correction); human role only |

There is no other geo write capability. An agent or workflow cannot be granted `geo.location.correct` (`validateGrant` returns `CAPABILITY_HUMAN_ONLY`).

## Rules

1. **Unauthorized is denied.** Every invocation goes through the AIF-01B resolver. A capability without a grant is `DENY`, and a grant for one capability never authorizes another.
2. **Model coordinates are untrusted.**
   - `parseModelViewport` accepts a model-proposed centre and zoom only as an untrusted view hint: validated (`validateGeoPoint`), zoom clamped to 3–18, and marked `trust: "UNTRUSTED_VIEW_HINT"`.
   - A search origin must be either a current result-entity reference or a client device-location reference (an opaque token issued by the client after consent), never model-supplied coordinates.
   - Write-capability arguments never accept coordinates (`GEO_AI_MODEL_COORDINATE_UNTRUSTED`).
3. **Stale result ids are rejected.**
   - `GeoResultLedger.issue` binds a result set to tenant, session, the entity ids returned and an expiry (at most 15 minutes).
   - `resolveEntity` accepts an entity only from the session's **current** result set. Unknown, expired, superseded, other-session, other-tenant and never-returned ids are all refused (`GEO_AI_RESULT_STALE`).
4. **Public share state strips private fields.**
   - `buildPublicShareState` emits only:
     - a viewport rounded to 0.01° with zoom ≤ 14;
     - public layer ids from an allowlist;
     - branch ids that are on the public directory.
   - It drops the patient origin, search text, specialty and care intent, patient or account refs, session, tenant-internal branches and unknown fields. Sensitive intent never reaches a share URL (§16A).
5. **Voice changes the view only.** Voice-originated invocations may use only read capabilities that change view or retrieve public results (`geo.map.set_view`, `geo.directory.search_nearby`). Any other capability is refused before resolution (`GEO_AI_VOICE_VIEW_ONLY`). Voice never changes provider truth.
6. **Geocoder output cannot update a branch coordinate without the admin command.**
   - `proposeCorrectionFromGeocoder` turns a geocoder result into a draft proposal for review. It is never a location assertion, it carries `requiresCapability: "geo.location.correct"`, and its source kind is `EXTERNAL_DATASET`.
   - `assertCoordinateWriteAuthorized` allows a coordinate write only with `geo.location.correct` by a human principal.
   - In GEO-01C, an `EXTERNAL_DATASET` source cannot supersede a verified or attested head, and every material move needs a correction record by a provider or Zyara admin.

## Required tests (handoff)

- unauthorized capability denied;
- model coordinates untrusted;
- stale result ids rejected;
- public share state strips private fields;
- voice changes view only, not provider truth;
- geocoder output cannot update a branch coordinate without the admin command.
