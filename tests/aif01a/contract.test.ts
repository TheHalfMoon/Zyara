// AIF-01A synthetic qualification: the capability contract.
//
// Proves, without any provider, model, browser, secret store or database:
//   * only a trusted registration authority can admit a capability, and an admitted
//     (id, version) is immutable, digested and never re-registered;
//   * a lookup that names an unknown capability, another version or another digest is denied;
//   * writes cannot be observe/draft, and need idempotency and verification; a write may only
//     retry when the provider itself enforces idempotency;
//   * credentials are opaque references only, and a secret-looking value anywhere is refused;
//   * data classes are closed, credentials are never capability data, and signing data is
//     human-only;
//   * A5 and reserved namespaces stay out of agents' reach, and grants or invocations can only
//     narrow tenant/branch scope;
//   * an UNKNOWN external outcome can never be recorded as verified.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAPABILITY_AUTHORITY_CLASSES,
  CAPABILITY_DATA_CLASSES,
  CapabilityContractError,
  CapabilityContractRegistry,
  checkInvocationScope,
  digestCapabilityDefinition,
  validateCapabilityDefinition,
  validateGrant,
  validateInvocation,
  validateReceipt,
  type CapabilityDefinition,
  type CapabilityGrant,
  type CapabilityInvocation,
  type CapabilityRegistrar,
  type InvocationReceipt,
} from "@zyara/capability-gateway";

const RELEASE: CapabilityRegistrar = { kind: "system", principal: "release_pipeline", id: "ci-release" };
const ADMIN: CapabilityRegistrar = { kind: "human", authority: "platform_admin", id: "acct-admin-1" };
const HEX = "a".repeat(64);
const PARAMS = `params_${"b".repeat(64)}`;

function readDefinition(overrides: Partial<CapabilityDefinition> = {}): CapabilityDefinition {
  return {
    id: "reporting.metrics.read",
    version: "1.0.0",
    ownerDomain: "reporting",
    inputSchema: { id: "reporting.metrics.read.input", version: "1.0.0", digest: `schema_${HEX}` },
    outputSchema: { id: "reporting.metrics.read.output", version: "1.0.0", digest: `schema_${HEX}` },
    readOrWrite: "read",
    riskClass: "routine",
    authorityClass: "A0_OBSERVE",
    dataClasses: ["INTERNAL"],
    tenantScope: "SINGLE_TENANT",
    branchScope: "TENANT_WIDE",
    consentPurpose: "NOT_REQUIRED",
    credentialBinding: { kind: "none" },
    egressPolicy: "egress_internal_only",
    idempotency: { mode: "NOT_APPLICABLE", enforcedBy: "NONE" },
    timeoutMs: 5000,
    retry: { maxAttempts: 2, retryOn: "TRANSIENT_ONLY" },
    dryRunSupport: false,
    verification: { receiptKind: "read_result", method: "NONE_READ_ONLY", onUnknownOutcome: "RECONCILE" },
    observability: "METADATA_ONLY",
    ...overrides,
  };
}

function writeDefinition(overrides: Partial<CapabilityDefinition> = {}): CapabilityDefinition {
  return readDefinition({
    id: "communications.reminder.send",
    ownerDomain: "communications",
    inputSchema: { id: "communications.reminder.send.input", version: "1.0.0", digest: `schema_${HEX}` },
    outputSchema: { id: "communications.reminder.send.output", version: "1.0.0", digest: `schema_${HEX}` },
    readOrWrite: "write",
    riskClass: "elevated",
    authorityClass: "A3_EXECUTE_LOW",
    dataClasses: ["PII", "PHI"],
    branchScope: "BRANCH",
    consentPurpose: "recall",
    credentialBinding: { kind: "ref", ref: "credref_whatsapp_sender_01" },
    egressPolicy: "egress_messaging_provider",
    idempotency: { mode: "CALLER_KEY", enforcedBy: "PROVIDER" },
    retry: { maxAttempts: 3, retryOn: "TRANSIENT_ONLY" },
    verification: { receiptKind: "message_receipt", method: "PROVIDER_RECEIPT", onUnknownOutcome: "RECONCILE" },
    ...overrides,
  });
}

function code(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof CapabilityContractError, `expected CapabilityContractError, got ${String(error)}`);
    return error.code;
  }
  assert.fail("expected the call to be refused");
}

async function asyncCode(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    assert.ok(error instanceof CapabilityContractError, `expected CapabilityContractError, got ${String(error)}`);
    return error.code;
  }
  assert.fail("expected the call to be refused");
}

function agentGrant(overrides: Partial<CapabilityGrant> = {}): CapabilityGrant {
  return {
    grantee: { kind: "agent", id: "agent-ops-1" },
    tenantId: "tenant-a",
    branchId: "branch-1",
    capabilityId: "communications.reminder.send",
    version: "1.0.0",
    ...overrides,
  };
}

function invocation(digest: string, overrides: Partial<CapabilityInvocation> = {}): CapabilityInvocation {
  return {
    capabilityId: "communications.reminder.send",
    version: "1.0.0",
    definitionDigest: digest,
    tenantId: "tenant-a",
    branchId: "branch-1",
    actor: { kind: "agent", id: "agent-ops-1" },
    parametersDigest: PARAMS,
    correlationId: "corr-0001",
    idempotencyKey: "idem-0001",
    requestedAt: "2026-10-06T12:00:00.000Z",
    ...overrides,
  };
}

describe("AIF-01A closed vocabularies", () => {
  it("authority classes are exactly A0..A5", () => {
    assert.deepEqual(
      [...CAPABILITY_AUTHORITY_CLASSES],
      ["A0_OBSERVE", "A1_DRAFT", "A2_PREPARE", "A3_EXECUTE_LOW", "A4_EXECUTE_MED", "A5_HUMAN_ONLY"],
    );
  });

  it("data classes are the AIF §4.2 classes", () => {
    assert.deepEqual(
      [...CAPABILITY_DATA_CLASSES],
      ["PUBLIC", "INTERNAL", "PII", "PHI", "FINANCIAL", "CREDENTIAL", "SECURITY_SENSITIVE", "CLINICAL_SIGNING_REQUIRED"],
    );
  });
});

describe("AIF-01A definition validation", () => {
  it("accepts a well-formed read and a well-formed write", () => {
    assert.equal(validateCapabilityDefinition(readDefinition()).id, "reporting.metrics.read");
    assert.equal(validateCapabilityDefinition(writeDefinition()).readOrWrite, "write");
  });

  it("rejects a write registered as A0 or A1", () => {
    assert.equal(code(() => validateCapabilityDefinition(writeDefinition({ authorityClass: "A0_OBSERVE" }))), "CAPABILITY_WRITE_AUTHORITY_TOO_LOW");
    assert.equal(code(() => validateCapabilityDefinition(writeDefinition({ authorityClass: "A1_DRAFT" }))), "CAPABILITY_WRITE_AUTHORITY_TOO_LOW");
  });

  it("rejects a write without an idempotency contract", () => {
    assert.equal(
      code(() => validateCapabilityDefinition(writeDefinition({ idempotency: { mode: "NOT_APPLICABLE", enforcedBy: "NONE" } }))),
      "CAPABILITY_WRITE_IDEMPOTENCY_REQUIRED",
    );
  });

  it("rejects a write without a verification method", () => {
    assert.equal(
      code(() =>
        validateCapabilityDefinition(
          writeDefinition({ verification: { receiptKind: "none", method: "NONE_READ_ONLY", onUnknownOutcome: "RECONCILE" } }),
        ),
      ),
      "CAPABILITY_WRITE_VERIFICATION_REQUIRED",
    );
  });

  it("allows a write to retry only when the provider enforces idempotency", () => {
    assert.equal(
      code(() => validateCapabilityDefinition(writeDefinition({ idempotency: { mode: "CALLER_KEY", enforcedBy: "ZYARA_LEDGER" } }))),
      "CAPABILITY_WRITE_RETRY_UNSAFE",
    );
    const single = writeDefinition({
      idempotency: { mode: "CALLER_KEY", enforcedBy: "ZYARA_LEDGER" },
      retry: { maxAttempts: 1, retryOn: "TRANSIENT_ONLY" },
    });
    assert.equal(validateCapabilityDefinition(single).retry.maxAttempts, 1);
  });

  it("rejects an idempotency mode that names no enforcer, and a read that claims one", () => {
    assert.equal(
      code(() => validateCapabilityDefinition(writeDefinition({ idempotency: { mode: "CALLER_KEY", enforcedBy: "NONE" } }))),
      "CAPABILITY_IDEMPOTENCY_INVALID",
    );
    assert.equal(
      code(() => validateCapabilityDefinition(readDefinition({ idempotency: { mode: "NOT_APPLICABLE", enforcedBy: "PROVIDER" } }))),
      "CAPABILITY_IDEMPOTENCY_INVALID",
    );
  });

  it("rejects unsupported data classes, credentials as data, and empty data classes", () => {
    assert.equal(
      code(() => validateCapabilityDefinition(readDefinition({ dataClasses: ["GENOMIC" as never] }))),
      "CAPABILITY_DATA_CLASS_UNSUPPORTED",
    );
    assert.equal(
      code(() => validateCapabilityDefinition(readDefinition({ dataClasses: ["INTERNAL", "CREDENTIAL"] }))),
      "CAPABILITY_CREDENTIAL_AS_DATA",
    );
    assert.equal(code(() => validateCapabilityDefinition(readDefinition({ dataClasses: [] }))), "CAPABILITY_DATA_CLASS_UNSUPPORTED");
  });

  it("requires A5 for clinical-signing data", () => {
    assert.equal(
      code(() => validateCapabilityDefinition(writeDefinition({ dataClasses: ["PHI", "CLINICAL_SIGNING_REQUIRED"], consentPurpose: "care" }))),
      "CAPABILITY_SIGNING_REQUIRES_HUMAN",
    );
    const signing = writeDefinition({
      id: "prescription.order.sign",
      dataClasses: ["PHI", "CLINICAL_SIGNING_REQUIRED"],
      consentPurpose: "care",
      authorityClass: "A5_HUMAN_ONLY",
      riskClass: "critical",
    });
    assert.equal(validateCapabilityDefinition(signing).authorityClass, "A5_HUMAN_ONLY");
  });

  it("allows NOT_REQUIRED consent only for public or internal data", () => {
    assert.equal(
      code(() => validateCapabilityDefinition(writeDefinition({ consentPurpose: "NOT_REQUIRED" }))),
      "CAPABILITY_CONSENT_PURPOSE_REQUIRED",
    );
    assert.equal(
      code(() => validateCapabilityDefinition(readDefinition({ consentPurpose: "marketing" as never }))),
      "CAPABILITY_CONSENT_PURPOSE_UNSUPPORTED",
    );
  });

  it("rejects plaintext credentials and secret-looking values anywhere in the definition", () => {
    assert.equal(
      code(() => validateCapabilityDefinition(writeDefinition({ credentialBinding: { kind: "ref", ref: "sk-live-4f9a8b7c6d5e4f3a2b1c" } }))),
      "CAPABILITY_CREDENTIAL_PLAINTEXT",
    );
    assert.equal(
      code(() =>
        validateCapabilityDefinition(writeDefinition({ credentialBinding: { kind: "inline", secret: "hunter2" } as never })),
      ),
      "CAPABILITY_CREDENTIAL_PLAINTEXT",
    );
    assert.equal(
      code(() => validateCapabilityDefinition(readDefinition({ ownerDomain: "Bearer eyJhbGciOiJIUzI1NiJ9.e30.abc" }))),
      "CAPABILITY_CREDENTIAL_PLAINTEXT",
    );
    assert.equal(
      code(() =>
        validateCapabilityDefinition({ ...readDefinition(), apiKey: "x" } as unknown as CapabilityDefinition),
      ),
      "CAPABILITY_FIELD_UNKNOWN",
    );
  });

  it("rejects malformed ids, versions, schema references and bounds", () => {
    assert.equal(code(() => validateCapabilityDefinition(readDefinition({ id: "reporting.*" }))), "CAPABILITY_ID_INVALID");
    assert.equal(code(() => validateCapabilityDefinition(readDefinition({ id: "reporting" }))), "CAPABILITY_ID_INVALID");
    assert.equal(code(() => validateCapabilityDefinition(readDefinition({ version: "1.0" }))), "CAPABILITY_VERSION_INVALID");
    assert.equal(
      code(() => validateCapabilityDefinition(readDefinition({ inputSchema: { id: "x.y", version: "1.0.0", digest: "md5_00" } }))),
      "CAPABILITY_SCHEMA_REF_INVALID",
    );
    assert.equal(code(() => validateCapabilityDefinition(readDefinition({ timeoutMs: 0 }))), "CAPABILITY_TIMEOUT_INVALID");
    assert.equal(
      code(() => validateCapabilityDefinition(readDefinition({ retry: { maxAttempts: 9, retryOn: "TRANSIENT_ONLY" } }))),
      "CAPABILITY_RETRY_INVALID",
    );
    assert.equal(code(() => validateCapabilityDefinition(readDefinition({ egressPolicy: "anywhere" }))), "CAPABILITY_EGRESS_POLICY_INVALID");
    assert.equal(
      code(() => validateCapabilityDefinition(readDefinition({ tenantScope: "CROSS_TENANT" as never }))),
      "CAPABILITY_SCOPE_INVALID",
    );
    assert.equal(
      code(() => validateCapabilityDefinition(readDefinition({ observability: "FULL_PAYLOAD" as never }))),
      "CAPABILITY_OBSERVABILITY_INVALID",
    );
  });
});

describe("AIF-01A registration and lookup", () => {
  it("admits a definition from a trusted authority and digests it deterministically", async () => {
    const registry = new CapabilityContractRegistry();
    const admitted = await registry.register(readDefinition(), RELEASE);
    assert.match(admitted.digest, /^cap_[0-9a-f]{64}$/);
    assert.equal(admitted.digest, await digestCapabilityDefinition(readDefinition()));
    const reordered = Object.fromEntries(Object.entries(readDefinition()).reverse()) as unknown as CapabilityDefinition;
    assert.equal(await digestCapabilityDefinition(reordered), admitted.digest);
    assert.notEqual(await digestCapabilityDefinition(readDefinition({ timeoutMs: 6000 })), admitted.digest);
    assert.deepEqual(admitted.registeredBy, RELEASE);
    await registry.register(writeDefinition(), ADMIN);
    assert.equal(registry.list().length, 2);
  });

  it("refuses agent self-registration and untrusted registrars", async () => {
    const registry = new CapabilityContractRegistry();
    assert.equal(
      await asyncCode(() => registry.register(readDefinition(), { kind: "agent", id: "agent-ops-1" } as never)),
      "CAPABILITY_REGISTRAR_UNTRUSTED",
    );
    assert.equal(
      await asyncCode(() => registry.register(readDefinition(), { kind: "human", authority: "branch_admin", id: "x" } as never)),
      "CAPABILITY_REGISTRAR_UNTRUSTED",
    );
    assert.equal(registry.list().length, 0);
  });

  it("rejects a duplicate (id, version) even with identical content", async () => {
    const registry = new CapabilityContractRegistry();
    await registry.register(readDefinition(), RELEASE);
    assert.equal(await asyncCode(() => registry.register(readDefinition(), RELEASE)), "CAPABILITY_VERSION_DUPLICATE");
    assert.equal(
      await asyncCode(() => registry.register(readDefinition({ timeoutMs: 9000 }), RELEASE)),
      "CAPABILITY_VERSION_DUPLICATE",
    );
    await registry.register(readDefinition({ version: "1.1.0" }), RELEASE);
    assert.equal(registry.list().length, 2);
  });

  it("denies unknown capabilities, other versions and other digests", async () => {
    const registry = new CapabilityContractRegistry();
    const admitted = await registry.register(readDefinition(), RELEASE);
    const ref = { capabilityId: admitted.definition.id, version: "1.0.0", definitionDigest: admitted.digest };
    assert.equal(registry.resolve(ref).digest, admitted.digest);
    assert.equal(code(() => registry.resolve({ ...ref, capabilityId: "reporting.metrics.export" })), "CAPABILITY_UNKNOWN");
    assert.equal(code(() => registry.resolve({ ...ref, version: "2.0.0" })), "CAPABILITY_VERSION_MISMATCH");
    assert.equal(code(() => registry.resolve({ ...ref, definitionDigest: `cap_${"0".repeat(64)}` })), "CAPABILITY_DIGEST_MISMATCH");
  });

  it("keeps an admitted definition immutable, including against the caller's own object", async () => {
    const registry = new CapabilityContractRegistry();
    const input = writeDefinition();
    const admitted = await registry.register(input, RELEASE);
    input.authorityClass = "A0_OBSERVE";
    (input.dataClasses as string[]).push("PUBLIC");
    assert.equal(admitted.definition.authorityClass, "A3_EXECUTE_LOW");
    assert.deepEqual([...admitted.definition.dataClasses], ["PII", "PHI"]);
    assert.throws(() => {
      (admitted.definition as { authorityClass: string }).authorityClass = "A5_HUMAN_ONLY";
    }, TypeError);
    assert.throws(() => {
      (admitted.definition.verification as { method: string }).method = "NONE_READ_ONLY";
    }, TypeError);
    const ref = { capabilityId: input.id, version: input.version, definitionDigest: admitted.digest };
    assert.equal(registry.resolve(ref).definition.authorityClass, "A3_EXECUTE_LOW");
  });
});

describe("AIF-01A grants and invocation scope", () => {
  it("never grants A5 to an agent, but allows it to a human role", async () => {
    const registry = new CapabilityContractRegistry();
    const signing = await registry.register(
      writeDefinition({
        id: "prescription.order.sign",
        dataClasses: ["PHI", "CLINICAL_SIGNING_REQUIRED"],
        consentPurpose: "care",
        authorityClass: "A5_HUMAN_ONLY",
        riskClass: "critical",
      }),
      RELEASE,
    );
    assert.equal(
      code(() => validateGrant(signing, agentGrant({ capabilityId: "prescription.order.sign" }))),
      "CAPABILITY_HUMAN_ONLY",
    );
    validateGrant(signing, agentGrant({ capabilityId: "prescription.order.sign", grantee: { kind: "human_role", id: "clinician" } }));
  });

  it("keeps agents at A0/A1 inside reserved namespaces", async () => {
    const registry = new CapabilityContractRegistry();
    const booking = await registry.register(
      writeDefinition({ id: "appointment.booking.create", authorityClass: "A4_EXECUTE_MED", consentPurpose: "care" }),
      RELEASE,
    );
    assert.equal(
      code(() => validateGrant(booking, agentGrant({ capabilityId: "appointment.booking.create" }))),
      "CAPABILITY_AGENT_RESERVED_NAMESPACE",
    );
    const draft = await registry.register(
      readDefinition({ id: "clinical.note.draft", authorityClass: "A1_DRAFT", dataClasses: ["PHI"], consentPurpose: "care" }),
      RELEASE,
    );
    validateGrant(draft, agentGrant({ capabilityId: "clinical.note.draft" }));
  });

  it("rejects grants that do not match the definition or widen its branch scope", async () => {
    const registry = new CapabilityContractRegistry();
    const send = await registry.register(writeDefinition(), RELEASE);
    validateGrant(send, agentGrant());
    assert.equal(code(() => validateGrant(send, agentGrant({ branchId: null }))), "CAPABILITY_SCOPE_WIDENING");
    assert.equal(code(() => validateGrant(send, agentGrant({ version: "2.0.0" }))), "CAPABILITY_VERSION_MISMATCH");
    assert.equal(code(() => validateGrant(send, agentGrant({ capabilityId: "other.cap.id" }))), "CAPABILITY_GRANT_MISMATCH");
    assert.equal(code(() => validateGrant(send, agentGrant({ tenantId: "" }))), "CAPABILITY_SCOPE_INVALID");
  });

  it("rejects cross-tenant and widened-branch invocations", async () => {
    const registry = new CapabilityContractRegistry();
    const send = await registry.register(writeDefinition(), RELEASE);
    const grant = agentGrant();
    checkInvocationScope(send, grant, invocation(send.digest));
    assert.equal(code(() => checkInvocationScope(send, grant, invocation(send.digest, { tenantId: "tenant-b" }))), "CAPABILITY_CROSS_TENANT");
    assert.equal(code(() => checkInvocationScope(send, grant, invocation(send.digest, { branchId: "branch-2" }))), "CAPABILITY_SCOPE_WIDENING");
    assert.equal(code(() => checkInvocationScope(send, grant, invocation(send.digest, { branchId: null }))), "CAPABILITY_SCOPE_WIDENING");
    assert.equal(
      code(() => checkInvocationScope(send, grant, invocation(send.digest, { actor: { kind: "agent", id: "agent-other" } }))),
      "CAPABILITY_GRANT_MISMATCH",
    );
  });

  it("lets a tenant-wide grant narrow to any branch of the same tenant", async () => {
    const registry = new CapabilityContractRegistry();
    const read = await registry.register(readDefinition(), RELEASE);
    const grant = agentGrant({ capabilityId: read.definition.id, branchId: null });
    const call = invocation(read.digest, { capabilityId: read.definition.id, idempotencyKey: null });
    checkInvocationScope(read, grant, call);
    checkInvocationScope(read, grant, { ...call, branchId: null });
  });
});

describe("AIF-01A invocation and receipt shape", () => {
  it("binds an invocation to the admitted digest and to a normalized parameter digest", async () => {
    const registry = new CapabilityContractRegistry();
    const send = await registry.register(writeDefinition(), RELEASE);
    validateInvocation(send, invocation(send.digest));
    assert.equal(code(() => validateInvocation(send, invocation(`cap_${"1".repeat(64)}`))), "CAPABILITY_DIGEST_MISMATCH");
    assert.equal(code(() => validateInvocation(send, invocation(send.digest, { version: "1.0.1" }))), "CAPABILITY_VERSION_MISMATCH");
    assert.equal(
      code(() => validateInvocation(send, invocation(send.digest, { parametersDigest: "send to +966500000000" }))),
      "CAPABILITY_PARAMETERS_DIGEST_INVALID",
    );
    assert.equal(code(() => validateInvocation(send, invocation(send.digest, { idempotencyKey: null }))), "CAPABILITY_IDEMPOTENCY_KEY_REQUIRED");
    assert.equal(code(() => validateInvocation(send, invocation(send.digest, { correlationId: "" }))), "CAPABILITY_CORRELATION_REQUIRED");
    assert.equal(
      code(() => validateInvocation(send, invocation(send.digest, { requestedAt: "yesterday" }))),
      "CAPABILITY_TIME_INVALID",
    );
  });

  it("never records an UNKNOWN external outcome as verified or successful", async () => {
    const registry = new CapabilityContractRegistry();
    const send = await registry.register(writeDefinition(), RELEASE);
    const base: InvocationReceipt = {
      invocationId: "inv-0001",
      capabilityId: send.definition.id,
      version: send.definition.version,
      definitionDigest: send.digest,
      tenantId: "tenant-a",
      branchId: "branch-1",
      correlationId: "corr-0001",
      outcome: "UNKNOWN_EXTERNAL_OUTCOME",
      verification: "PENDING_RECONCILIATION",
      recordedAt: "2026-10-06T12:00:05.000Z",
    };
    validateReceipt(send, base);
    assert.equal(code(() => validateReceipt(send, { ...base, verification: "VERIFIED" })), "CAPABILITY_UNKNOWN_OUTCOME_UNVERIFIABLE");
    assert.equal(code(() => validateReceipt(send, { ...base, verification: "UNVERIFIED" })), "CAPABILITY_UNKNOWN_OUTCOME_UNVERIFIABLE");
    validateReceipt(send, { ...base, outcome: "SUCCEEDED", verification: "VERIFIED" });
    assert.equal(
      code(() => validateReceipt(send, { ...base, outcome: "SUCCEEDED", verification: "PENDING_RECONCILIATION" })),
      "CAPABILITY_RECEIPT_INVALID",
    );
    assert.equal(code(() => validateReceipt(send, { ...base, definitionDigest: `cap_${"2".repeat(64)}` })), "CAPABILITY_DIGEST_MISMATCH");
  });
});

describe("AIF-01A review-panel hardening", () => {
  it("validates one snapshot, so a getter cannot pass the checks and change the copy", async () => {
    let reads = 0;
    const tricky = { ...readDefinition() } as Record<string, unknown>;
    Object.defineProperty(tricky, "id", {
      enumerable: true,
      get: () => (reads++ === 0 ? "reporting.metrics.read" : "reporting.*"),
    });
    const registry = new CapabilityContractRegistry();
    const admitted = await registry.register(tricky, RELEASE);
    assert.equal(admitted.definition.id, "reporting.metrics.read");
    assert.equal(reads, 1);
  });

  it("ignores inherited fields instead of accepting them", () => {
    const inherited = Object.create(readDefinition()) as CapabilityDefinition;
    assert.equal(code(() => validateCapabilityDefinition(inherited)), "CAPABILITY_FIELD_MISSING");
  });

  it("applies the N5/C1 reserved-namespace match, including underscore separators", async () => {
    const registry = new CapabilityContractRegistry();
    const sign = await registry.register(
      writeDefinition({ id: "clinical_note.sign.submit", authorityClass: "A4_EXECUTE_MED", consentPurpose: "care" }),
      RELEASE,
    );
    assert.equal(
      code(() => validateGrant(sign, agentGrant({ capabilityId: "clinical_note.sign.submit" }))),
      "CAPABILITY_AGENT_RESERVED_NAMESPACE",
    );
  });

  it("never grants A5 to a workflow either", async () => {
    const registry = new CapabilityContractRegistry();
    const signing = await registry.register(
      writeDefinition({
        id: "prescription.order.sign",
        dataClasses: ["PHI", "CLINICAL_SIGNING_REQUIRED"],
        consentPurpose: "care",
        authorityClass: "A5_HUMAN_ONLY",
        riskClass: "critical",
      }),
      RELEASE,
    );
    assert.equal(
      code(() =>
        validateGrant(signing, agentGrant({ capabilityId: "prescription.order.sign", grantee: { kind: "workflow", id: "wf-refill" } })),
      ),
      "CAPABILITY_HUMAN_ONLY",
    );
  });

  it("digests the same set of data classes identically whatever their order", async () => {
    assert.equal(
      await digestCapabilityDefinition(writeDefinition({ dataClasses: ["PHI", "PII"] })),
      await digestCapabilityDefinition(writeDefinition({ dataClasses: ["PII", "PHI", "PII"] })),
    );
  });

  it("requires a branch on invocations and receipts of branch-scoped capabilities", async () => {
    const registry = new CapabilityContractRegistry();
    const send = await registry.register(writeDefinition(), RELEASE);
    assert.equal(code(() => validateInvocation(send, invocation(send.digest, { branchId: null }))), "CAPABILITY_SCOPE_WIDENING");
    const receipt: InvocationReceipt = {
      invocationId: "inv-0002",
      capabilityId: send.definition.id,
      version: send.definition.version,
      definitionDigest: send.digest,
      tenantId: "tenant-a",
      branchId: null,
      correlationId: "corr-0002",
      outcome: "SUCCEEDED",
      verification: "VERIFIED",
      recordedAt: "2026-10-06T12:00:05.000Z",
    };
    assert.equal(code(() => validateReceipt(send, receipt)), "CAPABILITY_SCOPE_WIDENING");
  });

  it("ties receipt verification to what actually happened", async () => {
    const registry = new CapabilityContractRegistry();
    const read = await registry.register(readDefinition(), RELEASE);
    const receipt: InvocationReceipt = {
      invocationId: "inv-0003",
      capabilityId: read.definition.id,
      version: read.definition.version,
      definitionDigest: read.digest,
      tenantId: "tenant-a",
      branchId: null,
      correlationId: "corr-0003",
      outcome: "DENIED",
      verification: "UNVERIFIED",
      recordedAt: "2026-10-06T12:00:05.000Z",
    };
    validateReceipt(read, receipt);
    assert.equal(code(() => validateReceipt(read, { ...receipt, verification: "VERIFIED" })), "CAPABILITY_RECEIPT_INVALID");
    assert.equal(
      code(() => validateReceipt(read, { ...receipt, outcome: "SUCCEEDED", verification: "VERIFIED" })),
      "CAPABILITY_RECEIPT_INVALID",
    );
    validateReceipt(read, { ...receipt, outcome: "SUCCEEDED", verification: "UNVERIFIED" });
  });
});

describe("AIF-01A security-judge hardening", () => {
  it("caps scanned strings so a hostile value cannot stall the secret scan", () => {
    const started = performance.now();
    assert.equal(
      code(() => validateCapabilityDefinition(readDefinition({ ownerDomain: "eyJ-".repeat(20_000) }))),
      "CAPABILITY_VALUE_TOO_LARGE",
    );
    const boundary = "eyJ-".repeat(128);
    assert.equal(code(() => validateCapabilityDefinition(readDefinition({ ownerDomain: boundary }))), "CAPABILITY_OWNER_INVALID");
    assert.ok(performance.now() - started < 500, "secret scan must stay linear");
  });

  it("refuses more credential shapes, in values and in keys, without echoing them", () => {
    const shapes = [
      "sk_live_51HabcDEFghiJKLmnoPQR",
      "rk_live_51HabcDEFghiJKLmnoPQR",
      "AIzaSyA1234567890abcdefghijklmnopqrstu",
      "https://user:pass@example.com/x",
      "AKIAIOSFODNN7EXAMPLE",
    ];
    for (const shape of shapes) {
      const refused = (() => {
        try {
          validateCapabilityDefinition(readDefinition({ ownerDomain: shape }));
        } catch (error) {
          return error as CapabilityContractError;
        }
        return null;
      })();
      assert.ok(refused, `${shape} must be refused`);
      assert.ok(!refused.message.includes(shape), "the refused value is not echoed");
    }
    const withSecretKey = { ...readDefinition(), AKIAIOSFODNN7EXAMPLE: "x" } as unknown as CapabilityDefinition;
    const refused = (() => {
      try {
        validateCapabilityDefinition(withSecretKey);
      } catch (error) {
        return error as CapabilityContractError;
      }
      return null;
    })();
    assert.ok(refused && !refused.message.includes("AKIAIOSFODNN7EXAMPLE"));
    assert.equal(
      code(() => validateCapabilityDefinition(writeDefinition({ credentialBinding: { kind: "ref", ref: `credref_k${"a".repeat(40)}` } }))),
      "CAPABILITY_CREDENTIAL_PLAINTEXT",
    );
  });

  it("keeps credentials and direct identifiers out of invocation tokens", async () => {
    const registry = new CapabilityContractRegistry();
    const send = await registry.register(writeDefinition(), RELEASE);
    assert.equal(
      code(() => validateInvocation(send, invocation(send.digest, { idempotencyKey: "ghp_abcdefghijklmnopqrstuvwxyz0123456789" }))),
      "CAPABILITY_IDEMPOTENCY_KEY_REQUIRED",
    );
    assert.equal(
      code(() => validateInvocation(send, invocation(send.digest, { correlationId: "patient-1012345678" }))),
      "CAPABILITY_CORRELATION_REQUIRED",
    );
    assert.equal(
      code(() => validateInvocation(send, invocation(send.digest, { idempotencyKey: "0501234567" }))),
      "CAPABILITY_IDEMPOTENCY_KEY_REQUIRED",
    );
  });

  it("requires an idempotency key on every write invocation, whichever side derives it", async () => {
    const registry = new CapabilityContractRegistry();
    const natural = await registry.register(
      writeDefinition({ version: "1.0.1", idempotency: { mode: "NATURAL_KEY", enforcedBy: "PROVIDER" } }),
      RELEASE,
    );
    assert.equal(
      code(() => validateInvocation(natural, invocation(natural.digest, { version: "1.0.1", idempotencyKey: null }))),
      "CAPABILITY_IDEMPOTENCY_KEY_REQUIRED",
    );
    validateInvocation(natural, invocation(natural.digest, { version: "1.0.1", idempotencyKey: "appt-a1b2:cancel" }));
  });

  it("accepts random UUIDs as correlation, idempotency and invocation ids", async () => {
    // A digit-run heuristic alone refused about 15% of random UUIDs; every one must pass.
    const registry = new CapabilityContractRegistry();
    const send = await registry.register(writeDefinition(), RELEASE);
    for (let i = 0; i < 50; i += 1) {
      validateInvocation(send, invocation(send.digest, { correlationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID() }));
    }
    // A UUID whose groups happen to be all digits is still an opaque UUID.
    validateInvocation(send, invocation(send.digest, { correlationId: "12345678-1234-4123-8123-123456789012" }));
    // A UUID-shaped value without a valid version and variant keeps the digit-run rule.
    assert.equal(
      code(() => validateInvocation(send, invocation(send.digest, { correlationId: "00000000-0000-0000-0000-966501234567" }))),
      "CAPABILITY_CORRELATION_REQUIRED",
    );
    // The N5/C3 rule, deliberately: a 7-8 digit run inside a token passes, 9+ is refused.
    validateInvocation(send, invocation(send.digest, { correlationId: "ref-1234567" }));
    assert.equal(
      code(() => validateInvocation(send, invocation(send.digest, { correlationId: "ref-123456789" }))),
      "CAPABILITY_CORRELATION_REQUIRED",
    );
    // Uppercase or unhyphenated values are not canonical UUIDs and keep the digit-run rule.
    assert.equal(
      code(() => validateInvocation(send, invocation(send.digest, { correlationId: "123456781234412381231234567890AB" }))),
      "CAPABILITY_CORRELATION_REQUIRED",
    );
  });
});
