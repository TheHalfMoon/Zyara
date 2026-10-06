// AIF-02A synthetic qualification: the privacy and egress gate.
//
// Proves, with synthetic payloads only, the work packet's rules in order: classification comes
// from a server-held schema; credentials never leave; local-only classes never go remote and a
// fallback is never silent; providers are admitted per class, purpose and retention; consent is
// server-supplied and checked at server time; and minimization happens before a receipt that
// holds paths, classes, transforms and digests, never values.
import assert from "node:assert";
import { describe, it } from "node:test";
import type { ConsentGrant } from "@zyara/consent-boundaries";
import {
  REDACTED_VALUE,
  decideEgress,
  type EgressDependencies,
  type EgressPolicy,
  type EgressRequest,
  type PayloadSchema,
  type ProviderManifest,
} from "@zyara/privacy-egress";

const NOW = "2026-10-06T12:00:00.000Z";

const SCHEMA: PayloadSchema = {
  id: "reminder_payload",
  version: "1.0.0",
  fields: {
    clinicName: "PUBLIC",
    slotLabel: "INTERNAL",
    patientName: "PII",
    patientPhone: "PII",
    visitReason: "PHI",
    labNote: "PHI",
    apiToken: "CREDENTIAL",
  },
};

const POLICY: EgressPolicy = {
  id: "egress_reminders",
  version: "1.0.0",
  status: "ACTIVE",
  rules: {
    PUBLIC: { allowedProviders: ["llm-ksa", "llm-global", "local-model"], localOnly: false, minimization: "NONE", consentPurposeRequired: null, retentionMaxDays: 30, humanReview: false },
    INTERNAL: { allowedProviders: ["llm-ksa", "local-model"], localOnly: false, minimization: "NONE", consentPurposeRequired: null, retentionMaxDays: 30, humanReview: false },
    PII: { allowedProviders: ["llm-ksa", "local-model"], localOnly: false, minimization: "PSEUDONYMIZE", consentPurposeRequired: "recall", retentionMaxDays: 7, humanReview: false },
    PHI: { allowedProviders: ["local-model"], localOnly: true, minimization: "REDACT", consentPurposeRequired: "care", retentionMaxDays: 0, humanReview: true },
    CREDENTIAL: { allowedProviders: ["llm-ksa", "local-model"], localOnly: false, minimization: "NONE", consentPurposeRequired: null, retentionMaxDays: 30, humanReview: false },
  },
};

const PROVIDERS: Record<string, ProviderManifest> = {
  "llm-ksa": { providerId: "llm-ksa", version: "1", trustZone: "QUALIFIED_PROVIDER", dataClassCeiling: ["PUBLIC", "INTERNAL", "PII", "CREDENTIAL"], approvedPurposes: ["recall", "care"], retentionDays: 7, status: "ACTIVE" },
  "llm-global": { providerId: "llm-global", version: "1", trustZone: "EXTERNAL", dataClassCeiling: ["PUBLIC"], approvedPurposes: ["recall"], retentionDays: 30, status: "ACTIVE" },
  "local-model": { providerId: "local-model", version: "1", trustZone: "TENANT_DEVICE", dataClassCeiling: ["PUBLIC", "INTERNAL", "PII", "PHI"], approvedPurposes: ["care", "recall"], retentionDays: 0, status: "ACTIVE" },
};

const RECALL_CONSENT: ConsentGrant = { patientId: "p-1", purpose: "recall", granted: true, atUtc: "2026-09-01T00:00:00.000Z", revokedAtUtc: null };
const CARE_CONSENT: ConsentGrant = { patientId: "p-1", purpose: "care", granted: true, atUtc: "2026-09-01T00:00:00.000Z", revokedAtUtc: null };

async function deps(overrides: Partial<EgressDependencies> = {}): Promise<EgressDependencies> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("tenant-t1-synthetic-key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return {
    clock: { now: () => NOW },
    policies: { find: (ref) => (ref.id === POLICY.id && ref.version === POLICY.version ? POLICY : null) },
    schemas: { find: (ref) => (ref.id === SCHEMA.id && ref.version === SCHEMA.version ? SCHEMA : null) },
    providers: { find: (id) => PROVIDERS[id] ?? null },
    tenantKey: () => key,
    ...overrides,
  };
}

function request(overrides: Partial<EgressRequest> = {}): EgressRequest {
  return {
    tenantId: "t1",
    policy: { id: POLICY.id, version: POLICY.version },
    schema: { id: SCHEMA.id, version: SCHEMA.version },
    purpose: "recall",
    providerId: "llm-ksa",
    sourceZone: "ZYARA_CORE",
    subjectId: "p-1",
    payload: [
      { path: "clinicName", value: "Synthetic Clinic Riyadh" },
      { path: "slotLabel", value: "morning" },
      { path: "patientName", value: "Synthetic Patient" },
    ],
    consentGrants: [RECALL_CONSENT],
    fallbackFrom: null,
    ...overrides,
  };
}

describe("AIF-02A allowed egress", () => {
  it("allows an admitted provider, pseudonymizes PII and receipts only digests", async () => {
    const decision = await decideEgress(request(), await deps());
    assert.equal(decision.receipt.decision, "ALLOW");
    assert.deepEqual(decision.receipt.reasons, ["EGRESS_ALLOWED"]);
    const sentName = decision.payload?.find((field) => field.path === "patientName")?.value;
    assert.match(String(sentName), /^pseu_[0-9a-f]{32}$/);
    const text = JSON.stringify(decision.receipt);
    for (const value of ["Synthetic Patient", "Synthetic Clinic Riyadh", "morning", String(sentName)]) {
      assert.ok(!text.includes(value), `receipt leaked ${value}`);
    }
    assert.equal(decision.receipt.retentionDays, 7);
    assert.match(decision.receipt.receiptDigest, /^egr_[0-9a-f]{64}$/);
  });

  it("minimizes before the receipt: digests match what is actually sent", async () => {
    const decision = await decideEgress(
      request({ providerId: "local-model", purpose: "care", payload: [{ path: "visitReason", value: "synthetic chest pain" }, { path: "clinicName", value: "Synthetic Clinic" }], consentGrants: [CARE_CONSENT] }),
      await deps(),
    );
    assert.equal(decision.receipt.decision, "ALLOW");
    assert.equal(decision.payload?.find((field) => field.path === "visitReason")?.value, REDACTED_VALUE);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("tenant-t1-synthetic-key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = async (path: string, value: unknown) =>
      `hmac_${[...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`digest:${path}:${JSON.stringify(value)}`)))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
    const visit = decision.receipt.fields.find((field) => field.path === "visitReason");
    assert.deepEqual([visit?.transform, visit?.sentDigest], ["REDACT", await digest("visitReason", REDACTED_VALUE)]);
    assert.ok(!JSON.stringify(decision.receipt).includes("chest pain"));
    assert.equal(decision.receipt.humanReview, true);
  });

  it("is deterministic and keys pseudonyms per tenant", async () => {
    const a = await decideEgress(request(), await deps());
    const b = await decideEgress(request(), await deps());
    assert.equal(a.receipt.receiptDigest, b.receipt.receiptDigest);
    const otherKey = await crypto.subtle.importKey("raw", new TextEncoder().encode("tenant-t2-synthetic-key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const c = await decideEgress(request(), await deps({ tenantKey: () => otherKey }));
    const name = (decision: typeof a) => decision.payload?.find((field) => field.path === "patientName")?.value;
    assert.equal(name(a), name(b));
    assert.notEqual(name(a), name(c));
  });
});

describe("AIF-02A handoff denials", () => {
  it("denies PHI to an unapproved provider", async () => {
    const remote = await decideEgress(request({ purpose: "care", payload: [{ path: "visitReason", value: "x" }], consentGrants: [CARE_CONSENT] }), await deps());
    assert.deepEqual([remote.receipt.decision, remote.payload], ["DENY", null]);
    // PHI is local-only, so a remote provider is refused before its class ceiling is reached.
    assert.deepEqual(remote.receipt.reasons, ["EGRESS_LOCAL_ONLY"]);
    const relaxed: EgressPolicy = { ...POLICY, rules: { ...POLICY.rules, PHI: { ...POLICY.rules.PHI!, localOnly: false, allowedProviders: ["llm-ksa", "local-model"] } } };
    const ceiling = await decideEgress(
      request({ purpose: "care", payload: [{ path: "visitReason", value: "x" }], consentGrants: [CARE_CONSENT] }),
      await deps({ policies: { find: () => relaxed } }),
    );
    assert.deepEqual(ceiling.receipt.reasons, ["EGRESS_PROVIDER_NOT_APPROVED_FOR_CLASS"]);
  });

  it("never falls back silently to the cloud", async () => {
    const fallback = await decideEgress(
      request({ purpose: "care", payload: [{ path: "labNote", value: "x" }], consentGrants: [CARE_CONSENT], fallbackFrom: "local-model" }),
      await deps(),
    );
    assert.deepEqual([fallback.receipt.decision, fallback.receipt.reasons, fallback.receipt.fallback], ["DENY", ["EGRESS_NO_SILENT_CLOUD_FALLBACK"], true]);
  });

  it("denies a missing purpose", async () => {
    const decision = await decideEgress(request({ purpose: null }), await deps());
    assert.deepEqual(decision.receipt.reasons, ["EGRESS_PURPOSE_REQUIRED"]);
  });

  it("denies revoked or missing consent, and consent for another purpose", async () => {
    const revoked = { ...RECALL_CONSENT, revokedAtUtc: "2026-10-01T00:00:00.000Z" };
    assert.deepEqual((await decideEgress(request({ consentGrants: [revoked] }), await deps())).receipt.reasons, ["EGRESS_CONSENT_REQUIRED"]);
    assert.deepEqual((await decideEgress(request({ consentGrants: [] }), await deps())).receipt.reasons, ["EGRESS_CONSENT_REQUIRED"]);
    assert.deepEqual((await decideEgress(request({ consentGrants: [CARE_CONSENT] }), await deps())).receipt.reasons, ["EGRESS_CONSENT_REQUIRED"]);
  });

  it("refuses a local-only class at a remote provider", async () => {
    const decision = await decideEgress(request({ purpose: "care", payload: [{ path: "labNote", value: "x" }], consentGrants: [CARE_CONSENT] }), await deps());
    assert.deepEqual(decision.receipt.reasons, ["EGRESS_LOCAL_ONLY"]);
  });

  it("never logs source values in a denial receipt", async () => {
    const decision = await decideEgress(request({ consentGrants: [] }), await deps());
    const text = JSON.stringify(decision.receipt);
    assert.ok(!text.includes("Synthetic Patient") && !text.includes("Synthetic Clinic Riyadh"));
    assert.ok(decision.receipt.fields.every((field) => field.sentDigest === null));
  });
});

describe("AIF-02A credential and classification rules", () => {
  it("refuses a credential field even when the policy maps the class, and any credential-shaped value", async () => {
    const field = await decideEgress(request({ payload: [{ path: "apiToken", value: "opaque" }] }), await deps());
    assert.deepEqual(field.receipt.reasons, ["EGRESS_CREDENTIAL_REFUSED"]);
    const shaped = await decideEgress(request({ payload: [{ path: "slotLabel", value: "use Bearer abc.def.ghi please" }] }), await deps());
    assert.deepEqual(shaped.receipt.reasons, ["EGRESS_CREDENTIAL_REFUSED"]);
    const long = await decideEgress(request({ payload: [{ path: "slotLabel", value: `${"x".repeat(3000)} sk-live_abcdefghijklmnop` }] }), await deps());
    assert.deepEqual(long.receipt.reasons, ["EGRESS_CREDENTIAL_REFUSED"]);
    // Ordinary words about credentials are not credential shapes.
    const prose = await decideEgress(request({ payload: [{ path: "slotLabel", value: "reset your password at the desk" }] }), await deps());
    assert.equal(prose.receipt.decision, "ALLOW");
  });

  it("takes classes only from the schema and refuses unlisted, nested and oversized fields", async () => {
    const unlisted = await decideEgress(request({ payload: [{ path: "freeText", value: "x" }] }), await deps());
    assert.deepEqual(unlisted.receipt.reasons, ["EGRESS_FIELD_UNCLASSIFIED"]);
    const nested = await decideEgress(request({ payload: [{ path: "clinicName", value: { name: "x" } as unknown as string }] }), await deps());
    assert.deepEqual(nested.receipt.reasons, ["EGRESS_PAYLOAD_INVALID"]);
    const many = await decideEgress(request({ payload: Array.from({ length: 257 }, (_, i) => ({ path: `clinicName${i}`, value: "x" })) }), await deps());
    assert.deepEqual(many.receipt.reasons, ["EGRESS_PAYLOAD_INVALID"]);
    const big = await decideEgress(request({ payload: [{ path: "clinicName", value: "x".repeat(8193) }] }), await deps());
    assert.deepEqual(big.receipt.reasons, ["EGRESS_PAYLOAD_INVALID"]);
    const dup = await decideEgress(request({ payload: [{ path: "clinicName", value: "a" }, { path: "clinicName", value: "b" }] }), await deps());
    assert.deepEqual(dup.receipt.reasons, ["EGRESS_PAYLOAD_INVALID"]);
    const unknownSchema = await decideEgress(request({ schema: { id: "reminder_payload", version: "9.9.9" } }), await deps());
    assert.deepEqual(unknownSchema.receipt.reasons, ["EGRESS_SCHEMA_UNKNOWN"]);
  });

  it("refuses an identifier-shaped value in a PUBLIC or INTERNAL field", async () => {
    for (const value of ["call +966 50 123 4567", "1012345678", "someone@example.test"]) {
      const decision = await decideEgress(request({ payload: [{ path: "clinicName", value }] }), await deps());
      assert.deepEqual(decision.receipt.reasons, ["EGRESS_CLASSIFICATION_SUSPECT"], value);
    }
  });
});

describe("AIF-02A provider, policy and retention", () => {
  it("denies an unknown or revoked policy and provider, an unmapped class and an unapproved purpose", async () => {
    assert.deepEqual((await decideEgress(request({ policy: { id: "egress_reminders", version: "2.0.0" } }), await deps())).receipt.reasons, ["EGRESS_POLICY_UNKNOWN"]);
    assert.deepEqual((await decideEgress(request(), await deps({ policies: { find: () => ({ ...POLICY, status: "REVOKED" }) } }))).receipt.reasons, ["EGRESS_POLICY_UNKNOWN"]);
    assert.deepEqual((await decideEgress(request({ providerId: "nobody" }), await deps())).receipt.reasons, ["EGRESS_PROVIDER_UNKNOWN"]);
    assert.deepEqual(
      (await decideEgress(request(), await deps({ providers: { find: (id) => ({ ...PROVIDERS[id], status: "REVOKED" }) } }))).receipt.reasons,
      ["EGRESS_PROVIDER_UNKNOWN"],
    );
    const noPii: EgressPolicy = { ...POLICY, rules: { PUBLIC: POLICY.rules.PUBLIC, INTERNAL: POLICY.rules.INTERNAL } };
    assert.deepEqual((await decideEgress(request(), await deps({ policies: { find: () => noPii } }))).receipt.reasons, ["EGRESS_CLASS_UNMAPPED"]);
    assert.deepEqual(
      (await decideEgress(request({ providerId: "llm-global", purpose: "care", payload: [{ path: "clinicName", value: "x" }] }), await deps())).receipt.reasons,
      ["EGRESS_PURPOSE_NOT_APPROVED"],
    );
  });

  it("denies a provider that retains data longer than a class allows", async () => {
    const decision = await decideEgress(request({ providerId: "llm-global", payload: [{ path: "clinicName", value: "x" }, { path: "slotLabel", value: "y" }] }), await deps());
    // INTERNAL is not allowed at llm-global at all; check retention with PUBLIC only and a tighter cap.
    assert.equal(decision.receipt.decision, "DENY");
    const tight: EgressPolicy = { ...POLICY, rules: { ...POLICY.rules, PUBLIC: { ...POLICY.rules.PUBLIC!, retentionMaxDays: 7 } } };
    const retained = await decideEgress(request({ providerId: "llm-global", payload: [{ path: "clinicName", value: "x" }] }), await deps({ policies: { find: () => tight } }));
    assert.deepEqual(retained.receipt.reasons, ["EGRESS_RETENTION_EXCEEDED"]);
  });

  it("denies on any unavailable dependency, including the clock and the pseudonym key", async () => {
    for (const broken of [
      { clock: { now: () => "never" } },
      { policies: { find: () => "UNAVAILABLE" as const } },
      { providers: { find: () => { throw new Error("down"); } } },
      { tenantKey: () => "UNAVAILABLE" as const },
    ] as Partial<EgressDependencies>[]) {
      const decision = await decideEgress(request(), await deps(broken));
      assert.deepEqual([decision.receipt.decision, decision.receipt.reasons, decision.payload], ["DENY", ["EGRESS_DEPENDENCY_UNAVAILABLE"], null]);
    }
  });
});

describe("AIF-02A panel hardening", () => {
  it("counts only the data subject's own consent", async () => {
    const otherPatient = { ...RECALL_CONSENT, patientId: "p-2" };
    assert.deepEqual((await decideEgress(request({ consentGrants: [otherPatient] }), await deps())).receipt.reasons, ["EGRESS_CONSENT_REQUIRED"]);
    assert.deepEqual((await decideEgress(request({ subjectId: null }), await deps())).receipt.reasons, ["EGRESS_CONSENT_REQUIRED"]);
  });

  it("compares consent instants, not strings, and refuses malformed grant times", async () => {
    // Revoked at 11:59:59Z; now is 12:00:00.000Z. A string compare of mixed formats could misorder these.
    const revoked = { ...RECALL_CONSENT, revokedAtUtc: "2026-10-06T11:59:59Z" };
    assert.deepEqual((await decideEgress(request({ consentGrants: [revoked] }), await deps())).receipt.reasons, ["EGRESS_CONSENT_REQUIRED"]);
    const offset = { ...RECALL_CONSENT, atUtc: "2026-09-01T00:00:00+03:00" };
    assert.deepEqual((await decideEgress(request({ consentGrants: [offset] }), await deps())).receipt.reasons, ["EGRESS_CONSENT_REQUIRED"]);
  });

  it("reads the request once, so a getter cannot swap a field between checks", async () => {
    let reads = 0;
    const tricky = request({ payload: [] });
    Object.defineProperty(tricky, "payload", {
      enumerable: true,
      get: () => (reads++ === 0 ? [{ path: "clinicName", value: "Synthetic Clinic" }] : [{ path: "visitReason", value: "secret diagnosis" }]),
    });
    const decision = await decideEgress(tricky, await deps());
    assert.equal(reads, 1);
    assert.equal(decision.receipt.decision, "ALLOW");
    assert.deepEqual(decision.payload?.map((field) => field.path), ["clinicName"]);
  });

  it("drops a DROP field from the payload and records no digest for it", async () => {
    const dropPolicy: EgressPolicy = { ...POLICY, rules: { ...POLICY.rules, INTERNAL: { ...POLICY.rules.INTERNAL!, minimization: "DROP" } } };
    const decision = await decideEgress(request(), await deps({ policies: { find: () => dropPolicy } }));
    assert.equal(decision.receipt.decision, "ALLOW");
    assert.ok(!decision.payload?.some((field) => field.path === "slotLabel"));
    const slot = decision.receipt.fields.find((field) => field.path === "slotLabel");
    assert.deepEqual([slot?.transform, slot?.sentDigest], ["DROP", null]);
  });

  it("keeps the tenant key and raw values out of receipts; digests are keyed", async () => {
    const decision = await decideEgress(request({ payload: [{ path: "clinicName", value: "Synthetic Clinic" }] }), await deps());
    const text = JSON.stringify(decision.receipt);
    assert.ok(!text.includes("tenant-t1-synthetic-key") && !text.includes("Synthetic Clinic"));
    assert.match(String(decision.receipt.fields[0].sentDigest), /^hmac_[0-9a-f]{64}$/);
  });

  it("records the asked destination, purpose and zones even on an early denial", async () => {
    const decision = await decideEgress(request({ policy: { id: "egress_reminders", version: "9.9.9" } }), await deps());
    assert.deepEqual(
      [decision.receipt.providerId, decision.receipt.purpose, decision.receipt.sourceZone, decision.receipt.policy?.version],
      ["llm-ksa", "recall", "ZYARA_CORE", "9.9.9"],
    );
    const free = await decideEgress(request({ purpose: "marketing campaign" as unknown as "recall" }), await deps());
    assert.equal(free.receipt.purpose, null);
    const allowed = await decideEgress(request(), await deps());
    assert.deepEqual([allowed.receipt.sourceZone, allowed.receipt.destinationZone], ["ZYARA_CORE", "QUALIFIED_PROVIDER"]);
  });

  it("denies an unknown transform, malformed retention, an invalid source zone and a long JWT", async () => {
    const weird: EgressPolicy = { ...POLICY, rules: { ...POLICY.rules, PUBLIC: { ...POLICY.rules.PUBLIC!, minimization: "ENCRYPT" as unknown as "NONE" } } };
    assert.deepEqual((await decideEgress(request(), await deps({ policies: { find: () => weird } }))).receipt.reasons, ["EGRESS_DEPENDENCY_UNAVAILABLE"]);
    const nanRetention = { ...PROVIDERS["llm-ksa"], retentionDays: Number.NaN };
    assert.deepEqual((await decideEgress(request(), await deps({ providers: { find: () => nanRetention } }))).receipt.reasons, ["EGRESS_RETENTION_EXCEEDED"]);
    assert.deepEqual((await decideEgress(request({ sourceZone: "MARS" as unknown as "ZYARA_CORE" }), await deps())).receipt.reasons, ["EGRESS_PAYLOAD_INVALID"]);
    const jwt = `eyJhbGciOiJIUzI1NiJ9.eyJ${"a".repeat(1200)}.signature`;
    assert.deepEqual((await decideEgress(request({ payload: [{ path: "slotLabel", value: jwt }] }), await deps())).receipt.reasons, ["EGRESS_CREDENTIAL_REFUSED"]);
  });
});

describe("AIF-02A delta-1 hardening", () => {
  it("denies a non-object request instead of throwing", async () => {
    for (const bad of [null, undefined, 5, "x", []]) {
      const decision = await decideEgress(bad as unknown as EgressRequest, await deps());
      assert.deepEqual([decision.receipt.decision, decision.receipt.reasons, decision.payload], ["DENY", ["EGRESS_PAYLOAD_INVALID"], null]);
    }
  });

  it("denies a non-finite number instead of sending it as null", async () => {
    const decision = await decideEgress(request({ payload: [{ path: "slotLabel", value: Number.NaN }] }), await deps());
    assert.deepEqual([decision.receipt.decision, decision.payload], ["DENY", null]);
  });

  it("never echoes an identifier-shaped provider or policy id into a receipt", async () => {
    const decision = await decideEgress(request({ providerId: "0501234567", policy: { id: "1012345678", version: "1.0.0" } }), await deps());
    assert.equal(decision.receipt.decision, "DENY");
    assert.deepEqual([decision.receipt.providerId, decision.receipt.policy], [null, null]);
    assert.ok(!JSON.stringify(decision.receipt).includes("0501234567"));
  });

  it("binds a pseudonym to its field path", async () => {
    const decision = await decideEgress(
      request({ payload: [{ path: "patientName", value: "Same Value" }, { path: "patientPhone", value: "Same Value" }] }),
      await deps(),
    );
    assert.equal(decision.receipt.decision, "ALLOW");
    const [name, phone] = ["patientName", "patientPhone"].map((path) => decision.payload?.find((field) => field.path === path)?.value);
    assert.notEqual(name, phone);
  });
});
