// Zyara AI Operating Fabric AIF-02B: credential mediation.
//
// Authority: AIF plan §4.2 and §12 (AIF-02 "secret resolver"); AIF handoff §7;
// docs/evidence/AIF/AIF-02B/WORK_PACKET.md, which states the rules in order.
//
// The gateway sees metadata only. An opaque `credref_` reference (the AIF-01A
// credentialBinding) resolves to a short-lived secret only inside the execution adapter,
// through `ResolvedCredential.use(fn)`. Every serialization of the secret fails, no receipt,
// error or health report carries the value or the vault handle, and a model or agent never
// chooses which reference is resolved.

import { CREDENTIAL_REF_PATTERN, containsCredentialShape } from "@zyara/capability-gateway";

export const CREDENTIAL_SUBJECT_KINDS = ["TENANT", "BRANCH", "HUMAN_DELEGATE", "SERVICE_ACCOUNT", "EXTERNAL_INTEGRATION"] as const;
export type CredentialSubjectKind = (typeof CREDENTIAL_SUBJECT_KINDS)[number];

// A resolved secret may be used for at most this long after resolution.
export const CREDENTIAL_LEASE_MS = 60_000;
// Health reports a credential as expiring within this many days.
export const CREDENTIAL_EXPIRY_WARNING_DAYS = 14;

export interface CredentialBinding {
  ref: string;
  tenantId: string;
  // null = tenant-wide.
  branchId: string | null;
  providerId: string;
  subject: { kind: CredentialSubjectKind; id: string };
  version: number;
  scopes: readonly string[];
  notBefore: string;
  expiresAt: string;
  rotatedAt: string | null;
  status: "ACTIVE" | "REVOKED";
  // Opaque vault handle for this version's secret. Never leaves this module.
  secretHandle: string;
}

export interface CredentialRequest {
  ref: string;
  version: number;
  // From the AIF-01B resolution receipt / server-derived principal, never from a model.
  tenantId: string;
  branchId: string | null;
  providerId: string;
  capabilityId: string;
  requiredScopes: readonly string[];
}

export type CredentialReasonCode =
  | "CREDENTIAL_ALLOWED"
  | "CREDENTIAL_REQUEST_INVALID"
  | "CREDENTIAL_UNKNOWN"
  | "CREDENTIAL_CROSS_TENANT"
  | "CREDENTIAL_CROSS_BRANCH"
  | "CREDENTIAL_PROVIDER_MISMATCH"
  | "CREDENTIAL_REVOKED"
  | "CREDENTIAL_NOT_YET_VALID"
  | "CREDENTIAL_EXPIRED"
  | "CREDENTIAL_ROTATED"
  | "CREDENTIAL_SCOPE_INSUFFICIENT"
  | "CREDENTIAL_DEPENDENCY_UNAVAILABLE";

export interface CredentialReceipt {
  decision: "ALLOW" | "DENY";
  reasons: readonly CredentialReasonCode[];
  ref: string | null;
  version: number | null;
  tenantId: string | null;
  branchId: string | null;
  providerId: string | null;
  capabilityId: string | null;
  decidedAt: string | null;
  leaseExpiresAt: string | null;
}

export interface CredentialDependencies {
  clock: { now(): string };
  bindings: { find(ref: string): CredentialBinding | null | "UNAVAILABLE" };
  // Returns the secret for a live handle, null for a retired handle (rotated away).
  vault: { resolve(secretHandle: string): string | null | "UNAVAILABLE" };
}

export class CredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialError";
  }
}

const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SCOPE = /^[a-z][a-z0-9_.:]{0,63}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const SECRET_KEY = /(secret|password|passwd|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?secret|authorization|bearer|credential(?!_?ref))/i;

function instant(value: unknown): number {
  if (typeof value !== "string" || !ISO_INSTANT.test(value)) return Number.NaN;
  const parsed = Date.parse(value);
  return new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19) ? parsed : Number.NaN;
}

// The only holder of a resolved secret. The value lives in a private field; every way of
// serializing or printing the object fails or shows a placeholder.
export class ResolvedCredential {
  readonly ref: string;
  readonly version: number;
  readonly leaseExpiresAt: number;
  #secret: string | null;
  readonly #now: () => number;

  constructor(ref: string, version: number, secret: string, leaseExpiresAt: number, now: () => number) {
    this.ref = ref;
    this.version = version;
    this.leaseExpiresAt = leaseExpiresAt;
    this.#secret = secret;
    this.#now = now;
  }

  // Runs adapter code with the secret. Throws after the lease or after dispose, and refuses a
  // return value that carries the secret, so the adapter cannot hand it back out.
  use<T>(fn: (secret: string) => T): T {
    const secret = this.#secret;
    if (secret === null) throw new CredentialError("credential was disposed");
    if (this.#now() >= this.leaseExpiresAt) {
      this.dispose();
      throw new CredentialError("credential lease expired; resolve again");
    }
    const result = fn(secret);
    if (carriesValue(result, secret)) throw new CredentialError("an adapter must not return the secret");
    return result;
  }

  dispose(): void {
    this.#secret = null;
  }

  toJSON(): never {
    throw new CredentialError("a resolved credential cannot be serialized");
  }

  toString(): string {
    return "[ResolvedCredential]";
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return "[ResolvedCredential]";
  }
}

function carriesValue(value: unknown, secret: string, depth = 0): boolean {
  if (depth > 8) return true;
  if (typeof value === "string") return value.includes(secret);
  if (value instanceof ResolvedCredential) return true;
  if (Array.isArray(value)) return value.some((item) => carriesValue(item, secret, depth + 1));
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).some(([key, item]) => key.includes(secret) || carriesValue(item, secret, depth + 1));
  }
  return false;
}

// Throws if a model or tool payload carries a resolved credential, a credential-shaped string
// or a secret-named key. Call before serializing anything for a model or tool.
export function assertSecretFreePayload(value: unknown, path = "payload", depth = 0): void {
  if (depth > 32) throw new CredentialError(`${path} is nested too deeply to check`);
  if (value instanceof ResolvedCredential) throw new CredentialError(`${path} carries a resolved credential`);
  if (typeof value === "string") {
    if (containsCredentialShape(value)) throw new CredentialError(`${path} carries a credential-shaped value`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSecretFreePayload(item, `${path}[${index}]`, depth + 1));
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      // The key name is not echoed: it may itself be sensitive.
      if (SECRET_KEY.test(key)) throw new CredentialError(`${path} has a secret-named field`);
      assertSecretFreePayload(item, `${path}.<field>`, depth + 1);
    }
  }
}

function deny(reason: CredentialReasonCode): { reasons: CredentialReasonCode[] } {
  return { reasons: [reason] };
}

// Rules 1-9 of the work packet; the vault is never touched here.
function check(request: CredentialRequest, binding: CredentialBinding | null, now: number): { reasons: CredentialReasonCode[] } {
  if (binding === null) return deny("CREDENTIAL_UNKNOWN");
  if (binding.ref !== request.ref) return deny("CREDENTIAL_UNKNOWN");
  if (binding.tenantId !== request.tenantId) return deny("CREDENTIAL_CROSS_TENANT");
  if (binding.branchId !== null && binding.branchId !== request.branchId) return deny("CREDENTIAL_CROSS_BRANCH");
  if (binding.providerId !== request.providerId) return deny("CREDENTIAL_PROVIDER_MISMATCH");
  if (binding.status !== "ACTIVE") return deny("CREDENTIAL_REVOKED");
  const notBefore = instant(binding.notBefore);
  const expiresAt = instant(binding.expiresAt);
  if (Number.isNaN(notBefore) || Number.isNaN(expiresAt)) return deny("CREDENTIAL_DEPENDENCY_UNAVAILABLE");
  if (now < notBefore) return deny("CREDENTIAL_NOT_YET_VALID");
  if (now >= expiresAt) return deny("CREDENTIAL_EXPIRED");
  if (binding.version !== request.version) return deny("CREDENTIAL_ROTATED");
  if (!request.requiredScopes.every((scope) => binding.scopes.includes(scope))) return deny("CREDENTIAL_SCOPE_INSUFFICIENT");
  return { reasons: ["CREDENTIAL_ALLOWED"] };
}

function validRequest(input: unknown): CredentialRequest | null {
  if (typeof input !== "object" || input === null) return null;
  const r = input as Record<string, unknown>;
  if (typeof r.ref !== "string" || !CREDENTIAL_REF_PATTERN.test(r.ref)) return null;
  if (typeof r.version !== "number" || !Number.isInteger(r.version) || r.version < 1) return null;
  if (typeof r.tenantId !== "string" || !OPAQUE.test(r.tenantId)) return null;
  if (r.branchId !== null && (typeof r.branchId !== "string" || !OPAQUE.test(r.branchId))) return null;
  if (typeof r.providerId !== "string" || !OPAQUE.test(r.providerId)) return null;
  if (typeof r.capabilityId !== "string" || !OPAQUE.test(r.capabilityId)) return null;
  if (!Array.isArray(r.requiredScopes) || r.requiredScopes.length > 32 || !r.requiredScopes.every((s) => typeof s === "string" && SCOPE.test(s))) return null;
  return {
    ref: r.ref,
    version: r.version,
    tenantId: r.tenantId,
    branchId: r.branchId as string | null,
    providerId: r.providerId,
    capabilityId: r.capabilityId,
    requiredScopes: [...(r.requiredScopes as string[])],
  };
}

export function mediateCredential(
  input: CredentialRequest,
  deps: CredentialDependencies,
): { receipt: CredentialReceipt; credential: ResolvedCredential | null } {
  // Rule 1: read the request once into a validated copy.
  const request = validRequest(input);
  let nowIso: string | null = null;
  let reasons: CredentialReasonCode[];
  let credential: ResolvedCredential | null = null;
  try {
    const candidate = deps.clock.now();
    const now = instant(candidate);
    if (Number.isNaN(now)) throw new CredentialError("time unavailable");
    nowIso = candidate;
    if (request === null) {
      reasons = ["CREDENTIAL_REQUEST_INVALID"];
    } else {
      const found = deps.bindings.find(request.ref);
      if (found === "UNAVAILABLE") throw new CredentialError("bindings unavailable");
      reasons = check(request, found, now).reasons;
      if (reasons[0] === "CREDENTIAL_ALLOWED" && found !== null) {
        // Rule 10: the vault is called only now, with this version's handle.
        const secret = deps.vault.resolve(found.secretHandle);
        if (secret === "UNAVAILABLE") throw new CredentialError("vault unavailable");
        if (secret === null || typeof secret !== "string" || secret.length === 0) {
          reasons = ["CREDENTIAL_ROTATED"];
        } else {
          credential = new ResolvedCredential(found.ref, found.version, secret, now + CREDENTIAL_LEASE_MS, () => instant(deps.clock.now()));
        }
      }
    }
  } catch {
    reasons = ["CREDENTIAL_DEPENDENCY_UNAVAILABLE"];
    credential = null;
  }
  const allow = reasons[0] === "CREDENTIAL_ALLOWED" && credential !== null;
  const receipt: CredentialReceipt = Object.freeze({
    decision: allow ? "ALLOW" : "DENY",
    reasons: Object.freeze([...reasons]),
    ref: request?.ref ?? null,
    version: request?.version ?? null,
    tenantId: request?.tenantId ?? null,
    branchId: request?.branchId ?? null,
    providerId: request?.providerId ?? null,
    capabilityId: request?.capabilityId ?? null,
    decidedAt: nowIso,
    leaseExpiresAt: allow && credential !== null ? new Date(credential.leaseExpiresAt).toISOString() : null,
  });
  return { receipt, credential: allow ? credential : null };
}

export interface CredentialHealth {
  ref: string;
  status: "ACTIVE" | "REVOKED";
  version: number;
  rotatedAt: string | null;
  daysToExpiry: number | null;
  state: "HEALTHY" | "EXPIRING" | "EXPIRED" | "NOT_YET_VALID" | "REVOKED" | "INVALID";
}

// Metadata only: never the value, never the vault handle.
export function credentialHealth(binding: CredentialBinding, nowIso: string): CredentialHealth {
  const now = instant(nowIso);
  const notBefore = instant(binding.notBefore);
  const expiresAt = instant(binding.expiresAt);
  const base = { ref: binding.ref, status: binding.status, version: binding.version, rotatedAt: binding.rotatedAt };
  if ([now, notBefore, expiresAt].some(Number.isNaN)) return { ...base, daysToExpiry: null, state: "INVALID" };
  const daysToExpiry = Math.floor((expiresAt - now) / 86_400_000);
  let state: CredentialHealth["state"] = "HEALTHY";
  if (binding.status !== "ACTIVE") state = "REVOKED";
  else if (now >= expiresAt) state = "EXPIRED";
  else if (now < notBefore) state = "NOT_YET_VALID";
  else if (daysToExpiry < CREDENTIAL_EXPIRY_WARNING_DAYS) state = "EXPIRING";
  return { ...base, daysToExpiry, state };
}
