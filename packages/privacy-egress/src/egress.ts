// Zyara AI Operating Fabric AIF-02A: the privacy and egress gate.
//
// Authority: docs/canonical/ZYARA_AI_OPERATING_FABRIC_PLAN_2026-09-22.md §4.2 and §12
// (AIF-02); docs/research/ZYARA_AI_OPERATING_FABRIC_IMPLEMENTATION_HANDOFF_2026-09-22.md §6;
// docs/evidence/AIF/AIF-02A/WORK_PACKET.md, which states the rules in order.
//
// Every model, tool, browser or local invocation asks this gate before data leaves its trust
// zone. The gate classifies fields from a server-held schema (never from the caller), refuses
// credentials outright, enforces local-only classes with no silent cloud fallback, checks the
// provider manifest, purpose, consent and retention, minimizes the payload, and only then
// builds a receipt that holds paths, classes, transforms and digests: never values. It makes
// no network call and resolves no secret.

import {
  APPROVAL_DIRECT_IDENTIFIER_PATTERNS,
} from "@zyara/collaboration";
import { CAPABILITY_DATA_CLASSES, containsCredentialShape, type CapabilityDataClass } from "@zyara/capability-gateway";
import type { ConsentGrant, ConsentPurpose } from "@zyara/consent-boundaries";

export const TRUST_ZONES = ["ZYARA_CORE", "TENANT_DEVICE", "QUALIFIED_PROVIDER", "EXTERNAL"] as const;
export type TrustZone = (typeof TRUST_ZONES)[number];
const LOCAL_ZONES: readonly TrustZone[] = ["ZYARA_CORE", "TENANT_DEVICE"];

export type Minimization = "NONE" | "DROP" | "REDACT" | "PSEUDONYMIZE";

export const EGRESS_MAX_FIELDS = 256;
export const EGRESS_MAX_STRING_LENGTH = 8_192;
export const REDACTED_VALUE = "[REDACTED]";

export interface VersionedRef {
  id: string;
  version: string;
}

export interface ProviderManifest {
  providerId: string;
  version: string;
  trustZone: TrustZone;
  dataClassCeiling: readonly CapabilityDataClass[];
  approvedPurposes: readonly ConsentPurpose[];
  retentionDays: number;
  status: "ACTIVE" | "REVOKED";
}

export interface ClassRule {
  allowedProviders: readonly string[];
  localOnly: boolean;
  minimization: Minimization;
  consentPurposeRequired: ConsentPurpose | null;
  retentionMaxDays: number;
  humanReview: boolean;
}

export interface EgressPolicy {
  id: string;
  version: string;
  status: "ACTIVE" | "REVOKED";
  rules: Partial<Record<CapabilityDataClass, ClassRule>>;
}

export interface PayloadSchema {
  id: string;
  version: string;
  fields: Readonly<Record<string, CapabilityDataClass>>;
}

export type PayloadValue = string | number | boolean | null;

export interface PayloadField {
  path: string;
  value: PayloadValue;
}

export interface EgressRequest {
  tenantId: string;
  policy: VersionedRef;
  schema: VersionedRef;
  purpose: ConsentPurpose | null;
  providerId: string;
  payload: readonly PayloadField[];
  // The zone the data leaves (handoff §6 "source trust zone").
  sourceZone: TrustZone;
  // The data subject (patient) the payload is about, or null for non-subject data. Consent
  // grants count only when they belong to this subject.
  subjectId: string | null;
  // Supplied by the server for the data subject; never read from the payload.
  consentGrants: readonly ConsentGrant[];
  // Set when this request retries at another destination after one failed.
  fallbackFrom: string | null;
}

export type EgressReasonCode =
  | "EGRESS_ALLOWED"
  | "EGRESS_DEPENDENCY_UNAVAILABLE"
  | "EGRESS_POLICY_UNKNOWN"
  | "EGRESS_PURPOSE_REQUIRED"
  | "EGRESS_SCHEMA_UNKNOWN"
  | "EGRESS_FIELD_UNCLASSIFIED"
  | "EGRESS_PAYLOAD_INVALID"
  | "EGRESS_CLASSIFICATION_SUSPECT"
  | "EGRESS_CREDENTIAL_REFUSED"
  | "EGRESS_PROVIDER_UNKNOWN"
  | "EGRESS_CLASS_UNMAPPED"
  | "EGRESS_LOCAL_ONLY"
  | "EGRESS_NO_SILENT_CLOUD_FALLBACK"
  | "EGRESS_PROVIDER_NOT_APPROVED_FOR_CLASS"
  | "EGRESS_PURPOSE_NOT_APPROVED"
  | "EGRESS_CONSENT_REQUIRED"
  | "EGRESS_RETENTION_EXCEEDED";

export interface ReceiptField {
  path: string;
  dataClass: CapabilityDataClass;
  transform: Minimization;
  // HMAC (tenant key) of the minimized value actually sent; null when the field was dropped
  // or the request was denied. Keyed, so a low-entropy value cannot be recovered by guessing.
  sentDigest: string | null;
}

export interface EgressReceipt {
  decision: "ALLOW" | "DENY";
  reasons: readonly EgressReasonCode[];
  tenantId: string;
  policy: VersionedRef | null;
  schema: VersionedRef | null;
  providerId: string | null;
  manifestVersion: string | null;
  sourceZone: TrustZone | null;
  destinationZone: TrustZone | null;
  purpose: ConsentPurpose | null;
  fallback: boolean;
  humanReview: boolean;
  retentionDays: number | null;
  fields: readonly ReceiptField[];
  decidedAt: string | null;
  receiptDigest: string;
}

export interface EgressDecision {
  receipt: EgressReceipt;
  // The minimized payload to send; only on ALLOW. Never logged by this gate.
  payload: readonly PayloadField[] | null;
}

// Ports. Each may throw or return "UNAVAILABLE"; both deny with EGRESS_DEPENDENCY_UNAVAILABLE.
export interface EgressDependencies {
  clock: { now(): string };
  policies: { find(ref: VersionedRef): EgressPolicy | null | "UNAVAILABLE" };
  schemas: { find(ref: VersionedRef): PayloadSchema | null | "UNAVAILABLE" };
  providers: { find(providerId: string): ProviderManifest | null | "UNAVAILABLE" };
  // HMAC-SHA-256 key for the tenant's pseudonyms and receipt digests. Held by the caller;
  // never in a receipt. Keyed digests keep low-entropy values (ids, phones) unguessable.
  tenantKey(tenantId: string): CryptoKey | "UNAVAILABLE";
}

// ---------------------------------------------------------------------------

class Unavailable extends Error {}

function available<T>(value: T | "UNAVAILABLE"): T {
  if (value === "UNAVAILABLE") throw new Unavailable("dependency unavailable");
  return value;
}

const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PATH = /^[a-z][A-Za-z0-9_]{0,63}(\.[a-z][A-Za-z0-9_]{0,63}){0,7}$/;
const EMAIL = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
}

function isScalar(value: unknown): value is PayloadValue {
  return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}

function looksLikeDirectIdentifier(value: PayloadValue): boolean {
  if (typeof value === "number") return APPROVAL_DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(String(Math.trunc(Math.abs(value)))));
  if (typeof value !== "string") return false;
  return EMAIL.test(value) || APPROVAL_DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(value.replace(/[\s()+-]/g, "")));
}

interface Classified {
  path: string;
  value: PayloadValue;
  dataClass: CapabilityDataClass;
}

interface Evaluation {
  reasons: EgressReasonCode[];
  policy: EgressPolicy | null;
  schema: PayloadSchema | null;
  manifest: ProviderManifest | null;
  fields: Classified[];
}

const denied = (reason: EgressReasonCode, partial: Partial<Evaluation> = {}): Evaluation => ({
  reasons: [reason],
  policy: null,
  schema: null,
  manifest: null,
  fields: [],
  ...partial,
});

// Rules 1-10 of the work packet, in order. Returns the first failing reason, or ALLOWED.
function evaluate(request: EgressRequest, deps: EgressDependencies, nowIso: string): Evaluation {
  if (typeof request.tenantId !== "string" || !OPAQUE.test(request.tenantId) || safeZone(request.sourceZone) === null) return denied("EGRESS_PAYLOAD_INVALID");

  // Rule 1: policy.
  const policy = available(deps.policies.find(request.policy));
  if (policy === null || policy.status !== "ACTIVE" || policy.id !== request.policy.id || policy.version !== request.policy.version) {
    return denied("EGRESS_POLICY_UNKNOWN");
  }

  // Rule 2: purpose.
  if (request.purpose === null) return denied("EGRESS_PURPOSE_REQUIRED", { policy });

  // Rule 2a: server-held classification; the caller never chooses a class.
  const schema = available(deps.schemas.find(request.schema));
  if (schema === null || schema.id !== request.schema.id || schema.version !== request.schema.version) {
    return denied("EGRESS_SCHEMA_UNKNOWN", { policy });
  }
  if (!Array.isArray(request.payload) || request.payload.length > EGRESS_MAX_FIELDS) return denied("EGRESS_PAYLOAD_INVALID", { policy, schema });
  const seen = new Set<string>();
  const fields: Classified[] = [];
  for (const field of request.payload) {
    if (typeof field !== "object" || field === null || typeof field.path !== "string" || !PATH.test(field.path) || seen.has(field.path)) {
      return denied("EGRESS_PAYLOAD_INVALID", { policy, schema });
    }
    seen.add(field.path);
    if (!isScalar(field.value) || (typeof field.value === "string" && field.value.length > EGRESS_MAX_STRING_LENGTH)) {
      return denied("EGRESS_PAYLOAD_INVALID", { policy, schema });
    }
    const dataClass = Object.hasOwn(schema.fields, field.path) ? schema.fields[field.path] : undefined;
    if (dataClass === undefined || !(CAPABILITY_DATA_CLASSES as readonly string[]).includes(dataClass)) {
      return denied("EGRESS_FIELD_UNCLASSIFIED", { policy, schema });
    }
    fields.push({ path: field.path, value: field.value, dataClass });
  }

  // Rule 3: a credential is never exportable, whatever the policy says.
  for (const field of fields) {
    if (field.dataClass === "CREDENTIAL" || (typeof field.value === "string" && containsCredentialShape(field.value))) {
      return denied("EGRESS_CREDENTIAL_REFUSED", { policy, schema, fields });
    }
  }

  // Rule 2b: defense in depth against a mis-declared schema.
  for (const field of fields) {
    if ((field.dataClass === "PUBLIC" || field.dataClass === "INTERNAL") && looksLikeDirectIdentifier(field.value)) {
      return denied("EGRESS_CLASSIFICATION_SUSPECT", { policy, schema, fields });
    }
  }

  // Rule 4: provider manifest.
  const manifest = available(deps.providers.find(request.providerId));
  if (manifest === null || manifest.status !== "ACTIVE" || manifest.providerId !== request.providerId) {
    return denied("EGRESS_PROVIDER_UNKNOWN", { policy, schema, fields });
  }
  const context = { policy, schema, fields, manifest };

  // Rule 5: every present class has a rule.
  const presentClasses = [...new Set(fields.map((field) => field.dataClass))];
  const rules = new Map<CapabilityDataClass, ClassRule>();
  for (const dataClass of presentClasses) {
    const rule = Object.hasOwn(policy.rules, dataClass) ? policy.rules[dataClass] : undefined;
    if (!rule) return denied("EGRESS_CLASS_UNMAPPED", context);
    rules.set(dataClass, rule);
  }

  // Rule 6: local-only classes never leave the local zones, and a fallback is never silent.
  const local = LOCAL_ZONES.includes(manifest.trustZone);
  if (!local && [...rules.values()].some((rule) => rule.localOnly)) {
    return denied(request.fallbackFrom !== null ? "EGRESS_NO_SILENT_CLOUD_FALLBACK" : "EGRESS_LOCAL_ONLY", context);
  }

  // Rule 7: the provider is admitted for every present class.
  for (const [dataClass, rule] of rules) {
    if (!manifest.dataClassCeiling.includes(dataClass) || !rule.allowedProviders.includes(manifest.providerId)) {
      return denied("EGRESS_PROVIDER_NOT_APPROVED_FOR_CLASS", context);
    }
  }

  // Rule 8: purpose approved for the provider.
  if (!manifest.approvedPurposes.includes(request.purpose)) return denied("EGRESS_PURPOSE_NOT_APPROVED", context);

  // Rule 9: consent, checked at server time against server-supplied grants.
  for (const rule of rules.values()) {
    if (rule.consentPurposeRequired !== null) {
      // Only the subject's own grants count: another patient's consent never clears this data.
      const subjectGrants =
        typeof request.subjectId === "string" && OPAQUE.test(request.subjectId)
          ? (request.consentGrants ?? []).filter((grant) => grant.patientId === request.subjectId)
          : [];
      if (rule.consentPurposeRequired !== request.purpose || !liveConsent(subjectGrants, request.purpose, Date.parse(nowIso))) {
        return denied("EGRESS_CONSENT_REQUIRED", context);
      }
    }
  }

  // Rule 10: retention.
  const retentionOk = (days: unknown) => typeof days === "number" && Number.isInteger(days) && days >= 0;
  if (!retentionOk(manifest.retentionDays) || [...rules.values()].some((rule) => !retentionOk(rule.retentionMaxDays) || manifest.retentionDays > rule.retentionMaxDays)) {
    return denied("EGRESS_RETENTION_EXCEEDED", context);
  }

  return { reasons: ["EGRESS_ALLOWED"], policy, schema, manifest, fields };
}

async function minimize(
  field: Classified,
  rule: ClassRule,
  key: CryptoKey | null,
): Promise<{ sent: PayloadField | null; transform: Minimization }> {
  switch (rule.minimization) {
    case "DROP":
      return { sent: null, transform: "DROP" };
    case "REDACT":
      return { sent: { path: field.path, value: REDACTED_VALUE }, transform: "REDACT" };
    case "PSEUDONYMIZE": {
      // The key is always resolved when a PSEUDONYMIZE rule is present (see decideEgress).
      if (field.value === null || key === null) return { sent: { path: field.path, value: null }, transform: "PSEUDONYMIZE" };
      const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`pseudonym:${field.path}:${JSON.stringify(field.value)}`));
      return { sent: { path: field.path, value: `pseu_${hex(mac).slice(0, 32)}` }, transform: "PSEUDONYMIZE" };
    }
    case "NONE":
      return { sent: { path: field.path, value: field.value }, transform: "NONE" };
    default:
      // An unknown transform never sends the raw value.
      throw new Unavailable("unknown minimization");
  }
}


// Reads the caller's request exactly once into plain data, so a getter or Proxy cannot answer
// one value to a check and another to a later check; optional fields are normalised to null.
function snapshotRequest(input: EgressRequest): EgressRequest {
  let text: string | undefined;
  try {
    text = JSON.stringify(input);
  } catch {
    text = undefined;
  }
  const plain = (text === undefined ? {} : JSON.parse(text)) as Partial<EgressRequest>;
  return {
    tenantId: plain.tenantId as string,
    policy: plain.policy as VersionedRef,
    schema: plain.schema as VersionedRef,
    purpose: plain.purpose ?? null,
    providerId: plain.providerId as string,
    sourceZone: plain.sourceZone as TrustZone,
    subjectId: plain.subjectId ?? null,
    payload: Array.isArray(plain.payload) ? plain.payload : [],
    consentGrants: Array.isArray(plain.consentGrants) ? plain.consentGrants : [],
    fallbackFrom: plain.fallbackFrom ?? null,
  };
}

// M051 consent, evaluated on parsed instants: a grant whose timestamps are not ISO-8601 UTC
// instants is refused, so mixed formats can never make a revoked consent look live.
function liveConsent(grants: readonly ConsentGrant[], purpose: ConsentPurpose, now: number): boolean {
  return grants.some((grant) => {
    if (grant.purpose !== purpose || grant.granted !== true || typeof grant.atUtc !== "string" || !ISO_INSTANT.test(grant.atUtc)) return false;
    if (grant.revokedAtUtc !== null && (typeof grant.revokedAtUtc !== "string" || !ISO_INSTANT.test(grant.revokedAtUtc))) return false;
    return Date.parse(grant.atUtc) <= now && (grant.revokedAtUtc === null || Date.parse(grant.revokedAtUtc) > now);
  });
}

async function keyedDigest(key: CryptoKey, path: string, value: PayloadValue): Promise<string> {
  return `hmac_${hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`digest:${path}:${JSON.stringify(value)}`)))}`;
}

export async function decideEgress(requestInput: EgressRequest, deps: EgressDependencies): Promise<EgressDecision> {
  const request = snapshotRequest(requestInput);
  let nowIso: string | null = null;
  let evaluation: Evaluation;
  try {
    const candidate = deps.clock.now();
    if (typeof candidate !== "string" || !ISO_INSTANT.test(candidate) || Number.isNaN(Date.parse(candidate))) throw new Unavailable("time");
    nowIso = candidate;
    evaluation = evaluate(request, deps, nowIso);
  } catch {
    evaluation = denied("EGRESS_DEPENDENCY_UNAVAILABLE");
  }

  const sent: PayloadField[] = [];
  const receiptFields: ReceiptField[] = [];
  let humanReview = false;
  if (evaluation.reasons[0] === "EGRESS_ALLOWED" && evaluation.policy !== null) {
    const rules = evaluation.policy.rules;
    try {
      const key = available(deps.tenantKey(request.tenantId));
      // Minimization happens before the receipt: the receipt digests what is actually sent.
      for (const field of evaluation.fields) {
        const rule = rules[field.dataClass] as ClassRule;
        humanReview ||= rule.humanReview;
        const { sent: out, transform } = await minimize(field, rule, key);
        if (out !== null) sent.push(Object.freeze(out));
        receiptFields.push({
          path: field.path,
          dataClass: field.dataClass,
          transform,
          sentDigest: out === null ? null : await keyedDigest(key, out.path, out.value),
        });
      }
    } catch {
      // A missing key or a failing transform denies; nothing partial is ever returned.
      evaluation = { ...evaluation, reasons: ["EGRESS_DEPENDENCY_UNAVAILABLE"] };
      sent.length = 0;
      receiptFields.length = 0;
      humanReview = false;
    }
  }
  const allow = evaluation.reasons[0] === "EGRESS_ALLOWED";
  if (!allow) {
    for (const field of evaluation.fields) receiptFields.push({ path: field.path, dataClass: field.dataClass, transform: "NONE", sentDigest: null });
  }

  const receipt = await buildReceipt(request, nowIso, evaluation, allow, receiptFields, humanReview);
  return Object.freeze({ receipt, payload: allow ? Object.freeze(sent) : null });
}

function safeRef(value: unknown): VersionedRef | null {
  if (typeof value !== "object" || value === null) return null;
  const { id, version } = value as Record<string, unknown>;
  return typeof id === "string" && OPAQUE.test(id) && typeof version === "string" && OPAQUE.test(version) ? { id, version } : null;
}

function safeZone(value: unknown): TrustZone | null {
  return (TRUST_ZONES as readonly unknown[]).includes(value) ? (value as TrustZone) : null;
}

// The receipt always says what was asked (destination, purpose, refs, zones), echoing each
// request value only in a safe shape, plus what the gate found (manifest version, retention).
async function buildReceipt(
  request: EgressRequest,
  nowIso: string | null,
  evaluation: Evaluation,
  allow: boolean,
  fields: ReceiptField[],
  humanReview: boolean,
): Promise<EgressReceipt> {
  const body: Omit<EgressReceipt, "receiptDigest"> = {
    decision: allow ? "ALLOW" : "DENY",
    reasons: evaluation.reasons,
    tenantId: typeof request.tenantId === "string" && OPAQUE.test(request.tenantId) ? request.tenantId : "invalid",
    policy: safeRef(request.policy),
    schema: safeRef(request.schema),
    providerId: typeof request.providerId === "string" && OPAQUE.test(request.providerId) ? request.providerId : null,
    manifestVersion: evaluation.manifest?.version ?? null,
    sourceZone: safeZone(request.sourceZone),
    destinationZone: evaluation.manifest?.trustZone ?? null,
    purpose: (["care", "recall", "analytics"] as readonly unknown[]).includes(request.purpose) ? request.purpose : null,
    fallback: request.fallbackFrom !== null && request.fallbackFrom !== undefined,
    humanReview,
    retentionDays: allow ? (evaluation.manifest?.retentionDays ?? null) : null,
    fields,
    decidedAt: nowIso,
  };
  return Object.freeze({
    ...body,
    reasons: Object.freeze([...body.reasons]),
    fields: Object.freeze(body.fields.map((field) => Object.freeze(field))),
    receiptDigest: `egr_${await sha256Hex(canonicalJson(body))}`,
  });
}
