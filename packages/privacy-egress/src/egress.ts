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
import { isConsented, type ConsentGrant, type ConsentPurpose } from "@zyara/consent-boundaries";

export const TRUST_ZONES = ["ZYARA_CORE", "TENANT_DEVICE", "QUALIFIED_PROVIDER", "EXTERNAL"] as const;
export type TrustZone = (typeof TRUST_ZONES)[number];
const LOCAL_ZONES: readonly TrustZone[] = ["ZYARA_CORE", "TENANT_DEVICE"];

export const PROCESSING_LOCATIONS = ["KSA", "GCC", "OTHER"] as const;
export type ProcessingLocation = (typeof PROCESSING_LOCATIONS)[number];

export const MINIMIZATIONS = ["NONE", "DROP", "REDACT", "PSEUDONYMIZE"] as const;
export type Minimization = (typeof MINIMIZATIONS)[number];

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
  location: ProcessingLocation;
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
  // SHA-256 of the minimized value actually sent; null when the field was dropped or when
  // the request was denied.
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
  // HMAC-SHA-256 key for the tenant's pseudonyms. Held by the caller; never in a receipt.
  pseudonymKey(tenantId: string): CryptoKey | "UNAVAILABLE";
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
  if (typeof request.tenantId !== "string" || !OPAQUE.test(request.tenantId)) return denied("EGRESS_PAYLOAD_INVALID");

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
      if (rule.consentPurposeRequired !== request.purpose || !isConsented(request.consentGrants ?? [], request.purpose, nowIso)) {
        return denied("EGRESS_CONSENT_REQUIRED", context);
      }
    }
  }

  // Rule 10: retention.
  if ([...rules.values()].some((rule) => manifest.retentionDays > rule.retentionMaxDays)) {
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
      if (key === null || field.value === null) return { sent: { path: field.path, value: null }, transform: "PSEUDONYMIZE" };
      const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(JSON.stringify(field.value)));
      return { sent: { path: field.path, value: `pseu_${hex(mac).slice(0, 32)}` }, transform: "PSEUDONYMIZE" };
    }
    default:
      return { sent: { path: field.path, value: field.value }, transform: "NONE" };
  }
}

export async function decideEgress(request: EgressRequest, deps: EgressDependencies): Promise<EgressDecision> {
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

  const allow = evaluation.reasons[0] === "EGRESS_ALLOWED";
  const sent: PayloadField[] = [];
  const receiptFields: ReceiptField[] = [];
  let humanReview = false;
  if (allow && evaluation.policy !== null) {
    const rules = evaluation.policy.rules;
    let key: CryptoKey | null = null;
    try {
      const needsKey = evaluation.fields.some((field) => rules[field.dataClass]?.minimization === "PSEUDONYMIZE");
      key = needsKey ? available(deps.pseudonymKey(request.tenantId)) : null;
    } catch {
      return decideDenied(request, nowIso, "EGRESS_DEPENDENCY_UNAVAILABLE", evaluation);
    }
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
        sentDigest: out === null ? null : `sha256_${await sha256Hex(JSON.stringify(out.value))}`,
      });
    }
  } else {
    for (const field of evaluation.fields) receiptFields.push({ path: field.path, dataClass: field.dataClass, transform: "NONE", sentDigest: null });
  }

  const receipt = await buildReceipt(request, nowIso, evaluation, allow, receiptFields, humanReview);
  return Object.freeze({ receipt, payload: allow ? Object.freeze(sent) : null });
}

async function decideDenied(request: EgressRequest, nowIso: string | null, reason: EgressReasonCode, evaluation: Evaluation): Promise<EgressDecision> {
  const fields = evaluation.fields.map((field) => ({ path: field.path, dataClass: field.dataClass, transform: "NONE" as const, sentDigest: null }));
  const receipt = await buildReceipt(request, nowIso, { ...evaluation, reasons: [reason] }, false, fields, false);
  return Object.freeze({ receipt, payload: null });
}

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
    policy: evaluation.policy === null ? null : { id: evaluation.policy.id, version: evaluation.policy.version },
    schema: evaluation.schema === null ? null : { id: evaluation.schema.id, version: evaluation.schema.version },
    providerId: evaluation.manifest?.providerId ?? null,
    manifestVersion: evaluation.manifest?.version ?? null,
    purpose: evaluation.policy === null ? null : request.purpose,
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
