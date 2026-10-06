// AIF-02B synthetic qualification: credential mediation.
//
// Proves, with synthetic credentials only, that an opaque credref_ resolves only for the
// right tenant, branch, provider, scopes, validity window and version; that the vault is
// touched only after every check; that the resolved secret is reachable only through use()
// within a short lease and can never be serialized, logged or returned; and that receipts and
// health reports carry metadata only.
import assert from "node:assert";
import { inspect } from "node:util";
import { describe, it } from "node:test";
import {
  CREDENTIAL_LEASE_MS,
  CredentialError,
  ResolvedCredential,
  assertSecretFreePayload,
  credentialHealth,
  mediateCredential,
  type CredentialBinding,
  type CredentialDependencies,
  type CredentialRequest,
} from "@zyara/privacy-egress";

const NOW = "2026-10-06T12:00:00.000Z";
const SECRET = "synthetic-whatsapp-api-secret-0001";
const HANDLE = "vault-handle-v2";

function binding(overrides: Partial<CredentialBinding> = {}): CredentialBinding {
  return {
    ref: "credref_whatsapp_sender_01",
    tenantId: "t1",
    branchId: "b1",
    providerId: "whatsapp-cloud",
    subject: { kind: "EXTERNAL_INTEGRATION", id: "wa-integration-1" },
    version: 2,
    scopes: ["messages.send", "templates.read"],
    notBefore: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    rotatedAt: "2026-10-01T00:00:00.000Z",
    status: "ACTIVE",
    secretHandle: HANDLE,
    ...overrides,
  };
}

function request(overrides: Partial<CredentialRequest> = {}): CredentialRequest {
  return {
    ref: "credref_whatsapp_sender_01",
    version: 2,
    tenantId: "t1",
    branchId: "b1",
    providerId: "whatsapp-cloud",
    subject: { kind: "EXTERNAL_INTEGRATION", id: "wa-integration-1" },
    capabilityId: "communications.reminder.send",
    requiredScopes: ["messages.send"],
    ...overrides,
  };
}

function world(b: CredentialBinding | null = binding()) {
  const now = { value: NOW };
  const vaultCalls: string[] = [];
  const retired = new Set<string>();
  const deps: CredentialDependencies = {
    clock: { now: () => now.value },
    bindings: { find: (ref) => (b !== null && b.ref === ref ? b : null) },
    vault: {
      resolve: (handle) => {
        vaultCalls.push(handle);
        return retired.has(handle) ? null : handle === HANDLE ? SECRET : null;
      },
    },
  };
  return { deps, now, vaultCalls, retired };
}

describe("AIF-02B allowed resolution", () => {
  it("resolves for the right scope and hands the secret only to use()", () => {
    const w = world();
    const { receipt, credential } = mediateCredential(request(), w.deps);
    assert.deepEqual([receipt.decision, receipt.reasons], ["ALLOW", ["CREDENTIAL_ALLOWED"]]);
    assert.ok(credential instanceof ResolvedCredential);
    assert.equal(credential?.use((secret) => secret.length), SECRET.length);
    assert.equal(receipt.leaseExpiresAt, new Date(Date.parse(NOW) + CREDENTIAL_LEASE_MS).toISOString());
    assert.deepEqual(w.vaultCalls, [HANDLE]);
  });

  it("lets a tenant-wide binding serve any branch of its tenant", () => {
    const w = world(binding({ branchId: null }));
    assert.equal(mediateCredential(request({ branchId: "b7" }), w.deps).receipt.decision, "ALLOW");
  });
});

describe("AIF-02B handoff denials", () => {
  const cases: [string, Partial<CredentialRequest>, Partial<CredentialBinding>, string][] = [
    ["wrong tenant", { tenantId: "t2" }, {}, "CREDENTIAL_CROSS_TENANT"],
    ["wrong branch", { branchId: "b2" }, {}, "CREDENTIAL_CROSS_BRANCH"],
    ["branch binding used tenant-wide", { branchId: null }, {}, "CREDENTIAL_CROSS_BRANCH"],
    ["expired", {}, { expiresAt: "2026-10-06T12:00:00.000Z" }, "CREDENTIAL_EXPIRED"],
    ["not yet valid", {}, { notBefore: "2026-10-07T00:00:00.000Z" }, "CREDENTIAL_NOT_YET_VALID"],
    ["revoked", {}, { status: "REVOKED" }, "CREDENTIAL_REVOKED"],
    ["provider mismatch", { providerId: "sms-gateway" }, {}, "CREDENTIAL_PROVIDER_MISMATCH"],
    ["insufficient scope", { requiredScopes: ["messages.send", "billing.charge"] }, {}, "CREDENTIAL_SCOPE_INSUFFICIENT"],
    ["unknown ref", { ref: "credref_unknown_ref" }, {}, "CREDENTIAL_UNKNOWN"],
    ["malformed ref", { ref: "sk_live_raw_secret_value" }, {}, "CREDENTIAL_REQUEST_INVALID"],
  ];
  for (const [label, requestOverrides, bindingOverrides, reason] of cases) {
    it(`denies ${label} and never touches the vault`, () => {
      const w = world(binding(bindingOverrides));
      const { receipt, credential } = mediateCredential(request(requestOverrides), w.deps);
      assert.deepEqual([receipt.decision, receipt.reasons, credential], ["DENY", [reason], null]);
      assert.deepEqual(w.vaultCalls, []);
    });
  }

  it("rotation invalidates the old binding, including a request racing the rotation", () => {
    const w = world();
    assert.deepEqual(mediateCredential(request({ version: 1 }), w.deps).receipt.reasons, ["CREDENTIAL_ROTATED"]);
    assert.deepEqual(w.vaultCalls, []);
    w.retired.add(HANDLE);
    const raced = mediateCredential(request(), w.deps);
    assert.deepEqual([raced.receipt.reasons, raced.credential], [["CREDENTIAL_ROTATED"], null]);
  });

  it("denies on a failing vault, bindings store or clock", () => {
    for (const broken of [
      { vault: { resolve: () => "UNAVAILABLE" as const } },
      { bindings: { find: () => { throw new Error("down"); } } },
      { clock: { now: () => "never" } },
    ] as Partial<CredentialDependencies>[]) {
      const w = world();
      const { receipt, credential } = mediateCredential(request(), { ...w.deps, ...broken });
      assert.deepEqual([receipt.reasons, credential], [["CREDENTIAL_DEPENDENCY_UNAVAILABLE"], null]);
    }
  });
});

describe("AIF-02B the secret never leaves the adapter boundary", () => {
  it("cannot be serialized, printed or returned", () => {
    const { credential } = mediateCredential(request(), world().deps);
    assert.ok(credential);
    assert.throws(() => JSON.stringify({ tool: "send", auth: credential }), CredentialError);
    assert.equal(String(credential), "[ResolvedCredential]");
    assert.ok(!inspect(credential).includes(SECRET));
    assert.ok(!inspect({ nested: credential }, { depth: 5 }).includes(SECRET));
    assert.throws(() => credential.use((secret) => secret), CredentialError);
    assert.throws(() => credential.use((secret) => ({ header: `Bearer ${secret}` })), CredentialError);
    assert.equal(credential.use((secret) => secret.startsWith("synthetic")), true);
  });

  it("expires with its lease and clears on dispose", () => {
    const w = world();
    const { credential } = mediateCredential(request(), w.deps);
    w.now.value = new Date(Date.parse(NOW) + CREDENTIAL_LEASE_MS).toISOString();
    assert.throws(() => credential?.use(() => 1), /lease expired/);
    const fresh = mediateCredential(request(), { ...w.deps, clock: { now: () => NOW } }).credential;
    fresh?.dispose();
    assert.throws(() => fresh?.use(() => 1), /disposed/);
  });

  it("keeps receipts, errors and health free of the value and the handle", () => {
    const w = world();
    const allowed = mediateCredential(request(), w.deps);
    const denied = mediateCredential(request({ tenantId: "t2" }), w.deps);
    const health = credentialHealth(binding(), NOW);
    for (const output of [allowed.receipt, denied.receipt, health]) {
      const text = JSON.stringify(output);
      assert.ok(!text.includes(SECRET) && !text.includes(HANDLE), text);
    }
    assert.throws(
      () => allowed.credential?.use((secret) => secret),
      (error: unknown) => error instanceof CredentialError && !error.message.includes(SECRET),
    );
    assert.deepEqual([health.state, health.version, health.daysToExpiry], ["HEALTHY", 2, 55]);
    assert.equal(credentialHealth(binding({ expiresAt: "2026-10-10T00:00:00.000Z" }), NOW).state, "EXPIRING");
    assert.equal(credentialHealth(binding({ status: "REVOKED" }), NOW).state, "REVOKED");
  });

  it("refuses a model or tool payload carrying a credential", () => {
    const { credential } = mediateCredential(request(), world().deps);
    assert.throws(() => assertSecretFreePayload({ to: "p-1", auth: credential }), CredentialError);
    assert.throws(() => assertSecretFreePayload({ headers: { Authorization: "x" } }), CredentialError);
    assert.throws(() => assertSecretFreePayload({ note: "use sk_live_abcdefghijklmnop" }), CredentialError);
    assert.throws(() => assertSecretFreePayload([{ api_key: "x" }]), CredentialError);
    // An opaque reference is metadata, not a secret.
    assertSecretFreePayload({ credentialRef: "credref_whatsapp_sender_01", body: "Your appointment is tomorrow." });
  });
});

describe("AIF-02B panel hardening", () => {
  it("binds the credential to its subject", () => {
    const w = world();
    const other = mediateCredential(request({ subject: { kind: "HUMAN_DELEGATE", id: "acct-doc-1" } }), w.deps);
    assert.deepEqual([other.receipt.reasons, other.credential, w.vaultCalls], [["CREDENTIAL_SUBJECT_MISMATCH"], null, []]);
  });

  it("fails the lease closed on a malformed or backwards clock", () => {
    const w = world();
    const { credential } = mediateCredential(request(), w.deps);
    w.now.value = "not-a-time";
    assert.throws(() => credential?.use(() => 1), /lease expired/);
    const v = world();
    const fresh = mediateCredential(request(), v.deps).credential;
    v.now.value = "2026-10-06T11:59:00.000Z";
    assert.throws(() => fresh?.use(() => 1), /lease expired/);
  });

  it("redacts adapter errors and refuses non-plain or secret-carrying results", async () => {
    const credential = mediateCredential(request(), world().deps).credential;
    assert.ok(credential);
    assert.throws(
      () => credential.use((secret) => { throw new Error(`boom ${secret}`); }),
      (error: unknown) => error instanceof CredentialError && error.message === "adapter failed" && !String(error.stack).includes(SECRET),
    );
    for (const leak of [
      (s: string) => Promise.resolve(s),
      (s: string) => () => s,
      (s: string) => new Map([["k", s]]),
      (s: string) => new Set([s]),
      (s: string) => Buffer.from(s),
      (s: string) => new Error(s),
      (s: string) => ({ [Symbol("x")]: s }),
      (s: string) => Buffer.from(s).toString("base64"),
      (s: string) => ({ deep: [{ value: `prefix-${s}` }] }),
    ]) {
      assert.throws(() => credential.use(leak as (s: string) => unknown), CredentialError);
    }
    assert.deepEqual(credential.use(() => ({ status: 202, accepted: true })), { status: 202, accepted: true });
    assert.equal(await credential.useAsync(async (s) => s.length), SECRET.length);
    await assert.rejects(() => credential.useAsync(async (s) => s), CredentialError);
    await assert.rejects(() => credential.useAsync(async (s) => { throw new Error(s); }), /adapter failed/);
  });

  it("names secret fields by words, not substrings", () => {
    for (const key of ["authToken", "sessionToken", "idToken", "pwd", "passphrase", "Set-Cookie", "signingKey", "accessKey", "X-Api-Key", "client_secret", "privateKey"]) {
      assert.throws(() => assertSecretFreePayload({ [key]: "x" }), CredentialError, key);
    }
    for (const key of ["credentialRef", "credentialsRef", "credentialId", "secretary", "bearerOf", "primaryKey", "monkey"]) {
      assertSecretFreePayload({ [key]: "x" });
    }
    assert.throws(() => assertSecretFreePayload({ body: Buffer.from("sk_live_abcdefghijklmnop") }), CredentialError);
    assert.throws(() => assertSecretFreePayload({ items: new Map() }), CredentialError);
  });

  it("validates binding fields and never echoes credential-shaped ids", () => {
    const stringScopes = world(binding({ scopes: "messages.send.extended" as unknown as string[] }));
    assert.deepEqual(mediateCredential(request(), stringScopes.deps).receipt.reasons, ["CREDENTIAL_DEPENDENCY_UNAVAILABLE"]);
    const leaked = mediateCredential(request({ capabilityId: "sk_live_abcdefghijklmnop" }), world().deps);
    assert.deepEqual([leaked.receipt.reasons, leaked.receipt.capabilityId], [["CREDENTIAL_REQUEST_INVALID"], null]);
    const throwing = Object.defineProperty(request(), "tenantId", { get: () => { throw new Error("trap"); } });
    assert.deepEqual(mediateCredential(throwing, world().deps).receipt.reasons, ["CREDENTIAL_REQUEST_INVALID"]);
  });

  it("reports every health state from metadata only", () => {
    assert.equal(credentialHealth(binding({ notBefore: "2026-10-07T00:00:00.000Z" }), NOW).state, "NOT_YET_VALID");
    assert.equal(credentialHealth(binding({ expiresAt: "2026-10-05T00:00:00.000Z" }), NOW).state, "EXPIRED");
    assert.equal(credentialHealth(binding({ expiresAt: "2026-13-45T00:00:00Z" }), NOW).state, "INVALID");
  });
});
