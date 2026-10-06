// Zyara AI Operating Fabric AIF-01A: the capability contract.
//
// Authority: docs/canonical/ZYARA_AI_OPERATING_FABRIC_PLAN_2026-09-22.md §4.1 and §12
// (AIF-01) and docs/research/ZYARA_AI_OPERATING_FABRIC_IMPLEMENTATION_HANDOFF_2026-09-22.md §4.
//
// A capability is the only thing an agent, workflow, browser run or local bridge may ask
// for. It is a named, versioned, digested contract that says what the call reads or writes,
// at which authority class, over which data classes, under which consent purpose, through
// which opaque credential reference and egress policy, and how its outcome is proven.
//
// This module is pure: it calls no provider, model, browser, secret store or database. The
// durable registry, grant storage and the deny-by-default resolver are AIF-01B. It reuses
// the N5/C1 reserved agent namespaces, the N5/C3 risk classes and parameter-digest format,
// and the M051 consent purposes rather than inventing parallel vocabularies.

import {
  APPROVAL_PARAMETERS_DIGEST_PATTERN,
  APPROVAL_RISK_CLASSES,
  isReservedCapability,
  type ApprovalRiskClass,
} from "@zyara/collaboration";
import type { ConsentPurpose } from "@zyara/consent-boundaries";

// ---------------------------------------------------------------------------
// Closed vocabularies
// ---------------------------------------------------------------------------

// Automation authority classes (AI-era automation principles). Ordered low to high.
export const CAPABILITY_AUTHORITY_CLASSES = [
  "A0_OBSERVE",
  "A1_DRAFT",
  "A2_PREPARE",
  "A3_EXECUTE_LOW",
  "A4_EXECUTE_MED",
  "A5_HUMAN_ONLY",
] as const;
export type CapabilityAuthorityClass = (typeof CAPABILITY_AUTHORITY_CLASSES)[number];

// AIF §4.2 minimum data classes.
export const CAPABILITY_DATA_CLASSES = [
  "PUBLIC",
  "INTERNAL",
  "PII",
  "PHI",
  "FINANCIAL",
  "CREDENTIAL",
  "SECURITY_SENSITIVE",
  "CLINICAL_SIGNING_REQUIRED",
] as const;
export type CapabilityDataClass = (typeof CAPABILITY_DATA_CLASSES)[number];

// Risk is the N5/C3 approval vocabulary, so a capability and the approval that may gate it
// can never disagree about what "high" means.
export const CAPABILITY_RISK_CLASSES = APPROVAL_RISK_CLASSES;
export type CapabilityRiskClass = ApprovalRiskClass;

export const CAPABILITY_TENANT_SCOPES = ["SINGLE_TENANT"] as const;
export type CapabilityTenantScope = (typeof CAPABILITY_TENANT_SCOPES)[number];

// The widest scope a grant of this capability may ever take.
export const CAPABILITY_BRANCH_SCOPES = ["BRANCH", "TENANT_WIDE"] as const;
export type CapabilityBranchScope = (typeof CAPABILITY_BRANCH_SCOPES)[number];

export const CAPABILITY_CONSENT_PURPOSES = ["care", "recall", "analytics", "NOT_REQUIRED"] as const;
export type CapabilityConsentPurpose = ConsentPurpose | "NOT_REQUIRED";

export const IDEMPOTENCY_MODES = ["NOT_APPLICABLE", "CALLER_KEY", "NATURAL_KEY"] as const;
export type IdempotencyMode = (typeof IDEMPOTENCY_MODES)[number];

// Who actually prevents a duplicate side effect. Zyara-side input dedup is not
// external-action idempotency, so only PROVIDER enforcement makes a retried write safe.
export const IDEMPOTENCY_ENFORCERS = ["NONE", "ZYARA_LEDGER", "PROVIDER"] as const;
export type IdempotencyEnforcer = (typeof IDEMPOTENCY_ENFORCERS)[number];

export const VERIFICATION_METHODS = ["PROVIDER_RECEIPT", "READ_BACK", "RECONCILIATION", "NONE_READ_ONLY"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

// Raw payload logging is not a member on purpose.
export const OBSERVABILITY_POLICIES = ["METADATA_ONLY", "REDACTED_PAYLOAD"] as const;
export type ObservabilityPolicy = (typeof OBSERVABILITY_POLICIES)[number];

export const INVOCATION_OUTCOMES = ["SUCCEEDED", "FAILED", "DENIED", "UNKNOWN_EXTERNAL_OUTCOME"] as const;
export type InvocationOutcome = (typeof INVOCATION_OUTCOMES)[number];

export const RECEIPT_VERIFICATIONS = ["VERIFIED", "UNVERIFIED", "PENDING_RECONCILIATION"] as const;
export type ReceiptVerification = (typeof RECEIPT_VERIFICATIONS)[number];

export const CAPABILITY_TIMEOUT_MAX_MS = 300_000;
export const CAPABILITY_RETRY_MAX_ATTEMPTS = 5;

export const CAPABILITY_ID_PATTERN = /^[a-z][a-z0-9_]{0,39}(\.[a-z][a-z0-9_]{0,39}){1,5}$/;
export const CAPABILITY_VERSION_PATTERN = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
export const CAPABILITY_DIGEST_PATTERN = /^cap_[0-9a-f]{64}$/;
export const SCHEMA_DIGEST_PATTERN = /^schema_[0-9a-f]{64}$/;
export const CREDENTIAL_REF_PATTERN = /^credref_[a-z][a-z0-9_]{3,63}$/;
export const EGRESS_POLICY_REF_PATTERN = /^egress_[a-z0-9_]{2,64}$/;
const OWNER_DOMAIN_PATTERN = /^[a-z][a-z0-9_]{1,39}$/;
const RECEIPT_KIND_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

// Value shapes that are credentials, never references. A definition carrying any of them
// anywhere is refused, whatever field it sits in.
// Every quantifier is bounded and every scanned string is length-capped first
// (CAPABILITY_STRING_MAX_LENGTH), so no pattern can backtrack super-linearly.
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  /\b[sr]k[-_](live|test)?[-_]?[A-Za-z0-9]{8,}/,
  /\bsk-[A-Za-z0-9_-]{8,}/,
  /\bAIza[0-9A-Za-z_-]{30,40}/,
  /:\/\/[^/\s:@]{1,256}:[^/\s@]{1,256}@/,
  /secret:\/\//i,
  /\bBearer\s+\S+/i,
  /-----BEGIN [A-Z ]{0,40}PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{4,512}\.[A-Za-z0-9_-]{0,2048}\./,
  /\b(AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bxox[abpr]-[A-Za-z0-9-]{10,}/,
  /\b(password|passwd|secret|api[_-]?key|token)\s*[:=]/i,
  /(access|refresh)[_-]?token/i,
  /private[_-]?key/i,
];

// Direct identifiers (national ids, phone numbers, MRNs) are runs of digits; opaque tokens
// that travel with an invocation must not carry them. This is the N5 rule (approvals,
// activity, audit chain and migration 045), so a token accepted there is accepted here.
const DIRECT_IDENTIFIER_PATTERNS: readonly RegExp[] = [/^[0-9]{7,}$/, /[0-9]{9,}/];
// A canonical lowercase UUID is random hex by construction. Digit-run heuristics would
// refuse about 3% of random UUIDs, so this shape is accepted as opaque without them.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// A long hex run inside a credential reference is a key, not a name.
const LONG_HEX_PATTERN = /[0-9a-f]{32}/;

export const CAPABILITY_STRING_MAX_LENGTH = 512;
export const CAPABILITY_DEFINITION_MAX_BYTES = 16_384;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CapabilityId = string;
export type CapabilityVersion = string;

export interface SchemaRef {
  id: string;
  version: CapabilityVersion;
  digest: string;
}

export type CredentialBindingRef = { kind: "none" } | { kind: "ref"; ref: string };

export type EgressPolicyRef = string;

export interface IdempotencyContract {
  mode: IdempotencyMode;
  enforcedBy: IdempotencyEnforcer;
}

export interface RetryPolicy {
  maxAttempts: number;
  retryOn: "TRANSIENT_ONLY";
}

export interface VerificationContract {
  receiptKind: string;
  method: VerificationMethod;
  onUnknownOutcome: "RECONCILE";
}

export interface CapabilityDefinition {
  id: CapabilityId;
  version: CapabilityVersion;
  ownerDomain: string;
  inputSchema: SchemaRef;
  outputSchema: SchemaRef;
  readOrWrite: "read" | "write";
  riskClass: CapabilityRiskClass;
  authorityClass: CapabilityAuthorityClass;
  dataClasses: readonly CapabilityDataClass[];
  tenantScope: CapabilityTenantScope;
  branchScope: CapabilityBranchScope;
  consentPurpose: CapabilityConsentPurpose;
  credentialBinding: CredentialBindingRef;
  egressPolicy: EgressPolicyRef;
  idempotency: IdempotencyContract;
  timeoutMs: number;
  retry: RetryPolicy;
  dryRunSupport: boolean;
  verification: VerificationContract;
  observability: ObservabilityPolicy;
}

// Only these principals may admit a capability. Agents are absent by construction.
export type CapabilityRegistrar =
  | { kind: "human"; authority: "platform_admin"; id: string }
  | { kind: "system"; principal: "release_pipeline"; id: string };

export interface AdmittedCapability {
  definition: Readonly<CapabilityDefinition>;
  digest: string;
  registeredBy: Readonly<CapabilityRegistrar>;
}

export interface CapabilityRef {
  capabilityId: CapabilityId;
  version: CapabilityVersion;
  definitionDigest: string;
}

export type CapabilityGrantee =
  | { kind: "agent"; id: string }
  | { kind: "human_role"; id: string }
  | { kind: "workflow"; id: string };

export interface CapabilityGrant {
  grantee: CapabilityGrantee;
  tenantId: string;
  // null = tenant-wide. Only legal when the definition's branchScope is TENANT_WIDE.
  branchId: string | null;
  capabilityId: CapabilityId;
  version: CapabilityVersion;
}

export interface CapabilityInvocation {
  capabilityId: CapabilityId;
  version: CapabilityVersion;
  definitionDigest: string;
  tenantId: string;
  branchId: string | null;
  actor: CapabilityGrantee;
  // Normalized parameters digest in the N5/C3 format. Parameter values never travel here.
  parametersDigest: string;
  correlationId: string;
  idempotencyKey: string | null;
  requestedAt: string;
}

export interface InvocationReceipt {
  invocationId: string;
  capabilityId: CapabilityId;
  version: CapabilityVersion;
  definitionDigest: string;
  tenantId: string;
  branchId: string | null;
  correlationId: string;
  outcome: InvocationOutcome;
  verification: ReceiptVerification;
  recordedAt: string;
}

export type CapabilityContractErrorCode =
  | "CAPABILITY_FIELD_UNKNOWN"
  | "CAPABILITY_FIELD_MISSING"
  | "CAPABILITY_VALUE_TOO_LARGE"
  | "CAPABILITY_ID_INVALID"
  | "CAPABILITY_VERSION_INVALID"
  | "CAPABILITY_OWNER_INVALID"
  | "CAPABILITY_SCHEMA_REF_INVALID"
  | "CAPABILITY_READ_WRITE_INVALID"
  | "CAPABILITY_RISK_CLASS_INVALID"
  | "CAPABILITY_AUTHORITY_CLASS_INVALID"
  | "CAPABILITY_DATA_CLASS_UNSUPPORTED"
  | "CAPABILITY_CREDENTIAL_AS_DATA"
  | "CAPABILITY_SIGNING_REQUIRES_HUMAN"
  | "CAPABILITY_SCOPE_INVALID"
  | "CAPABILITY_CONSENT_PURPOSE_UNSUPPORTED"
  | "CAPABILITY_CONSENT_PURPOSE_REQUIRED"
  | "CAPABILITY_CREDENTIAL_PLAINTEXT"
  | "CAPABILITY_EGRESS_POLICY_INVALID"
  | "CAPABILITY_IDEMPOTENCY_INVALID"
  | "CAPABILITY_TIMEOUT_INVALID"
  | "CAPABILITY_RETRY_INVALID"
  | "CAPABILITY_VERIFICATION_INVALID"
  | "CAPABILITY_OBSERVABILITY_INVALID"
  | "CAPABILITY_WRITE_AUTHORITY_TOO_LOW"
  | "CAPABILITY_WRITE_IDEMPOTENCY_REQUIRED"
  | "CAPABILITY_WRITE_VERIFICATION_REQUIRED"
  | "CAPABILITY_WRITE_RETRY_UNSAFE"
  | "CAPABILITY_REGISTRAR_UNTRUSTED"
  | "CAPABILITY_VERSION_DUPLICATE"
  | "CAPABILITY_UNKNOWN"
  | "CAPABILITY_VERSION_MISMATCH"
  | "CAPABILITY_DIGEST_MISMATCH"
  | "CAPABILITY_GRANT_MISMATCH"
  | "CAPABILITY_HUMAN_ONLY"
  | "CAPABILITY_AGENT_RESERVED_NAMESPACE"
  | "CAPABILITY_CROSS_TENANT"
  | "CAPABILITY_SCOPE_WIDENING"
  | "CAPABILITY_PARAMETERS_DIGEST_INVALID"
  | "CAPABILITY_IDEMPOTENCY_KEY_REQUIRED"
  | "CAPABILITY_CORRELATION_REQUIRED"
  | "CAPABILITY_TIME_INVALID"
  | "CAPABILITY_RECEIPT_INVALID"
  | "CAPABILITY_UNKNOWN_OUTCOME_UNVERIFIABLE";

export class CapabilityContractError extends Error {
  readonly code: CapabilityContractErrorCode;

  constructor(code: CapabilityContractErrorCode, message: string) {
    super(message);
    this.name = "CapabilityContractError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fail(code: CapabilityContractErrorCode, message: string): never {
  throw new CapabilityContractError(code, message);
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: unknown, keys: readonly string[], label: string, code: CapabilityContractErrorCode): Record<string, unknown> {
  if (!isRecord(value)) fail(code, `${label} must be an object`);
  for (const key of Object.keys(value)) {
    // The key itself is not echoed: an unexpected key name may be a secret.
    if (!keys.includes(key)) fail("CAPABILITY_FIELD_UNKNOWN", `${label} has an unknown field`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) fail("CAPABILITY_FIELD_MISSING", `${label} is missing '${key}'`);
  }
  return value;
}

function authorityRank(value: CapabilityAuthorityClass): number {
  return CAPABILITY_AUTHORITY_CLASSES.indexOf(value);
}

// Walks every string in the value. Runs before any structural check so a secret cannot
// hide in a field the structural checks would otherwise refuse with a different code.
function assertNoSecretValues(value: unknown, path: string): void {
  if (typeof value === "string") {
    if (value.length > CAPABILITY_STRING_MAX_LENGTH) {
      fail("CAPABILITY_VALUE_TOO_LARGE", `${path} exceeds ${CAPABILITY_STRING_MAX_LENGTH} characters`);
    }
    for (const pattern of SECRET_VALUE_PATTERNS) {
      if (pattern.test(value)) {
        fail("CAPABILITY_CREDENTIAL_PLAINTEXT", `${path} carries a credential-shaped value`);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretValues(item, `${path}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      // Keys are scanned like values; the path then uses a placeholder so a refused key is
      // never echoed back in an error message.
      assertNoSecretValues(key, `${path} key`);
      assertNoSecretValues(item, `${path}.${key}`);
    }
  }
}

function snapshotPlainData(input: unknown): unknown {
  let text: string | undefined;
  try {
    text = JSON.stringify(input);
  } catch {
    fail("CAPABILITY_FIELD_MISSING", "definition must be plain JSON-compatible data");
  }
  if (text === undefined) fail("CAPABILITY_FIELD_MISSING", "definition must be plain JSON-compatible data");
  if (text.length > CAPABILITY_DEFINITION_MAX_BYTES) {
    fail("CAPABILITY_VALUE_TOO_LARGE", `definition exceeds ${CAPABILITY_DEFINITION_MAX_BYTES} characters`);
  }
  return JSON.parse(text) as unknown;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}

// Canonical JSON: object keys sorted, arrays kept in order, no whitespace.
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function assertOpaqueId(value: unknown, label: string, code: CapabilityContractErrorCode): string {
  if (typeof value !== "string" || !OPAQUE_ID_PATTERN.test(value)) fail(code, `${label} must be a non-empty opaque id`);
  return value;
}

// Tokens that travel with an invocation or receipt (correlation, idempotency, invocation
// ids) are opaque: no credential shape and no direct identifier may ride inside them.
function assertOpaqueToken(value: unknown, label: string, code: CapabilityContractErrorCode): string {
  const token = assertOpaqueId(value, label, code);
  if (UUID_PATTERN.test(token)) return token;
  if (
    SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(token)) ||
    DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(token))
  ) {
    fail(code, `${label} must be opaque and carry no credential or direct identifier`);
  }
  return token;
}

function assertInstant(value: unknown, label: string): string {
  if (typeof value !== "string" || !ISO_INSTANT_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    fail("CAPABILITY_TIME_INVALID", `${label} must be an ISO-8601 UTC instant`);
  }
  return value;
}

function validateSchemaRef(value: unknown, label: string): SchemaRef {
  const ref = exactKeys(value, ["id", "version", "digest"], label, "CAPABILITY_SCHEMA_REF_INVALID");
  if (typeof ref.id !== "string" || !CAPABILITY_ID_PATTERN.test(ref.id)) {
    fail("CAPABILITY_SCHEMA_REF_INVALID", `${label}.id is not a valid schema id`);
  }
  if (typeof ref.version !== "string" || !CAPABILITY_VERSION_PATTERN.test(ref.version)) {
    fail("CAPABILITY_SCHEMA_REF_INVALID", `${label}.version is not MAJOR.MINOR.PATCH`);
  }
  if (typeof ref.digest !== "string" || !SCHEMA_DIGEST_PATTERN.test(ref.digest)) {
    fail("CAPABILITY_SCHEMA_REF_INVALID", `${label}.digest is not a schema digest`);
  }
  return { id: ref.id, version: ref.version, digest: ref.digest };
}

function validateCredentialBinding(value: unknown): CredentialBindingRef {
  if (!isRecord(value)) fail("CAPABILITY_CREDENTIAL_PLAINTEXT", "credentialBinding must be an opaque reference");
  if (value.kind === "none" && Object.keys(value).length === 1) return { kind: "none" };
  if (
    value.kind === "ref" &&
    Object.keys(value).length === 2 &&
    typeof value.ref === "string" &&
    CREDENTIAL_REF_PATTERN.test(value.ref) &&
    !LONG_HEX_PATTERN.test(value.ref)
  ) {
    return { kind: "ref", ref: value.ref };
  }
  return fail("CAPABILITY_CREDENTIAL_PLAINTEXT", "credentialBinding must be { kind: 'none' } or an opaque credref_ reference");
}

const DEFINITION_KEYS = [
  "id",
  "version",
  "ownerDomain",
  "inputSchema",
  "outputSchema",
  "readOrWrite",
  "riskClass",
  "authorityClass",
  "dataClasses",
  "tenantScope",
  "branchScope",
  "consentPurpose",
  "credentialBinding",
  "egressPolicy",
  "idempotency",
  "timeoutMs",
  "retry",
  "dryRunSupport",
  "verification",
  "observability",
] as const;

// ---------------------------------------------------------------------------
// Definition validation
// ---------------------------------------------------------------------------

// Returns a fresh, structurally exact copy. Nothing from the input object is retained, so
// later mutation of the caller's object cannot reach an admitted definition.
export function validateCapabilityDefinition(input: unknown): CapabilityDefinition {
  // Read the caller's object exactly once. Every later check and the returned copy work on
  // this plain-data snapshot, so a getter or Proxy cannot answer one value to the checks and
  // another to the copy, and inherited (prototype) fields are not seen at all.
  const snapshot = snapshotPlainData(input);
  assertNoSecretValues(snapshot, "definition");
  const raw = exactKeys(snapshot, DEFINITION_KEYS, "definition", "CAPABILITY_FIELD_MISSING");

  if (typeof raw.id !== "string" || !CAPABILITY_ID_PATTERN.test(raw.id)) {
    fail("CAPABILITY_ID_INVALID", "id must be a dotted lowercase name with at least two segments and no wildcard");
  }
  if (typeof raw.version !== "string" || !CAPABILITY_VERSION_PATTERN.test(raw.version)) {
    fail("CAPABILITY_VERSION_INVALID", "version must be MAJOR.MINOR.PATCH");
  }
  if (typeof raw.ownerDomain !== "string" || !OWNER_DOMAIN_PATTERN.test(raw.ownerDomain)) {
    fail("CAPABILITY_OWNER_INVALID", "ownerDomain must name an owning domain");
  }
  const inputSchema = validateSchemaRef(raw.inputSchema, "inputSchema");
  const outputSchema = validateSchemaRef(raw.outputSchema, "outputSchema");
  if (raw.readOrWrite !== "read" && raw.readOrWrite !== "write") {
    fail("CAPABILITY_READ_WRITE_INVALID", "readOrWrite must be 'read' or 'write'");
  }
  const readOrWrite = raw.readOrWrite;
  if (!isOneOf(CAPABILITY_RISK_CLASSES, raw.riskClass)) fail("CAPABILITY_RISK_CLASS_INVALID", "riskClass is not a closed risk class");
  if (!isOneOf(CAPABILITY_AUTHORITY_CLASSES, raw.authorityClass)) {
    fail("CAPABILITY_AUTHORITY_CLASS_INVALID", "authorityClass is not A0..A5");
  }
  const authorityClass = raw.authorityClass;

  if (!Array.isArray(raw.dataClasses) || raw.dataClasses.length === 0) {
    fail("CAPABILITY_DATA_CLASS_UNSUPPORTED", "dataClasses must name at least one data class");
  }
  const dataClasses: CapabilityDataClass[] = [];
  for (const item of raw.dataClasses) {
    if (!isOneOf(CAPABILITY_DATA_CLASSES, item)) fail("CAPABILITY_DATA_CLASS_UNSUPPORTED", "dataClasses contains an unsupported value");
    if (!dataClasses.includes(item)) dataClasses.push(item);
  }
  // Canonical order, so the same set of classes always yields the same digest.
  dataClasses.sort((a, b) => CAPABILITY_DATA_CLASSES.indexOf(a) - CAPABILITY_DATA_CLASSES.indexOf(b));
  if (dataClasses.includes("CREDENTIAL")) {
    fail("CAPABILITY_CREDENTIAL_AS_DATA", "credentials are never capability data; bind them by opaque reference");
  }
  if (dataClasses.includes("CLINICAL_SIGNING_REQUIRED") && authorityClass !== "A5_HUMAN_ONLY") {
    fail("CAPABILITY_SIGNING_REQUIRES_HUMAN", "clinical-signing data requires A5_HUMAN_ONLY");
  }

  if (!isOneOf(CAPABILITY_TENANT_SCOPES, raw.tenantScope)) fail("CAPABILITY_SCOPE_INVALID", "tenantScope must be SINGLE_TENANT");
  if (!isOneOf(CAPABILITY_BRANCH_SCOPES, raw.branchScope)) fail("CAPABILITY_SCOPE_INVALID", "branchScope must be BRANCH or TENANT_WIDE");

  if (!isOneOf(CAPABILITY_CONSENT_PURPOSES, raw.consentPurpose)) {
    fail("CAPABILITY_CONSENT_PURPOSE_UNSUPPORTED", "consentPurpose is not a supported purpose");
  }
  const consentPurpose = raw.consentPurpose;
  if (consentPurpose === "NOT_REQUIRED" && dataClasses.some((item) => item !== "PUBLIC" && item !== "INTERNAL")) {
    fail("CAPABILITY_CONSENT_PURPOSE_REQUIRED", "a consent purpose is required for data beyond PUBLIC/INTERNAL");
  }

  const credentialBinding = validateCredentialBinding(raw.credentialBinding);
  if (typeof raw.egressPolicy !== "string" || !EGRESS_POLICY_REF_PATTERN.test(raw.egressPolicy)) {
    fail("CAPABILITY_EGRESS_POLICY_INVALID", "egressPolicy must be an egress_ policy reference");
  }

  const idem = exactKeys(raw.idempotency, ["mode", "enforcedBy"], "idempotency", "CAPABILITY_IDEMPOTENCY_INVALID");
  if (!isOneOf(IDEMPOTENCY_MODES, idem.mode) || !isOneOf(IDEMPOTENCY_ENFORCERS, idem.enforcedBy)) {
    fail("CAPABILITY_IDEMPOTENCY_INVALID", "idempotency mode or enforcer is not recognised");
  }
  const idempotency: IdempotencyContract = { mode: idem.mode, enforcedBy: idem.enforcedBy };
  if ((idempotency.mode === "NOT_APPLICABLE") !== (idempotency.enforcedBy === "NONE")) {
    fail("CAPABILITY_IDEMPOTENCY_INVALID", "an idempotency mode needs an enforcer, and NOT_APPLICABLE has none");
  }

  if (typeof raw.timeoutMs !== "number" || !Number.isInteger(raw.timeoutMs) || raw.timeoutMs < 1 || raw.timeoutMs > CAPABILITY_TIMEOUT_MAX_MS) {
    fail("CAPABILITY_TIMEOUT_INVALID", `timeoutMs must be an integer in 1..${CAPABILITY_TIMEOUT_MAX_MS}`);
  }
  const retryRaw = exactKeys(raw.retry, ["maxAttempts", "retryOn"], "retry", "CAPABILITY_RETRY_INVALID");
  if (
    typeof retryRaw.maxAttempts !== "number" ||
    !Number.isInteger(retryRaw.maxAttempts) ||
    retryRaw.maxAttempts < 1 ||
    retryRaw.maxAttempts > CAPABILITY_RETRY_MAX_ATTEMPTS ||
    retryRaw.retryOn !== "TRANSIENT_ONLY"
  ) {
    fail("CAPABILITY_RETRY_INVALID", `retry must allow 1..${CAPABILITY_RETRY_MAX_ATTEMPTS} attempts on TRANSIENT_ONLY`);
  }
  const retry: RetryPolicy = { maxAttempts: retryRaw.maxAttempts, retryOn: "TRANSIENT_ONLY" };

  if (typeof raw.dryRunSupport !== "boolean") fail("CAPABILITY_FIELD_MISSING", "dryRunSupport must be a boolean");

  const ver = exactKeys(raw.verification, ["receiptKind", "method", "onUnknownOutcome"], "verification", "CAPABILITY_VERIFICATION_INVALID");
  if (
    typeof ver.receiptKind !== "string" ||
    !RECEIPT_KIND_PATTERN.test(ver.receiptKind) ||
    !isOneOf(VERIFICATION_METHODS, ver.method) ||
    ver.onUnknownOutcome !== "RECONCILE"
  ) {
    fail("CAPABILITY_VERIFICATION_INVALID", "verification needs a receipt kind, a known method and RECONCILE on unknown outcome");
  }
  const verification: VerificationContract = { receiptKind: ver.receiptKind, method: ver.method, onUnknownOutcome: "RECONCILE" };

  if (!isOneOf(OBSERVABILITY_POLICIES, raw.observability)) {
    fail("CAPABILITY_OBSERVABILITY_INVALID", "observability must be METADATA_ONLY or REDACTED_PAYLOAD");
  }

  if (readOrWrite === "write") {
    if (authorityRank(authorityClass) <= authorityRank("A1_DRAFT")) {
      fail("CAPABILITY_WRITE_AUTHORITY_TOO_LOW", "a write cannot be registered as A0_OBSERVE or A1_DRAFT");
    }
    if (idempotency.mode === "NOT_APPLICABLE") {
      fail("CAPABILITY_WRITE_IDEMPOTENCY_REQUIRED", "a write needs an idempotency contract");
    }
    if (verification.method === "NONE_READ_ONLY") {
      fail("CAPABILITY_WRITE_VERIFICATION_REQUIRED", "a write needs a receipt or verification method");
    }
    if (retry.maxAttempts > 1 && idempotency.enforcedBy !== "PROVIDER") {
      fail("CAPABILITY_WRITE_RETRY_UNSAFE", "a write may retry only when the provider enforces idempotency");
    }
  } else if (idempotency.mode !== "NOT_APPLICABLE" || verification.method !== "NONE_READ_ONLY") {
    // A read with a write-style contract is a mis-declared write.
    fail("CAPABILITY_IDEMPOTENCY_INVALID", "a read declares NOT_APPLICABLE idempotency and NONE_READ_ONLY verification");
  }

  return {
    id: raw.id,
    version: raw.version,
    ownerDomain: raw.ownerDomain,
    inputSchema,
    outputSchema,
    readOrWrite,
    riskClass: raw.riskClass,
    authorityClass,
    dataClasses,
    tenantScope: raw.tenantScope,
    branchScope: raw.branchScope,
    consentPurpose,
    credentialBinding,
    egressPolicy: raw.egressPolicy,
    idempotency,
    timeoutMs: raw.timeoutMs,
    retry,
    dryRunSupport: raw.dryRunSupport,
    verification,
    observability: raw.observability,
  };
}

export async function digestCapabilityDefinition(input: unknown): Promise<string> {
  const definition = validateCapabilityDefinition(input);
  return `cap_${await sha256Hex(canonicalJson(definition))}`;
}

// ---------------------------------------------------------------------------
// Registration and lookup (contract level; durable storage is AIF-01B)
// ---------------------------------------------------------------------------

function validateRegistrar(value: unknown): CapabilityRegistrar {
  if (isRecord(value) && typeof value.id === "string" && OPAQUE_ID_PATTERN.test(value.id)) {
    if (value.kind === "human" && value.authority === "platform_admin" && Object.keys(value).length === 3) {
      return { kind: "human", authority: "platform_admin", id: value.id };
    }
    if (value.kind === "system" && value.principal === "release_pipeline" && Object.keys(value).length === 3) {
      return { kind: "system", principal: "release_pipeline", id: value.id };
    }
  }
  return fail("CAPABILITY_REGISTRAR_UNTRUSTED", "only a platform admin or the release pipeline may register a capability");
}

export class CapabilityContractRegistry {
  readonly #byId = new Map<CapabilityId, Map<CapabilityVersion, AdmittedCapability>>();

  async register(definition: unknown, registrar: unknown): Promise<AdmittedCapability> {
    const trusted = validateRegistrar(registrar);
    const validated = validateCapabilityDefinition(definition);
    const digest = `cap_${await sha256Hex(canonicalJson(validated))}`;
    // Checked after the await so two concurrent registrations of the same version cannot
    // both pass the duplicate check.
    const versions = this.#byId.get(validated.id) ?? new Map<CapabilityVersion, AdmittedCapability>();
    if (versions.has(validated.version)) {
      fail("CAPABILITY_VERSION_DUPLICATE", `${validated.id}@${validated.version} is already registered and immutable`);
    }
    const admitted = deepFreeze<AdmittedCapability>({ definition: validated, digest, registeredBy: trusted });
    versions.set(validated.version, admitted);
    this.#byId.set(validated.id, versions);
    return admitted;
  }

  resolve(ref: CapabilityRef): AdmittedCapability {
    const versions = this.#byId.get(ref.capabilityId);
    if (!versions) fail("CAPABILITY_UNKNOWN", "unknown capability");
    const admitted = versions.get(ref.version);
    if (!admitted) fail("CAPABILITY_VERSION_MISMATCH", "capability version is not registered");
    if (ref.definitionDigest !== admitted.digest) fail("CAPABILITY_DIGEST_MISMATCH", "definition digest does not match the admitted definition");
    return admitted;
  }

  list(): AdmittedCapability[] {
    return [...this.#byId.values()].flatMap((versions) => [...versions.values()]);
  }
}

// ---------------------------------------------------------------------------
// Grants, invocation scope, invocation and receipt shape
// ---------------------------------------------------------------------------

function validateGrantee(value: unknown, label: string): CapabilityGrantee {
  if (!isRecord(value) || !isOneOf(["agent", "human_role", "workflow"] as const, value.kind)) {
    fail("CAPABILITY_GRANT_MISMATCH", `${label} must be an agent, human role or workflow`);
  }
  return { kind: value.kind, id: assertOpaqueId(value.id, `${label}.id`, "CAPABILITY_GRANT_MISMATCH") };
}

function assertSameCapability(admitted: AdmittedCapability, capabilityId: string, version: string, label: string): void {
  if (capabilityId !== admitted.definition.id) fail("CAPABILITY_GRANT_MISMATCH", `${label} names another capability`);
  if (version !== admitted.definition.version) fail("CAPABILITY_VERSION_MISMATCH", `${label} names another version`);
}

function assertScopeIds(tenantId: unknown, branchId: unknown, label: string): void {
  assertOpaqueId(tenantId, `${label}.tenantId`, "CAPABILITY_SCOPE_INVALID");
  if (branchId !== null) assertOpaqueId(branchId, `${label}.branchId`, "CAPABILITY_SCOPE_INVALID");
}

export function validateGrant(admitted: AdmittedCapability, grant: CapabilityGrant): void {
  const grantee = validateGrantee(grant.grantee, "grant.grantee");
  assertSameCapability(admitted, grant.capabilityId, grant.version, "grant");
  assertScopeIds(grant.tenantId, grant.branchId, "grant");
  const { definition } = admitted;
  if (definition.branchScope === "BRANCH" && grant.branchId === null) {
    fail("CAPABILITY_SCOPE_WIDENING", "a branch-scoped capability cannot be granted tenant-wide");
  }
  // A5 is human-only for every automated principal: an agent and a workflow alike.
  if (grantee.kind !== "human_role" && definition.authorityClass === "A5_HUMAN_ONLY") {
    fail("CAPABILITY_HUMAN_ONLY", "an A5_HUMAN_ONLY capability can only be granted to a human role");
  }
  // Reserved namespaces stay with typed Zyara operations (workflows) and humans; an agent
  // may only observe or draft inside them (N5/C1).
  if (grantee.kind === "agent") {
    if (isReservedCapability(definition.id) && authorityRank(definition.authorityClass) > authorityRank("A1_DRAFT")) {
      fail("CAPABILITY_AGENT_RESERVED_NAMESPACE", "agents may only observe or draft inside a reserved namespace");
    }
  }
}

// Checks that an invocation stays inside the grant it relies on. Scope can only narrow:
// a tenant-wide grant may serve any branch of its tenant; a branch grant serves only its
// own branch and never a tenant-wide call.
export function checkInvocationScope(admitted: AdmittedCapability, grant: CapabilityGrant, invocation: CapabilityInvocation): void {
  validateGrant(admitted, grant);
  assertSameCapability(admitted, invocation.capabilityId, invocation.version, "invocation");
  assertScopeIds(invocation.tenantId, invocation.branchId, "invocation");
  const actor = validateGrantee(invocation.actor, "invocation.actor");
  if (actor.kind !== grant.grantee.kind || actor.id !== grant.grantee.id) {
    fail("CAPABILITY_GRANT_MISMATCH", "the invoking actor does not hold this grant");
  }
  if (invocation.tenantId !== grant.tenantId) fail("CAPABILITY_CROSS_TENANT", "invocation tenant differs from the grant tenant");
  if (grant.branchId !== null && invocation.branchId !== grant.branchId) {
    fail("CAPABILITY_SCOPE_WIDENING", "invocation branch is outside the granted branch");
  }
  if (admitted.definition.branchScope === "BRANCH" && invocation.branchId === null) {
    fail("CAPABILITY_SCOPE_WIDENING", "a branch-scoped capability cannot be invoked tenant-wide");
  }
}

export function validateInvocation(admitted: AdmittedCapability, invocation: CapabilityInvocation): void {
  assertSameCapability(admitted, invocation.capabilityId, invocation.version, "invocation");
  if (invocation.definitionDigest !== admitted.digest) {
    fail("CAPABILITY_DIGEST_MISMATCH", "invocation is bound to another definition digest");
  }
  assertScopeIds(invocation.tenantId, invocation.branchId, "invocation");
  if (admitted.definition.branchScope === "BRANCH" && invocation.branchId === null) {
    fail("CAPABILITY_SCOPE_WIDENING", "a branch-scoped capability needs a branch on every invocation");
  }
  validateGrantee(invocation.actor, "invocation.actor");
  if (typeof invocation.parametersDigest !== "string" || !APPROVAL_PARAMETERS_DIGEST_PATTERN.test(invocation.parametersDigest)) {
    fail("CAPABILITY_PARAMETERS_DIGEST_INVALID", "parametersDigest must be a normalized params_ digest, never raw parameters");
  }
  assertOpaqueToken(invocation.correlationId, "invocation.correlationId", "CAPABILITY_CORRELATION_REQUIRED");
  if (admitted.definition.idempotency.mode === "CALLER_KEY" || invocation.idempotencyKey !== null) {
    assertOpaqueToken(invocation.idempotencyKey, "invocation.idempotencyKey", "CAPABILITY_IDEMPOTENCY_KEY_REQUIRED");
  }
  assertInstant(invocation.requestedAt, "invocation.requestedAt");
}

export function validateReceipt(admitted: AdmittedCapability, receipt: InvocationReceipt): void {
  assertSameCapability(admitted, receipt.capabilityId, receipt.version, "receipt");
  if (receipt.definitionDigest !== admitted.digest) fail("CAPABILITY_DIGEST_MISMATCH", "receipt is bound to another definition digest");
  assertOpaqueToken(receipt.invocationId, "receipt.invocationId", "CAPABILITY_RECEIPT_INVALID");
  assertScopeIds(receipt.tenantId, receipt.branchId, "receipt");
  if (admitted.definition.branchScope === "BRANCH" && receipt.branchId === null) {
    fail("CAPABILITY_SCOPE_WIDENING", "a branch-scoped capability's receipt names its branch");
  }
  assertOpaqueToken(receipt.correlationId, "receipt.correlationId", "CAPABILITY_CORRELATION_REQUIRED");
  assertInstant(receipt.recordedAt, "receipt.recordedAt");
  if (!isOneOf(INVOCATION_OUTCOMES, receipt.outcome) || !isOneOf(RECEIPT_VERIFICATIONS, receipt.verification)) {
    fail("CAPABILITY_RECEIPT_INVALID", "receipt outcome or verification is not recognised");
  }
  if (receipt.outcome === "UNKNOWN_EXTERNAL_OUTCOME") {
    if (receipt.verification !== "PENDING_RECONCILIATION") {
      fail("CAPABILITY_UNKNOWN_OUTCOME_UNVERIFIABLE", "an unknown external outcome stays pending reconciliation");
    }
    return;
  }
  if (receipt.verification === "PENDING_RECONCILIATION") {
    fail("CAPABILITY_RECEIPT_INVALID", "only an unknown external outcome is pending reconciliation");
  }
  if (receipt.outcome === "DENIED" && receipt.verification !== "UNVERIFIED") {
    fail("CAPABILITY_RECEIPT_INVALID", "a denied invocation executed nothing, so there is nothing to verify");
  }
  if (receipt.verification === "VERIFIED" && admitted.definition.verification.method === "NONE_READ_ONLY") {
    fail("CAPABILITY_RECEIPT_INVALID", "a capability without a verification method cannot report VERIFIED");
  }
}
