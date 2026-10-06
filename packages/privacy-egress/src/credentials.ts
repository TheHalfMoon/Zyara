// Zyara AI Operating Fabric AIF-02B: credential mediation.
//
// Authority: AIF plan §4.2 and §12 (AIF-02 "secret resolver"); AIF handoff §7;
// docs/evidence/AIF/AIF-02B/WORK_PACKET.md, which states the rules in order.
//
// The gateway sees metadata only. An opaque `credref_` reference (the AIF-01A
// credentialBinding) resolves to a short-lived secret only inside the execution adapter,
// through `ResolvedCredential.use(fn)` / `useAsync(fn)`. Every serialization of the secret
// fails, adapter errors are replaced by a redacted error, no receipt, error or health report
// carries the value or the vault handle, and a model or agent never chooses which reference is
// resolved. Return-value checks are best effort for reviewed Zyara adapter code; they are a
// second line of defense, not a sandbox.

import { CREDENTIAL_REF_PATTERN, containsCredentialShape } from "@zyara/capability-gateway";

export const CREDENTIAL_SUBJECT_KINDS = ["TENANT", "BRANCH", "HUMAN_DELEGATE", "SERVICE_ACCOUNT", "EXTERNAL_INTEGRATION"] as const;
export type CredentialSubjectKind = (typeof CREDENTIAL_SUBJECT_KINDS)[number];

// A resolved secret may be used for at most this long after resolution.
export const CREDENTIAL_LEASE_MS = 60_000;
// Health reports a credential as expiring within this many days.
export const CREDENTIAL_EXPIRY_WARNING_DAYS = 14;

export interface CredentialSubject {
  kind: CredentialSubjectKind;
  id: string;
}

export interface CredentialBinding {
  ref: string;
  tenantId: string;
  // null = tenant-wide.
  branchId: string | null;
  providerId: string;
  subject: CredentialSubject;
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
  // On whose behalf the credential acts (tenant, branch, delegating human, service account
  // or external integration); must equal the binding's subject.
  subject: CredentialSubject;
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
  | "CREDENTIAL_SUBJECT_MISMATCH"
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

function instant(value: unknown): number {
  if (typeof value !== "string" || !ISO_INSTANT.test(value)) return Number.NaN;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return Number.NaN;
  // Refuse rolled-over calendar dates (2026-02-30) instead of shifting them.
  return new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19) ? parsed : Number.NaN;
}

// An id echoed into a receipt: opaque shape and no credential shape.
function safeId(value: unknown): value is string {
  return typeof value === "string" && OPAQUE.test(value) && !containsCredentialShape(value);
}

// ---------------------------------------------------------------------------
// Secret-free structure checks
// ---------------------------------------------------------------------------

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Splits camelCase, kebab, snake and dotted keys into lowercase words.
function keyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

const SECRET_WORDS = new Set([
  "secret", "secrets", "password", "passwords", "passwd", "pwd", "passphrase", "token", "tokens",
  "cookie", "cookies", "authorization", "credential", "credentials", "apikey", "privatekey",
]);
const KEY_QUALIFIERS = new Set(["api", "private", "signing", "access", "secret", "encryption", "master"]);
// A credential *reference* or *id* is metadata, not a secret.
const REFERENCE_WORDS = new Set(["ref", "refs", "reference", "id", "ids", "handle", "kind", "status", "version"]);

export function isSecretNamedKey(key: string): boolean {
  const words = keyWords(key);
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const next = words[index + 1];
    if ((word === "credential" || word === "credentials") && next !== undefined && REFERENCE_WORDS.has(next)) continue;
    if (SECRET_WORDS.has(word)) return true;
    if (word === "key" && index > 0 && KEY_QUALIFIERS.has(words[index - 1])) return true;
  }
  return false;
}

// Throws if a model or tool payload carries a resolved credential, a credential-shaped string,
// a secret-named key, or any value that is not plain JSON data (functions, Maps, Sets,
// buffers, symbols), so nothing opaque can smuggle a secret into serialization.
export function assertSecretFreePayload(value: unknown, path = "payload", depth = 0): void {
  if (depth > 32) throw new CredentialError(`${path} is nested too deeply to check`);
  if (value === null || typeof value === "number" || typeof value === "boolean" || value === undefined) return;
  if (typeof value === "string") {
    if (containsCredentialShape(value)) throw new CredentialError(`${path} carries a credential-shaped value`);
    return;
  }
  if (value instanceof ResolvedCredential) throw new CredentialError(`${path} carries a resolved credential`);
  if (typeof value !== "object" || (!Array.isArray(value) && !isPlainObject(value))) {
    throw new CredentialError(`${path} is not plain JSON data`);
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") throw new CredentialError(`${path} has a symbol key`);
    if (Array.isArray(value) && key === "length") continue;
    // The key name is not echoed: it may itself be sensitive.
    if (!Array.isArray(value) && isSecretNamedKey(key)) throw new CredentialError(`${path} has a secret-named field`);
    assertSecretFreePayload((value as Record<string, unknown>)[key], `${path}.<field>`, depth + 1);
  }
}

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Standard base64 of the UTF-8 bytes, so an adapter cannot return the secret merely encoded.
function base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const triple = (bytes[index] << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0);
    out += BASE64_ALPHABET[(triple >> 18) & 63] + BASE64_ALPHABET[(triple >> 12) & 63];
    out += index + 1 < bytes.length ? BASE64_ALPHABET[(triple >> 6) & 63] : "=";
    out += index + 2 < bytes.length ? BASE64_ALPHABET[triple & 63] : "=";
  }
  return out;
}

// True unless the value is plain data that demonstrably does not contain the secret.
function leaksSecret(value: unknown, secret: string, encoded: readonly string[], depth = 0): boolean {
  if (depth > 16) return true;
  if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") return false;
  if (typeof value === "string") return encoded.some((form) => value.includes(form));
  if (typeof value !== "object") return true; // functions, symbols, bigint
  if (value instanceof ResolvedCredential) return true;
  if (!Array.isArray(value) && !isPlainObject(value)) return true; // Promise, Map, Set, Buffer, Error, class instances
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") return true;
    if (Array.isArray(value) && key === "length") continue;
    if (encoded.some((form) => key.includes(form))) return true;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || "get" in descriptor || "set" in descriptor) return true;
    if (leaksSecret(descriptor.value, secret, encoded, depth + 1)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The resolved credential
// ---------------------------------------------------------------------------

// The only holder of a resolved secret. The value lives in a private field; every way of
// serializing or printing the object fails or shows a placeholder.
export class ResolvedCredential {
  readonly ref: string;
  readonly version: number;
  readonly issuedAt: number;
  readonly leaseExpiresAt: number;
  #secret: string | null;
  readonly #now: () => number;

  constructor(ref: string, version: number, secret: string, issuedAt: number, now: () => number) {
    this.ref = ref;
    this.version = version;
    this.issuedAt = issuedAt;
    this.leaseExpiresAt = issuedAt + CREDENTIAL_LEASE_MS;
    this.#secret = secret;
    this.#now = now;
  }

  #open(): string {
    const secret = this.#secret;
    if (secret === null) throw new CredentialError("credential was disposed");
    const now = this.#now();
    // Written so that NaN, a clock moving backwards, or the end of the lease all fail closed.
    if (!(now >= this.issuedAt && now < this.leaseExpiresAt)) {
      this.dispose();
      throw new CredentialError("credential lease expired; resolve again");
    }
    return secret;
  }

  #check<T>(result: T, secret: string): T {
    if (leaksSecret(result, secret, [secret, base64(secret)])) {
      throw new CredentialError("an adapter must return plain data that does not carry the secret");
    }
    return result;
  }

  // Runs synchronous adapter code with the secret. Errors from the adapter are replaced by a
  // redacted error (no message, cause or stack from the original), and the return value must
  // be plain data without the secret. Use useAsync for asynchronous adapters.
  use<T>(fn: (secret: string) => T): T {
    const secret = this.#open();
    let result: T;
    try {
      result = fn(secret);
    } catch {
      throw new CredentialError("adapter failed");
    }
    return this.#check(result, secret);
  }

  async useAsync<T>(fn: (secret: string) => Promise<T>): Promise<T> {
    const secret = this.#open();
    let result: T;
    try {
      result = await fn(secret);
    } catch {
      throw new CredentialError("adapter failed");
    }
    return this.#check(result, secret);
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

// ---------------------------------------------------------------------------
// Mediation
// ---------------------------------------------------------------------------

function sameSubject(a: CredentialSubject, b: CredentialSubject): boolean {
  return a.kind === b.kind && a.id === b.id;
}

function validBinding(binding: CredentialBinding): boolean {
  return (
    typeof binding === "object" &&
    binding !== null &&
    typeof binding.secretHandle === "string" &&
    binding.secretHandle.length > 0 &&
    Number.isInteger(binding.version) &&
    binding.version >= 1 &&
    Array.isArray(binding.scopes) &&
    binding.scopes.every((scope) => typeof scope === "string") &&
    typeof binding.subject === "object" &&
    binding.subject !== null &&
    (CREDENTIAL_SUBJECT_KINDS as readonly unknown[]).includes(binding.subject.kind)
  );
}

// Rules 2-9 of the work packet; the vault is never touched here.
function check(request: CredentialRequest, binding: CredentialBinding | null, now: number): CredentialReasonCode {
  if (binding === null || binding.ref !== request.ref) return "CREDENTIAL_UNKNOWN";
  if (!validBinding(binding)) return "CREDENTIAL_DEPENDENCY_UNAVAILABLE";
  if (binding.tenantId !== request.tenantId) return "CREDENTIAL_CROSS_TENANT";
  if (binding.branchId !== null && binding.branchId !== request.branchId) return "CREDENTIAL_CROSS_BRANCH";
  if (binding.providerId !== request.providerId) return "CREDENTIAL_PROVIDER_MISMATCH";
  if (!sameSubject(binding.subject, request.subject)) return "CREDENTIAL_SUBJECT_MISMATCH";
  if (binding.status !== "ACTIVE") return "CREDENTIAL_REVOKED";
  const notBefore = instant(binding.notBefore);
  const expiresAt = instant(binding.expiresAt);
  if (Number.isNaN(notBefore) || Number.isNaN(expiresAt)) return "CREDENTIAL_DEPENDENCY_UNAVAILABLE";
  if (now < notBefore) return "CREDENTIAL_NOT_YET_VALID";
  if (now >= expiresAt) return "CREDENTIAL_EXPIRED";
  if (binding.version !== request.version) return "CREDENTIAL_ROTATED";
  if (!request.requiredScopes.every((scope) => binding.scopes.includes(scope))) return "CREDENTIAL_SCOPE_INSUFFICIENT";
  return "CREDENTIAL_ALLOWED";
}

// Rule 1: reads each field exactly once into a validated plain copy (a getter or Proxy cannot
// answer one value to validation and another to the copy). Any failure is "invalid".
function validRequest(input: unknown): CredentialRequest | null {
  try {
    if (typeof input !== "object" || input === null) return null;
    const source = input as Record<string, unknown>;
    const ref = source.ref;
    const version = source.version;
    const tenantId = source.tenantId;
    const branchId = source.branchId;
    const providerId = source.providerId;
    const subjectInput = source.subject;
    const capabilityId = source.capabilityId;
    const scopesInput = source.requiredScopes;
    if (typeof ref !== "string" || !CREDENTIAL_REF_PATTERN.test(ref)) return null;
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return null;
    if (!safeId(tenantId) || !safeId(providerId) || !safeId(capabilityId)) return null;
    if (branchId !== null && !safeId(branchId)) return null;
    if (typeof subjectInput !== "object" || subjectInput === null) return null;
    const subjectKind = (subjectInput as Record<string, unknown>).kind;
    const subjectId = (subjectInput as Record<string, unknown>).id;
    if (!(CREDENTIAL_SUBJECT_KINDS as readonly unknown[]).includes(subjectKind) || !safeId(subjectId)) return null;
    if (!Array.isArray(scopesInput) || scopesInput.length > 32) return null;
    const requiredScopes = [...scopesInput];
    if (!requiredScopes.every((scope) => typeof scope === "string" && SCOPE.test(scope))) return null;
    return {
      ref,
      version,
      tenantId,
      branchId: branchId as string | null,
      providerId,
      subject: { kind: subjectKind as CredentialSubjectKind, id: subjectId },
      capabilityId,
      requiredScopes,
    };
  } catch {
    return null;
  }
}

export function mediateCredential(
  input: CredentialRequest,
  deps: CredentialDependencies,
): { receipt: CredentialReceipt; credential: ResolvedCredential | null } {
  let request: CredentialRequest | null = null;
  let nowIso: string | null = null;
  let reason: CredentialReasonCode;
  let credential: ResolvedCredential | null = null;
  try {
    request = validRequest(input);
    const candidate = deps.clock.now();
    const now = instant(candidate);
    if (Number.isNaN(now)) throw new CredentialError("time unavailable");
    nowIso = candidate;
    if (request === null) {
      reason = "CREDENTIAL_REQUEST_INVALID";
    } else {
      const found = deps.bindings.find(request.ref);
      if (found === "UNAVAILABLE") throw new CredentialError("bindings unavailable");
      reason = check(request, found, now);
      if (reason === "CREDENTIAL_ALLOWED" && found !== null) {
        // Rule 10: the vault is called only now, with this version's handle.
        const secret = deps.vault.resolve(found.secretHandle);
        if (secret === "UNAVAILABLE") throw new CredentialError("vault unavailable");
        if (typeof secret !== "string" || secret.length === 0) {
          reason = "CREDENTIAL_ROTATED";
        } else {
          credential = new ResolvedCredential(found.ref, found.version, secret, now, () => instant(deps.clock.now()));
        }
      }
    }
  } catch {
    reason = "CREDENTIAL_DEPENDENCY_UNAVAILABLE";
    credential = null;
  }
  const allow = reason === "CREDENTIAL_ALLOWED" && credential !== null;
  const receipt: CredentialReceipt = Object.freeze({
    decision: allow ? "ALLOW" : "DENY",
    reasons: Object.freeze([reason]),
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
