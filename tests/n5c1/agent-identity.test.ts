// N5/C1 synthetic qualification: bounded agent identities for Zyara Clinic.
//
// Proves, without any real clinic, provider or patient data:
//   * agents hold a closed, non-delegable capability set;
//   * authority is tenant-scoped, branch-scoped, expiring and revocable;
//   * a live human sponsor is required at registration and at action time;
//   * credential material is addressed only by opaque references;
//   * the trail is append-only and derived capability state is not rewritable;
//   * W3's rule still applies: agents may raise and comment, never close work.
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  AGENT_CAPABILITIES,
  AGENT_MAX_TTL_MS,
  AgentIdentityError,
  AgentIdentityStore,
  agentTaskActor,
  resolvedStatus,
  type AgentIdentityErrorCode,
  type AgentProvenance,
  type HumanSponsorDirectory,
} from "@zyara/collaboration";
import {
  OpsTaskError,
  OpsTaskStore,
  type WorkforceProvenance,
} from "@zyara/enterprise-access";

const NOW = "2026-09-21T10:00:00Z";
const LATER = "2026-09-22T10:00:00Z";

const provenance: AgentProvenance = {
  source: "zyara-native",
  sourceRef: "N5/C1 agent identity qualification",
  sourceRevision: "n5c1-test",
  observedAt: "2026-09-21T00:00:00Z",
};

const workforceProvenance: WorkforceProvenance = {
  source: "zyara-native",
  sourceRef: "N5/C1 agent identity qualification",
  sourceRevision: "n5c1-test",
  observedAt: "2026-09-21T00:00:00Z",
};

class FakeSponsors implements HumanSponsorDirectory {
  private readonly eligible = new Set<string>();

  add(tenantId: string, accountId: string): void {
    this.eligible.add(`${tenantId}:${accountId}`);
  }

  remove(tenantId: string, accountId: string): void {
    this.eligible.delete(`${tenantId}:${accountId}`);
  }

  isEligibleHumanSponsor(lookup: { tenantId: string; accountId: string }): boolean {
    return this.eligible.has(`${lookup.tenantId}:${lookup.accountId}`);
  }
}

function sponsors(): FakeSponsors {
  const directory = new FakeSponsors();
  directory.add("t1", "account-sponsor");
  directory.add("t2", "account-sponsor-t2");
  return directory;
}

function expectCode(fn: () => unknown, code: AgentIdentityErrorCode): void {
  assert.throws(
    fn,
    (error: unknown) => error instanceof AgentIdentityError && error.code === code,
    `expected ${code}`,
  );
}

function registration(overrides: Record<string, unknown> = {}) {
  return {
    id: "agent-1",
    tenantId: "t1",
    branchId: "branch-1",
    displayName: "Clinic Ops Assistant",
    kind: "clinic_ops_assistant" as const,
    humanSponsorAccountId: "account-sponsor",
    effectiveFrom: NOW,
    expiresAt: "2026-10-21T10:00:00Z",
    credentialRef: "secret://synthetic/agents/agent-1",
    provenance,
    ...overrides,
  };
}

function seeded(overrides: Record<string, unknown> = {}) {
  const sponsorsDirectory = sponsors();
  const store = new AgentIdentityStore();
  const identity = store.register(
    registration(overrides) as Parameters<AgentIdentityStore["register"]>[0],
    "t1",
    sponsorsDirectory,
  );
  return { store, sponsorsDirectory, identity };
}

describe("N5/C1 agent identities", () => {
  it("registers a bounded identity with a live human sponsor and an empty capability set", () => {
    const { store, identity } = seeded();
    assert.equal(identity.status, "active");
    assert.equal(identity.humanSponsorAccountId, "account-sponsor");
    assert.equal(identity.credentialRef, "secret://synthetic/agents/agent-1");
    assert.deepEqual(store.capabilitiesOf("agent-1", "t1"), []);
    const events = store.listEvents("agent-1", "t1");
    assert.equal(events.length, 1);
    assert.equal(events[0].action, "created");
    assert.equal(events[0].actor.kind, "human");
    assert.equal(resolvedStatus(identity, NOW), "active");
  });

  it("refuses a sponsor with no active membership and refuses agent-sponsored agents", () => {
    const directory = sponsors();
    const store = new AgentIdentityStore();
    expectCode(
      () => store.register(registration({ humanSponsorAccountId: "account-ghost" }) as never, "t1", directory),
      "AGENT_SPONSOR_INELIGIBLE",
    );
    expectCode(
      () => store.register(registration({ humanSponsorAccountId: "agent:other" }) as never, "t1", directory),
      "AGENT_SPONSOR_IS_AGENT",
    );
    assert.equal(store.identities.size, 0);
  });

  it("refuses cross-tenant registration and cross-tenant identity access", () => {
    const directory = sponsors();
    const store = new AgentIdentityStore();
    expectCode(() => store.register(registration() as never, "t2", directory), "AGENT_CROSS_TENANT");
    const identity = store.register(registration() as never, "t1", directory);
    expectCode(() => store.capabilitiesOf(identity.id, "t2"), "AGENT_UNKNOWN_REFERENCE");
    expectCode(() => store.listEvents(identity.id, "t2"), "AGENT_UNKNOWN_REFERENCE");
  });

  it("rejects unknown kinds, raw credential values and unbounded lifetimes", () => {
    const directory = sponsors();
    const store = new AgentIdentityStore();
    expectCode(
      () => store.register(registration({ kind: "infra_robot" }) as never, "t1", directory),
      "AGENT_UNKNOWN_KIND",
    );
    for (const credentialRef of [
      "EAAGf9ZABCDEFRAWPATTOKEN",
      "secret:",
      "secret://",
      "secret://ok with space",
      "",
    ]) {
      expectCode(
        () => store.register(registration({ credentialRef }) as never, "t1", directory),
        "AGENT_CREDENTIAL_REF_INVALID",
      );
    }
    expectCode(
      () => store.register(
        registration({ expiresAt: new Date(Date.parse(NOW) + AGENT_MAX_TTL_MS + 60_000).toISOString() }) as never,
        "t1",
        directory,
      ),
      "AGENT_TTL_EXCEEDED",
    );
    expectCode(
      () => store.register(registration({ expiresAt: NOW }) as never, "t1", directory),
      "AGENT_INVALID_WINDOW",
    );
    assert.equal(store.identities.size, 0);
  });

  it("is idempotent per (tenant, idempotencyKey) and conflicts on divergent reuse", () => {
    const directory = sponsors();
    const store = new AgentIdentityStore();
    const first = store.register(
      registration({ idempotencyKey: "idem-1" }) as never,
      "t1",
      directory,
    );
    const replay = store.register(
      registration({ idempotencyKey: "idem-1" }) as never,
      "t1",
      directory,
    );
    assert.equal(replay.id, first.id);
    assert.equal(store.identities.size, 1);
    assert.equal(store.listEvents(first.id, "t1").length, 1);
    expectCode(
      () =>
        store.register(
          registration({ idempotencyKey: "idem-1", displayName: "Different" }) as never,
          "t1",
          directory,
        ),
      "AGENT_IDEMPOTENCY_CONFLICT",
    );
  });

  it("never grants clinical, financial, insurance or infrastructure authority", () => {
    const { store } = seeded();
    for (const capability of [
      "clinical.sign",
      "clinical.note.write",
      "encounter.close",
      "prescription.create",
      "refill.approve",
      "result.release",
      "lab.order",
      "referral.create",
      "insurance.eligibility.check",
      "nphies.claim.submit",
      "claim.adjudicate",
      "payment.capture",
      "billing.invoice",
      "appointment.write",
      "schedule.override",
      "availability.write",
      "hold.release",
      "workforce.assign",
      "workforce.graph.write",
      "identity.admin",
      "credential.read",
      "secret.read",
      "audit.rewrite",
      "tenant.create",
      "role.grant",
      "membership.grant",
      "filesystem.write",
      "file.read",
      "shell.exec",
      "process.spawn",
      "network.egress",
      "http.request",
      "sql.execute",
      "database.migrate",
      "code.deploy",
      "deploy.production",
      "infra.provision",
    ]) {
      expectCode(
        () =>
          store.grantCapability("agent-1", capability, { kind: "human", accountId: "account-sponsor" }, "t1", {
            at: NOW,
          }),
        "AGENT_CAPABILITY_NOT_DELEGABLE",
      );
    }
    for (const capability of ["reporting.export", "tasks.everything", "*", ""]) {
      expectCode(
        () =>
          store.grantCapability("agent-1", capability, { kind: "human", accountId: "account-sponsor" }, "t1", {
            at: NOW,
          }),
        capability === "" ? "AGENT_CAPABILITY_UNKNOWN" : "AGENT_CAPABILITY_UNKNOWN",
      );
    }
    assert.deepEqual(store.capabilitiesOf("agent-1", "t1"), []);
  });

  it("grants only enumerated capabilities and denies everything ungranted", () => {
    const { store, sponsorsDirectory } = seeded();
    const actor = { kind: "human" as const, accountId: "account-sponsor" };
    for (const capability of AGENT_CAPABILITIES) {
      store.grantCapability("agent-1", capability, actor, "t1", { at: NOW });
    }
    assert.deepEqual([...store.capabilitiesOf("agent-1", "t1")].sort(), [...AGENT_CAPABILITIES].sort());
    const allowed = store.resolveAuthority(
      "agent-1",
      "t1",
      { capability: "workforce.tasks.raise", branchId: "branch-1", at: NOW },
      sponsorsDirectory,
    );
    assert.equal(allowed.allow, true);
    if (allowed.allow) {
      assert.equal(allowed.authority.humanSponsorAccountId, "account-sponsor");
      assert.equal(allowed.audit.decision, "allow");
      assert.equal(allowed.audit.branch, "branch-1");
    }
    expectCode(
      () => store.grantCapability("agent-1", "workforce.tasks.raise", actor, "t1", { at: NOW }),
      "AGENT_CAPABILITY_ALREADY_GRANTED",
    );

    const ungranted = new AgentIdentityStore();
    ungranted.register(registration({ id: "agent-2" }) as never, "t1", sponsorsDirectory);
    const decision = ungranted.resolveAuthority(
      "agent-2",
      "t1",
      { capability: "workforce.tasks.raise", branchId: "branch-1", at: NOW },
      sponsorsDirectory,
    );
    assert.equal(decision.allow, false);
    assert.equal(decision.denial, "AGENT_CAPABILITY_DENIED");
    assert.equal(decision.audit.decision, "deny");
  });

  it("denies cross-tenant use, cross-branch use and unknown identities", () => {
    const { store, sponsorsDirectory } = seeded();
    store.grantCapability("agent-1", "workforce.tasks.raise", { kind: "human", accountId: "s" }, "t1", {
      at: NOW,
    });
    const crossTenant = store.resolveAuthority(
      "agent-1",
      "t2",
      { capability: "workforce.tasks.raise", branchId: "branch-1", at: NOW },
      sponsorsDirectory,
    );
    assert.equal(crossTenant.denial, "AGENT_CROSS_TENANT");
    const crossBranch = store.resolveAuthority(
      "agent-1",
      "t1",
      { capability: "workforce.tasks.raise", branchId: "branch-2", at: NOW },
      sponsorsDirectory,
    );
    assert.equal(crossBranch.denial, "AGENT_CROSS_BRANCH");
    const branchless = store.resolveAuthority(
      "agent-1",
      "t1",
      { capability: "workforce.tasks.raise", branchId: null, at: NOW },
      sponsorsDirectory,
    );
    assert.equal(branchless.denial, "AGENT_CROSS_BRANCH");
    const unknown = store.resolveAuthority(
      "agent-missing",
      "t1",
      { capability: "workforce.tasks.raise", branchId: "branch-1", at: NOW },
      sponsorsDirectory,
    );
    assert.equal(unknown.denial, "AGENT_UNKNOWN");

    // A tenant-wide identity is explicitly allowed to act on any branch of its
    // own tenant; that is a deliberate scope decision, not an accident.
    const tenantWide = store.register(
      registration({ id: "agent-wide", branchId: null }) as never,
      "t1",
      sponsorsDirectory,
    );
    store.grantCapability(tenantWide.id, "workforce.tasks.read", { kind: "human", accountId: "s" }, "t1", {
      at: NOW,
    });
    const wide = store.resolveAuthority(
      tenantWide.id,
      "t1",
      { capability: "workforce.tasks.read", branchId: "branch-7", at: NOW },
      sponsorsDirectory,
    );
    assert.equal(wide.allow, true);
  });

  it("stops authority on suspension, revocation, expiry and sponsor loss", () => {
    const actor = { kind: "human" as const, accountId: "account-sponsor" };
    const request = { capability: "workforce.tasks.read" as const, branchId: "branch-1", at: NOW };

    const { store, sponsorsDirectory } = seeded();
    store.grantCapability("agent-1", "workforce.tasks.read", actor, "t1", { at: NOW });

    store.suspend("agent-1", actor, "t1", { at: NOW, reason: "incident review" });
    assert.equal(store.resolveAuthority("agent-1", "t1", request, sponsorsDirectory).denial, "AGENT_SUSPENDED");
    store.reactivate("agent-1", actor, "t1", { at: NOW, reason: "review closed" });
    assert.equal(store.resolveAuthority("agent-1", "t1", request, sponsorsDirectory).allow, true);

    store.revoke("agent-1", actor, "t1", { at: NOW, reason: "offboarding" });
    assert.equal(store.resolveAuthority("agent-1", "t1", request, sponsorsDirectory).denial, "AGENT_REVOKED");
    expectCode(
      () => store.grantCapability("agent-1", "reporting.read", actor, "t1", { at: NOW }),
      "AGENT_INVALID_TRANSITION",
    );
    expectCode(
      () => store.suspend("agent-1", actor, "t1", { at: NOW, reason: "again" }),
      "AGENT_INVALID_TRANSITION",
    );

    const expired = seeded({ id: "agent-exp", expiresAt: "2026-09-21T12:00:00Z" });
    expired.store.grantCapability("agent-exp", "workforce.tasks.read", actor, "t1", { at: NOW });
    expired.store.resolveAuthority(
      "agent-exp",
      "t1",
      { ...request, at: NOW },
      expired.sponsorsDirectory,
    );
    const afterExpiry = expired.store.resolveAuthority(
      "agent-exp",
      "t1",
      { ...request, at: "2026-09-21T12:00:00Z" },
      expired.sponsorsDirectory,
    );
    assert.equal(afterExpiry.denial, "AGENT_EXPIRED");

    const future = seeded({ id: "agent-future", effectiveFrom: LATER });
    assert.equal(
      future.store.resolveAuthority("agent-future", "t1", request, future.sponsorsDirectory).denial,
      "AGENT_NOT_YET_EFFECTIVE",
    );

    const sponsorLost = seeded({ id: "agent-sponsor" });
    sponsorLost.store.grantCapability("agent-sponsor", "workforce.tasks.read", actor, "t1", { at: NOW });
    sponsorLost.sponsorsDirectory.remove("t1", "account-sponsor");
    const orphaned = sponsorLost.store.resolveAuthority(
      "agent-sponsor",
      "t1",
      { ...request },
      sponsorLost.sponsorsDirectory,
    );
    assert.equal(orphaned.denial, "AGENT_SPONSOR_INELIGIBLE");
  });

  it("requires a recorded reason to remove authority and keeps the trail append-only", () => {
    const { store } = seeded();
    const actor = { kind: "human" as const, accountId: "account-sponsor" };
    store.grantCapability("agent-1", "workforce.tasks.comment", actor, "t1", { at: NOW, reason: "ops pilot" });
    expectCode(
      () => store.revokeCapability("agent-1", "reporting.read", actor, "t1", { at: NOW, reason: "x" }),
      "AGENT_CAPABILITY_NOT_GRANTED",
    );
    expectCode(
      () => store.revokeCapability("agent-1", "workforce.tasks.comment", actor, "t1", { at: NOW, reason: "" }),
      "AGENT_MISSING_REASON",
    );
    assert.deepEqual(store.capabilitiesOf("agent-1", "t1"), ["workforce.tasks.comment"]);

    store.revokeCapability("agent-1", "workforce.tasks.comment", actor, "t1", {
      at: NOW,
      reason: "pilot ended",
    });
    assert.deepEqual(store.capabilitiesOf("agent-1", "t1"), []);
    store.grantCapability("agent-1", "workforce.tasks.comment", actor, "t1", { at: NOW, reason: "pilot resumed" });
    assert.deepEqual(store.capabilitiesOf("agent-1", "t1"), ["workforce.tasks.comment"]);

    const events = store.listEvents("agent-1", "t1");
    assert.equal(events.length, 4);
    assert.deepEqual(
      events.map((event) => event.action),
      ["created", "capability_granted", "capability_revoked", "capability_granted"],
    );
    const ids = new Set(events.map((event) => event.id));
    assert.equal(ids.size, events.length);
    for (const event of events) {
      assert.match(event.id, /^agent-identity-event-\d+$/);
    }
    // There is no store API that edits or deletes a recorded event.
    assert.equal(typeof (store as unknown as { deleteEvent?: unknown }).deleteEvent, "undefined");
    assert.equal(typeof (store as unknown as { updateEvent?: unknown }).updateEvent, "undefined");
  });

  it("rotates credentials without rewriting identity or history and stores no secret", () => {
    const { store, sponsorsDirectory, identity } = seeded({ idempotencyKey: "idem-rot" });
    const actor = { kind: "human" as const, accountId: "account-sponsor" };
    store.grantCapability("agent-1", "communications.outbound.propose", actor, "t1", { at: NOW });
    const before = store.listEvents("agent-1", "t1").length;

    const rotated = store.rotateCredential("agent-1", "secret://synthetic/agents/agent-1-v2", actor, "t1", {
      at: LATER,
      reason: "scheduled rotation",
    });
    assert.equal(rotated.credentialRef, "secret://synthetic/agents/agent-1-v2");
    assert.equal(rotated.credentialRotatedAt, LATER);
    assert.equal(rotated.revokedAt, null);
    assert.equal(rotated.humanSponsorAccountId, identity.humanSponsorAccountId);
    assert.equal(store.listEvents("agent-1", "t1").length, before + 1);
    assert.equal(store.listEvents("agent-1", "t1").at(-1)?.action, "credential_rotated");
    assert.deepEqual(store.capabilitiesOf("agent-1", "t1"), ["communications.outbound.propose"]);

    const serialized = JSON.stringify(store.identities.get("agent-1"));
    assert.ok(!/EAAG|Bearer|password|api[_-]?key/i.test(serialized));
    for (const forbidden of ["appSecret", "verifyToken", "accessToken", "token", "secret", "password"]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(store.identities.get("agent-1") as object, forbidden),
        false,
        `identity must not carry a ${forbidden} field`,
      );
    }
    assert.equal(
      store.resolveAuthority(
        "agent-1",
        "t1",
        { capability: "communications.outbound.propose", branchId: "branch-1", at: LATER },
        sponsorsDirectory,
      ).allow,
      true,
    );
    expectCode(
      () => store.rotateCredential("agent-1", "EAAGrawtoken", actor, "t1", { at: LATER }),
      "AGENT_CREDENTIAL_REF_INVALID",
    );
  });

  it("keeps agents out of human-owned closure through the W3 task queue", () => {
    const { store, sponsorsDirectory } = seeded();
    const actor = { kind: "human" as const, accountId: "account-sponsor" };
    store.grantCapability("agent-1", "workforce.tasks.raise", actor, "t1", { at: NOW });
    store.grantCapability("agent-1", "workforce.tasks.comment", actor, "t1", { at: NOW });
    const identity = store.identities.get("agent-1");
    assert.ok(identity);
    const taskActor = agentTaskActor(identity);
    assert.equal(taskActor.kind, "automation");
    assert.equal(taskActor.accountId, "agent:agent-1");

    const raise = store.resolveAuthority(
      "agent-1",
      "t1",
      { capability: "workforce.tasks.raise", branchId: "branch-1", at: NOW },
      sponsorsDirectory,
    );
    assert.equal(raise.allow, true);

    const tasks = new OpsTaskStore();
    const task = tasks.createTask(
      {
        id: "task-1",
        tenantId: "t1",
        branchId: "branch-1",
        kind: "automation_handoff",
        title: "Agent raised follow-up",
        requesterAccountId: taskActor.accountId,
        origin: { kind: "automation", ref: `agent-1:workforce.tasks.raise` },
        provenance: workforceProvenance,
        createdAt: NOW,
      },
      "t1",
    );
    assert.equal(task.status, "open");
    tasks.addComment(
      {
        id: "comment-1",
        tenantId: "t1",
        taskId: "task-1",
        author: taskActor,
        body: "Agent observed a scheduling follow-up.",
        createdAt: NOW,
      },
      "t1",
    );
    tasks.transition("task-1", "in_progress", taskActor, "t1", { at: NOW });
    for (const terminal of ["resolved", "cancelled"] as const) {
      assert.throws(
        () => tasks.transition("task-1", terminal, taskActor, "t1", { at: NOW, resolutionNote: "done" }),
        (error: unknown) =>
          error instanceof OpsTaskError &&
          (error.code === "TASK_AUTOMATION_CANNOT_CLOSE" || error.code === "TASK_INVALID_TRANSITION"),
      );
    }
    assert.equal(tasks.tasks.get("task-1")?.status, "in_progress");
    assert.equal(tasks.transition("task-1", "resolved", { kind: "human", accountId: "account-sponsor" }, "t1", {
      at: LATER,
      resolutionNote: "reviewed by reception",
    }).status, "resolved");
  });

  it("persists only bounded, secret-free, append-only agent state", () => {
    const sql = readFileSync(
      new URL("../../db/migrations/042_agent_identities.sql", import.meta.url),
      "utf8",
    );
    const lower = sql.toLowerCase();
    assert.match(lower, /force row level security/);
    assert.match(lower, /grant select, insert, update on agent_identities to zyara_app;/);
    assert.match(lower, /grant select, insert on agent_identity_events to zyara_app;/);
    assert.ok(
      !/grant [^;]*update[^;]*on agent_identity_events/.test(lower),
      "the event trail must not be updatable by the application role",
    );
    assert.ok(
      !/grant [^;]*delete/.test(lower),
      "no DELETE grant may exist for agent identity state",
    );
    assert.ok(
      lower.includes("credential_ref ~ '^secret://[^[:space:]]+$'"),
      "credential_ref must be constrained to opaque secret-manager references",
    );
    assert.ok(
      lower.includes("expires_at <= effective_from + interval '90 days'"),
      "agent lifetime must be bounded in the schema",
    );
    assert.ok(
      lower.includes("check ((status = 'revoked') = (revoked_at is not null))"),
      "revocation must be recorded in the schema",
    );
    // The persisted capability whitelist must be exactly the delegable set.
    const capabilityClause = sql.split("capability TEXT CHECK")[1]?.split("),")[0] ?? "";
    const listed = [...capabilityClause.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    assert.deepEqual([...listed].sort(), [...AGENT_CAPABILITIES].sort());
    for (const column of ["app_secret", "verify_token", "access_token", "password", "private_key"]) {
      assert.ok(!lower.includes(` ${column} `), `schema must not carry a ${column} column`);
    }
  });
});
