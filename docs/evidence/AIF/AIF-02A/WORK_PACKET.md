# AIF-02A Work Packet — Privacy and Egress Policy

Base: `main` @ `f18aabc9f456676bc34d97a294ad447637bd60d9` (AIF-01B merged).
Branch: `feat/zyara-network-aif02a-privacy-egress`.
Authority: AIF plan §4.2 and §12 (AIF-02); AIF handoff §6 (AIF-02A); AIF-01A `egressPolicy` reference.
Exit marker: `PRIVACY_EGRESS_GATE_QUALIFIED = TRUE`.

## Scope

A pure package, `@zyara/privacy-egress`, that decides whether a classified payload may leave its trust zone toward a destination, minimizes it first, and returns a value-free egress receipt.

Non-goals:

- no network call, model, browser or secret resolution (AIF-02B);
- no durable storage (receipts are persisted by the AIF-04 runtime);
- no de-identification algorithm beyond deterministic field transforms.

## Reused vocabulary

- Data classes: `CAPABILITY_DATA_CLASSES` from `@zyara/capability-gateway`. There is no second list.
- Policy reference: the AIF-01A `egressPolicy` id (`egress_<id>`), now versioned here as `{ id, version }`.
- Consent: `isConsented()` and `ConsentGrant` from `@zyara/consent-boundaries` (M051), with purposes `care`, `recall` and `analytics`.

## Model (handoff §6 "must model")

- **Trust zones:** `ZYARA_CORE`, `TENANT_DEVICE` (local, on the clinic's machine), `QUALIFIED_PROVIDER` (a remote provider admitted by manifest), `EXTERNAL`. A destination is *local* only when its zone is `ZYARA_CORE` or `TENANT_DEVICE`.
- **`ProviderManifest`** (versioned): the provider id, trust zone and processing location (`KSA`, `GCC` or `OTHER`), plus:
  - `dataClassCeiling`: the classes it may receive;
  - `approvedPurposes`;
  - `retentionDays`;
  - `status`: `ACTIVE` or `REVOKED`.
- **`EgressPolicy`** (versioned, id `egress_<id>`): one rule per data class with:
  - `allowedProviders`;
  - `localOnly`;
  - `minimization`: `NONE`, `DROP`, `REDACT` or `PSEUDONYMIZE`;
  - `consentPurposeRequired`;
  - `retentionMaxDays`;
  - `humanReview`.

  A class without a rule is denied.
- **`PayloadSchema`** (versioned, server-held and admitted like a capability definition): a closed map from field path to data class. **The caller never chooses a field's class.** It names the schema, and the gate looks the class up. This is how a capability's input schema (AIF-01A `inputSchema`) becomes egress classification.
- **`EgressRequest`**:
  - the policy ref, tenant, purpose and destination provider id;
  - the payload schema ref `{ id, version }`;
  - the payload as a flat list of `{ path, value }`. Values are scalars only (string, finite number, boolean, null), so a sensitive value cannot hide in a nested object. There are at most 256 fields, and each string value is at most 8 192 characters;
  - the consent grants supplied by the server for the subject, or none;
  - `fallbackFrom`: set when this request is a fallback after another destination failed.
- **`EgressDecision`**: `ALLOW` or `DENY`, reason codes, the minimized field list (`ALLOW` only), the transforms applied, the effective retention, `humanReview` and the policy version.
- **`EgressReceipt`**:
  - the decision and reasons;
  - the policy id and version;
  - the provider id and manifest version;
  - tenant, purpose and server time;
  - the paths and classes of every field;
  - per sent field, the applied transform and a SHA-256 digest of the **minimized** value;
  - `receiptDigest`.

  It never holds a source value or a minimized value, only digests and paths.

## Rules (evaluated in order; the first failing rule denies)

1. Unknown or revoked policy version, or a policy/version mismatch → `DENY EGRESS_POLICY_UNKNOWN`.
2. A missing purpose (`null`) → `DENY EGRESS_PURPOSE_REQUIRED`.
2a. Unknown payload schema version → `DENY EGRESS_SCHEMA_UNKNOWN`. Any payload path that is not in the schema → `DENY EGRESS_FIELD_UNCLASSIFIED`; unlisted fields are never passed through. A duplicate path, a non-scalar value, more than 256 fields, or an oversized string → `DENY EGRESS_PAYLOAD_INVALID`.
3a. (Evaluated right after rule 3.) A value in a field classed `PUBLIC` or `INTERNAL` that looks like a direct identifier (the N5/C3 digit-run rule, or an e-mail address) → `DENY EGRESS_CLASSIFICATION_SUSPECT`. This is defense in depth against a mis-declared schema.
3. Any field classed `CREDENTIAL`, or any value with a credential shape (the AIF-01A scan), → `DENY EGRESS_CREDENTIAL_REFUSED`. A credential is never exportable as payload, whatever the policy says.
4. Unknown or revoked provider manifest → `DENY EGRESS_PROVIDER_UNKNOWN`.
5. Any field whose class has no policy rule → `DENY EGRESS_CLASS_UNMAPPED`.
6. Any field whose class rule is `localOnly` while the destination is not local → `DENY EGRESS_LOCAL_ONLY`. If the request is a fallback (`fallbackFrom` set), the reason is `EGRESS_NO_SILENT_CLOUD_FALLBACK`, so a fallback is always visible and never silent. The gate never substitutes a destination.
7. Any field class above the provider's `dataClassCeiling` → `DENY EGRESS_PROVIDER_NOT_APPROVED_FOR_CLASS` (for example, PHI to a provider not admitted for PHI). A provider not in the class rule's `allowedProviders` gets the same result.
8. A purpose not in the provider manifest's `approvedPurposes` → `DENY EGRESS_PURPOSE_NOT_APPROVED`.
9. A class rule requires consent for the purpose and the grants do not show live consent at server time (missing or revoked) → `DENY EGRESS_CONSENT_REQUIRED`.
10. Provider `retentionDays` above any present class rule's `retentionMaxDays` → `DENY EGRESS_RETENTION_EXCEEDED`.
11. Otherwise `ALLOW`. Every field is minimized by its class rule before the receipt is built: `DROP` removes the field, `REDACT` replaces the value with `[REDACTED]`, and `PSEUDONYMIZE` replaces it with `pseu_` plus an HMAC-SHA-256 of the value under a tenant-scoped key supplied by the caller. `humanReview` is true when any present class requires it.

Server time comes from a clock port. Consent grants come from the server, never from the payload.

## Required tests (handoff §6 plus hardening)

- PHI to an unapproved provider is denied;
- no silent cloud fallback;
- a missing purpose is denied;
- revoked consent is denied;
- minimization happens before the egress receipt (the receipt digests equal the digests of the minimized values, and a dropped field has no digest);
- logs and receipts never contain source or minimized values;
- a local-only class refuses a remote provider;
- a credential field or credential-shaped value is refused, even when the policy maps the class;
- an unmapped class is denied;
- a revoked provider or policy is denied;
- retention above the class maximum is denied;
- a purpose not approved for the provider is denied;
- the same request gives the same receipt digest;
- a pseudonym is stable for one tenant key and differs across tenant keys, and the key never appears in a receipt;
- a caller cannot classify a field itself: unlisted paths are denied, and classes come only from the schema;
- a nested object or array value is denied, as are too many fields and oversized strings;
- an identifier-shaped value in a `PUBLIC` or `INTERNAL` field is denied.
