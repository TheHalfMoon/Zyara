// N5/C4 synthetic qualification: audit-chain reconstruction.
//
// Proves, without any real clinic, provider or patient data:
//   * an important action can be reconstructed step by step from the records the owning
//     slices keep, and the report names the evidence for every step;
//   * a step that carries no evidence is reported as a gap rather than filled in, while a step
//     outside the declared profile is explicitly not applicable;
//   * evidence from another tenant, another branch or another correlation id is refused
//     instead of widening the chain;
//   * the reconstruction fingerprint is reproducible for identical evidence and changes when
//     the evidence changes, and it is not presented as tamper-evidence;
//   * the gap register is closed-coded, owned and explicit about what remains open.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  AUDIT_CHAIN_GAP_REGISTER,
  AUDIT_CHAIN_PROFILE_NAMES,
  AUDIT_CHAIN_STEPS,
  AuditChainError,
  assembleAuditChain,
  chainFingerprint,
  isAuditChainCorrelationId,
  isAuditChainReference,
  recommendedProfile,
  summariseAuditChain,
  type AuditChainReader,
  type AuditChainReaderEntry,
} from "@zyara/collaboration";

const NOW = "2026-09-21T10:00:00Z";
const LATER = "2026-09-21T10:05:00Z";
const CORRELATION = "corr-c4-1";
const DIGEST_CORRELATION = `whatsapp_${"ab12".repeat(16)}`;

function evidence(overrides: Partial<AuditChainReaderEntry> = {}): AuditChainReaderEntry {
  return {
    step: "typed_action",
    sourceDomain: "workforce.tasks",
    recordRef: "ops-task:task-1",
    occurredAt: NOW,
    actorKind: "human",
    actorRef: "account-reception",
    outcomeCode: "created",
    tenantId: "t1",
    branchId: "b1",
    correlationId: CORRELATION,
    ...overrides,
  };
}

function reader(
  sourceDomain: AuditChainReader["sourceDomain"],
  entries: AuditChainReaderEntry[],
): AuditChainReader {
  return { sourceDomain, read: () => entries };
}

// A plausible approval-driven chain across five slices.
function approvalReaders(): AuditChainReader[] {
  return [
    reader("workforce.tasks", [
      evidence({ step: "initiator", outcomeCode: "facility_helpdesk" }),
      evidence({ step: "identity", actorRef: "account-reception" }),
      evidence({ step: "typed_action", recordRef: "ops-task:task-2" }),
    ]),
    reader("identity.agents", [
      evidence({
        step: "identity",
        sourceDomain: "identity.agents",
        recordRef: "agent:agent-1",
        actorKind: "agent",
        actorRef: "agent-1",
      }),
      evidence({
        step: "authority",
        sourceDomain: "identity.agents",
        recordRef: "agent-identity-event:1",
        outcomeCode: "capability_granted",
      }),
    ]),
    reader("collaboration.approvals", [
      evidence({
        step: "policy_decision",
        sourceDomain: "collaboration.approvals",
        recordRef: "approval-request:approval-1",
        outcomeCode: "high",
      }),
      evidence({
        step: "human_approval",
        sourceDomain: "collaboration.approvals",
        recordRef: "approval-decision:decision-1",
        actorRef: "account-branch-admin",
        outcomeCode: "approved",
      }),
      evidence({
        step: "canonical_outcome",
        sourceDomain: "collaboration.approvals",
        recordRef: "approval-request:approval-1",
        outcomeCode: "succeeded",
        occurredAt: LATER,
      }),
    ]),
    reader("activity.projection", [
      evidence({
        step: "derived_activity",
        sourceDomain: "activity.projection",
        recordRef: "activity:activity-1",
        outcomeCode: "succeeded",
        occurredAt: LATER,
      }),
    ]),
  ];
}

function query(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: "t1",
    branchId: null,
    correlationId: CORRELATION,
    profile: "approval_driven",
    asOf: NOW,
    ...overrides,
  };
}

async function expectAuditError(
  run: () => unknown | Promise<unknown>,
  code: string,
  label: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    assert.ok(error instanceof AuditChainError, `${label}: expected an AuditChainError`);
    assert.equal((error as AuditChainError).code, code, label);
    return;
  }
  assert.fail(`${label}: expected ${code}, but the call succeeded`);
}

describe("N5/C4 audit-chain reconstruction", () => {
  it("reconstructs every required step of an approval-driven chain with named evidence", async () => {
    const report = await assembleAuditChain(query(), approvalReaders());
    assert.equal(report.reconstructable, true);
    assert.deepEqual(report.missingSteps, []);
    assert.equal(report.profile, "approval_driven");
    assert.equal(report.correlationId, CORRELATION);
    assert.equal(report.tenantId, "t1");
    const byStep = new Map(report.steps.map((step) => [step.step, step]));
    assert.equal(byStep.get("initiator")?.status, "present");
    assert.equal(byStep.get("identity")?.status, "present");
    assert.equal(byStep.get("scope")?.status, "present");
    assert.equal(byStep.get("authority")?.status, "present");
    assert.equal(byStep.get("policy_decision")?.status, "present");
    assert.equal(byStep.get("human_approval")?.status, "present");
    assert.equal(byStep.get("typed_action")?.status, "present");
    assert.equal(byStep.get("canonical_outcome")?.status, "present");
    assert.equal(byStep.get("derived_activity")?.status, "present");
    // A step the profile does not require and that carries no evidence is not a gap.
    assert.equal(byStep.get("external_action")?.status, "not_applicable");
    assert.equal(byStep.get("receipt")?.status, "not_applicable");
    // Every reported step names the authoritative records behind it.
    for (const step of report.steps.filter((row) => row.status === "present")) {
      assert.ok(step.evidence.length >= 1, `step ${step.step} must name evidence`);
      for (const entry of step.evidence) {
        assert.ok(isAuditChainReference(entry.recordRef));
        assert.equal(entry.tenantId, "t1");
      }
    }
    assert.equal(report.entries.length, 9);
    const summary = summariseAuditChain(report);
    assert.equal(summary.reconstructable, true);
    assert.ok(summary.presentSteps >= 9);
    assert.deepEqual(summary.absentSteps, []);
    assert.deepEqual(summary.sourceDomains, [
      "activity.projection",
      "collaboration.approvals",
      "identity.agents",
      "workforce.tasks",
    ]);
    assert.equal(summary.openGaps, AUDIT_CHAIN_GAP_REGISTER.filter((gap) => gap.status === "open").length);
  });

  it("reports a required step with no evidence as a gap instead of filling it in", async () => {
    const readers = approvalReaders().filter(
      (candidate) => candidate.sourceDomain !== "collaboration.approvals",
    );
    const report = await assembleAuditChain(query(), readers);
    assert.equal(report.reconstructable, false);
    assert.deepEqual(
      [...report.missingSteps].sort(),
      // Authority is still evidenced by the C1 agent identity; the protection steps are not.
      ["canonical_outcome", "human_approval", "policy_decision"],
    );
    assert.equal(report.entries.some((row) => row.step === "authority"), true);
    const approvalSteps = report.steps.filter((step) => step.status === "absent");
    assert.ok(approvalSteps.every((step) => step.evidence.length === 0));
    // A chain with no protection at all is still reported, it is simply not reconstructable.
    assert.ok(report.fingerprint.startsWith("chain_"));
  });

  it("refuses evidence from another tenant or another branch", async () => {
    await expectAuditError(
      () =>
        assembleAuditChain(query(), [
          reader("workforce.tasks", [evidence({ tenantId: "t2" })]),
        ]),
      "AUDIT_CHAIN_CROSS_TENANT",
      "a foreign tenant's record must be refused",
    );
    await expectAuditError(
      () =>
        assembleAuditChain(query({ branchId: "b1" }), [
          reader("workforce.tasks", [evidence({ branchId: "b2" })]),
        ]),
      "AUDIT_CHAIN_CROSS_BRANCH",
      "another branch's record must be refused for a branch-scoped query",
    );
    // A tenant-wide record is admissible for a branch query: it is not another branch.
    const tenantWide = await assembleAuditChain(query({ branchId: "b1" }), [
      reader("workforce.tasks", [evidence({ branchId: null })]),
    ]);
    assert.equal(tenantWide.reconstructable, false);
    assert.ok(tenantWide.entries.length >= 1);
  });

  it("refuses evidence for another correlation id or another source domain", async () => {
    await expectAuditError(
      () =>
        assembleAuditChain(query(), [
          reader("workforce.tasks", [evidence({ correlationId: "corr-other" })]),
        ]),
      "AUDIT_CHAIN_CORRELATION_MISMATCH",
      "evidence for another correlation id must be refused",
    );
    await expectAuditError(
      () =>
        assembleAuditChain(query(), [
          reader("workforce.tasks", [evidence({ sourceDomain: "collaboration.approvals" })]),
        ]),
      "AUDIT_CHAIN_CORRELATION_MISMATCH",
      "a reader must not attribute evidence to another source domain",
    );
  });

  it("refuses a chain that would quote prose, a direct identifier or credential material", async () => {
    await expectAuditError(
      () =>
        assembleAuditChain(query(), [
          reader("workforce.tasks", [evidence({ recordRef: "patient called about chest pain" })]),
        ]),
      "AUDIT_CHAIN_MALFORMED",
      "prose must never become an evidence reference",
    );
    await expectAuditError(
      () =>
        assembleAuditChain(query(), [
          reader("workforce.tasks", [evidence({ recordRef: "app_secret_value" })]),
        ]),
      "AUDIT_CHAIN_MALFORMED",
      "credential-shaped evidence must be refused",
    );
    await expectAuditError(
      () =>
        assembleAuditChain(query(), [
          reader("workforce.tasks", [evidence({ actorRef: "1052345678" })]),
        ]),
      "AUDIT_CHAIN_MALFORMED",
      "a long digit run must not become an actor reference",
    );
    await expectAuditError(
      () => assembleAuditChain(query({ correlationId: "secret://vault/chain" }), []),
      "AUDIT_CHAIN_MALFORMED",
      "a secret-shaped correlation id must be refused",
    );
    await expectAuditError(
      () => assembleAuditChain(query({ profile: "anything_goes" }), []),
      "AUDIT_CHAIN_UNKNOWN_PROFILE",
      "an unknown chain profile must be refused",
    );
    await expectAuditError(
      () =>
        assembleAuditChain(query(), [
          reader("workforce.tasks", [evidence({ actorKind: "clinician" as never })]),
        ]),
      "AUDIT_CHAIN_UNKNOWN_ACTOR_KIND",
      "an unregistered actor kind must be refused",
    );
  });

  it("fingerprints the reconstruction reproducibly and changes when the evidence changes", async () => {
    const first = await assembleAuditChain(query(), approvalReaders());
    const second = await assembleAuditChain(query(), approvalReaders());
    assert.equal(first.fingerprint, second.fingerprint);
    assert.match(first.fingerprint, /^chain_[0-9a-f]{64}$/);
    // The order in which readers contribute must not change the fingerprint.
    const reordered = await assembleAuditChain(query(), [...approvalReaders()].reverse());
    assert.equal(reordered.fingerprint, first.fingerprint);
    // A changed record changes the fingerprint: that is reproducibility, not tamper-evidence.
    const changed = await assembleAuditChain(query(), [
      ...approvalReaders().filter((candidate) => candidate.sourceDomain !== "activity.projection"),
      reader("activity.projection", [
        evidence({
          step: "derived_activity",
          sourceDomain: "activity.projection",
          recordRef: "activity:activity-2",
          outcomeCode: "failed",
          occurredAt: LATER,
        }),
      ]),
    ]);
    assert.notEqual(changed.fingerprint, first.fingerprint);
    // A manual recomputation over the same ordered evidence matches the report.
    assert.equal(
      await chainFingerprint(
        {
          tenantId: first.tenantId,
          branchId: first.branchId,
          correlationId: first.correlationId,
          profile: first.profile,
        },
        first.entries,
      ),
      first.fingerprint,
    );
    // The correlation-id shape check accepts a minted digest but still refuses a secret.
    assert.equal(isAuditChainCorrelationId(DIGEST_CORRELATION), true);
    assert.equal(isAuditChainCorrelationId("bearer abc"), false);
  });

  it("keeps the chain step registry and the profiles closed", async () => {
    assert.equal(AUDIT_CHAIN_STEPS.length, 12);
    assert.deepEqual(
      [...AUDIT_CHAIN_PROFILE_NAMES].sort(),
      ["approval_driven", "exception_driven", "external_action_driven", "task_only"],
    );
    const report = await assembleAuditChain(query({ profile: "task_only" }), [
      reader("workforce.tasks", [evidence({ step: "typed_action" })]),
    ]);
    assert.equal(report.reconstructable, false);
    const steps = new Map(report.steps.map((step) => [step.step, step]));
    // task_only does not require authority, approval or a provider receipt.
    assert.equal(steps.get("authority")?.status, "not_applicable");
    assert.equal(steps.get("human_approval")?.status, "not_applicable");
    assert.equal(steps.get("receipt")?.status, "not_applicable");
    assert.deepEqual(report.missingSteps, ["initiator", "identity", "derived_activity"]);
    // The step list is exactly the question set the chain must answer.
    for (const step of report.steps) {
      assert.ok(AUDIT_CHAIN_STEPS.includes(step.step));
    }
  });

  it("refuses a profile that under-declares what the evidence requires", async () => {
    // Approval evidence cannot be reported as a task-only chain: a caller must not be able to
    // hide the protection steps by asking for a weaker profile.
    await expectAuditError(
      () => assembleAuditChain(query({ profile: "task_only" }), approvalReaders()),
      "AUDIT_CHAIN_PROFILE_UNDER_SPECIFIED",
      "a weaker profile than the evidence implies must be refused",
    );
    // Provider evidence cannot be reported as an approval-driven chain either.
    await expectAuditError(
      () =>
        assembleAuditChain(query(), [
          reader("communications.whatsapp", [
            evidence({
              step: "external_action",
              sourceDomain: "communications.whatsapp",
              recordRef: "whatsapp-receipt:receipt-1",
              actorKind: "external",
            }),
          ]),
        ]),
      "AUDIT_CHAIN_PROFILE_UNDER_SPECIFIED",
      "a provider receipt cannot be reported as an approval-driven chain",
    );
    // The recommended profile names a profile that does cover the evidence.
    const providerChain = await assembleAuditChain(query({ profile: "external_action_driven" }), [
      reader("communications.whatsapp", [
        evidence({
          step: "external_action",
          sourceDomain: "communications.whatsapp",
          recordRef: "whatsapp-receipt:receipt-1",
          actorKind: "external",
        }),
        evidence({
          step: "receipt",
          sourceDomain: "communications.whatsapp",
          recordRef: "whatsapp-receipt:receipt-1",
          actorKind: "external",
        }),
      ]),
    ]);
    assert.equal(providerChain.reconstructable, false);
    assert.deepEqual(recommendedProfile(providerChain.entries), "external_action_driven");
  });

  it("publishes a closed, owned gap register that does not overstate what is proven", async () => {
    assert.ok(AUDIT_CHAIN_GAP_REGISTER.length >= 6);
    const codes = AUDIT_CHAIN_GAP_REGISTER.map((gap) => gap.code);
    assert.equal(new Set(codes).size, codes.length, "gap codes must be unique");
    for (const gap of AUDIT_CHAIN_GAP_REGISTER) {
      assert.match(gap.code, /^[A-Z_]+$/);
      assert.ok(gap.surface.length > 0 && gap.description.length > 0 && gap.mitigation.length > 0);
      assert.ok(gap.nextTask.length > 0);
      assert.ok(["closed_by_c4", "open"].includes(gap.status));
    }
    const closed = AUDIT_CHAIN_GAP_REGISTER.filter((gap) => gap.status === "closed_by_c4");
    assert.deepEqual(
      closed.map((gap) => gap.code).sort(),
      ["COVERAGE_EXCEPTION_WITHOUT_CORRELATION", "INBOUND_PROVIDER_EVENT_WITHOUT_CORRELATION"],
    );
    // The register must keep saying plainly that no cryptographic tamper-evidence exists.
    const tamper = AUDIT_CHAIN_GAP_REGISTER.find(
      (gap) => gap.code === "NO_CRYPTOGRAPHIC_TAMPER_EVIDENCE",
    );
    assert.ok(tamper);
    assert.equal(tamper?.status, "open");
    assert.match(tamper?.mitigation ?? "", /not prove tamper-evidence/);
  });

  it("is a reader only: it holds no store and exposes no write path", async () => {
    const source = readFileSync(
      new URL("../../packages/collaboration/src/audit-chain.ts", import.meta.url),
      "utf8",
    );
    assert.ok(!/from\s+["']@zyara\/(api|web|worker)/.test(source));
    assert.ok(!/from\s+["'](pg|fastify)["']/.test(source));
    assert.ok(!/\b(write|insert|update|delete|recordEntry|mutate)\s*\(/.test(source));
    // The assembly is a pure function of the query and the readers' answers.
    const empty = await assembleAuditChain(query(), []);
    assert.equal(empty.entries.length, 0);
    assert.equal(empty.reconstructable, false);
    assert.equal(
      empty.fingerprint,
      await chainFingerprint(
        {
          tenantId: "t1",
          branchId: null,
          correlationId: CORRELATION,
          profile: "approval_driven",
        },
        [],
      ),
    );
  });
});
