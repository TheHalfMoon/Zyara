// N5/C2 synthetic qualification: derived human + agent operational activity.
//
// Proves, without any real clinic, provider or patient data:
//   * activity is a derived projection with no path back into domain state;
//   * human and agent actors are explicitly typed and agent actors resolve to a
//     real bounded C1 identity;
//   * revoked agent activity stays historically visible without implying authority;
//   * at-least-once redelivery is deterministic and divergent replay is refused;
//   * cross-tenant and cross-branch access is denied;
//   * no prose, direct identifier or credential material can be stored;
//   * history is append-only and corrections append a superseding record.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ACTIVITY_ACTOR_KINDS,
  ACTIVITY_PAYLOAD_ENUMS,
  ACTIVITY_PAYLOAD_KEYS,
  ACTIVITY_SOURCE_DOMAINS,
  ACTIVITY_SUBJECT_TYPES,
  ActivityError,
  ActivityStore,
  activityPseudonym,
  activityTitle,
  isActivityToken,
  type ActivityActorAuthority,
  type ActivityAgentDirectory,
  type ActivityProjectionInput,
  type ActivityReadAudience,
  type ActivityRecord,
} from "@zyara/collaboration";
import { OpsTaskStore } from "@zyara/enterprise-access";

const NOW = "2026-09-21T10:00:00Z";
const LATER = "2026-09-21T11:00:00Z";

class FakeAgents implements ActivityAgentDirectory {
  private readonly states = new Map<string, ActivityActorAuthority>();

  set(tenantId: string, agentIdentityId: string, state: ActivityActorAuthority): void {
    this.states.set(`${tenantId}:${agentIdentityId}`, state);
  }

  resolveAuthorityState(
    tenantId: string,
    agentIdentityId: string,
  ): ActivityActorAuthority | null {
    return this.states.get(`${tenantId}:${agentIdentityId}`) ?? null;
  }
}

const agents = new FakeAgents();
agents.set("t1", "agent-1", "active");
agents.set("t1", "agent-revoked", "revoked");
agents.set("t2", "agent-2", "active");

const provenance = {
  source: "zyara-native" as const,
  sourceRef: "n5c2-test",
  sourceRevision: "n5c2-test",
  observedAt: NOW,
};

function taskEvent(
  overrides: Partial<ActivityProjectionInput> = {},
): ActivityProjectionInput {
  return {
    id: "activity-1",
    tenantId: "t1",
    branchId: "b1",
    actor: { kind: "human", accountId: "account-reception" },
    sourceDomain: "workforce.tasks",
    sourceEventId: "ops-task-event-1",
    category: "task",
    action: "created",
    result: "observed",
    subjectType: "task",
    subjectId: "task-1",
    sensitivity: "operational",
    visibilityScope: "branch",
    correlationId: "corr-1",
    occurredAt: NOW,
    payload: { taskKind: "facility_helpdesk", originKind: "human" },
    provenance,
    ...overrides,
  };
}

function audience(overrides: Partial<ActivityReadAudience> = {}): ActivityReadAudience {
  return {
    tenantId: "t1",
    accountId: "account-reception",
    tenantWide: false,
    branchIds: ["b1"],
    allowRestricted: false,
    ...overrides,
  };
}

async function expectActivityError(
  run: () => Promise<unknown>,
  code: string,
  label: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    assert.ok(error instanceof ActivityError, `${label}: expected an ActivityError`);
    assert.equal((error as ActivityError).code, code, label);
    return;
  }
  assert.fail(`${label}: expected ${code}, but the call succeeded`);
}

describe("N5/C2 derived human + agent activity", () => {
  it("projects a human-authored operational event with tenant, branch, actor and provenance", async () => {
    const store = new ActivityStore();
    const outcome = await store.record(taskEvent(), "t1", agents);
    assert.equal(outcome.replayed, false);
    const record = outcome.record;
    assert.equal(record.tenantId, "t1");
    assert.equal(record.branchId, "b1");
    assert.equal(record.actorKind, "human");
    assert.equal(record.actorAccountId, "account-reception");
    assert.equal(record.actorAuthority, "not_applicable");
    assert.equal(record.category, "task");
    assert.equal(record.action, "created");
    assert.equal(record.result, "observed");
    assert.equal(record.sourceDomain, "workforce.tasks");
    assert.equal(record.sourceEventId, "ops-task-event-1");
    assert.equal(record.sourceRef, "n5c2-test");
    assert.equal(record.sourceRevision, "n5c2-test");
    assert.equal(record.correlationId, "corr-1");
    assert.equal(record.occurredAt, NOW);
    assert.equal(record.recordedAt, NOW);
    assert.deepEqual(record.payload, { taskKind: "facility_helpdesk", originKind: "human" });
    // The actor reference is minted here, not supplied by the caller.
    assert.equal(record.actorRef, await activityPseudonym("human", "t1", "account", "account-reception"));
    assert.equal(record.subjectRef, await activityPseudonym("subject", "t1", "task", "task-1"));
  });

  it("attributes an agent-authored event to a real bounded C1 identity", async () => {
    const store = new ActivityStore();
    const outcome = await store.record(
      taskEvent({
        id: "activity-agent",
        sourceEventId: "ops-task-event-2",
        actor: { kind: "agent", agentIdentityId: "agent-1" },
        action: "commented",
      }),
      "t1",
      agents,
    );
    assert.equal(outcome.record.actorKind, "agent");
    assert.equal(outcome.record.actorAgentId, "agent-1");
    assert.equal(outcome.record.actorAccountId, null);
    assert.equal(outcome.record.actorAuthority, "active");
    assert.equal(
      outcome.record.actorRef,
      await activityPseudonym("agent", "t1", "agent", "agent-1"),
    );
    assert.equal(store.impliesCurrentAgentAuthority(outcome.record, agents, NOW), true);

    await expectActivityError(
      () =>
        store.record(
          taskEvent({
            id: "activity-unknown-agent",
            sourceEventId: "ops-task-event-3",
            actor: { kind: "agent", agentIdentityId: "agent-does-not-exist" },
          }),
          "t1",
          agents,
        ),
      "ACTIVITY_UNKNOWN_AGENT_IDENTITY",
      "an agent actor must resolve to a known bounded identity",
    );
  });

  it("keeps revoked agent activity historically visible without implying current authority", async () => {
    const store = new ActivityStore();
    const outcome = await store.record(
      taskEvent({
        id: "activity-revoked",
        sourceEventId: "ops-task-event-4",
        actor: { kind: "agent", agentIdentityId: "agent-revoked" },
      }),
      "t1",
      agents,
    );
    assert.equal(outcome.record.actorAuthority, "revoked");
    // History stays readable...
    assert.equal(store.get("activity-revoked", "t1").actorAgentId, "agent-revoked");
    // ...and never reads as a live grant.
    assert.equal(store.impliesCurrentAgentAuthority(outcome.record, agents, NOW), false);

    const live = await store.record(
      taskEvent({
        id: "activity-live",
        sourceEventId: "ops-task-event-5",
        actor: { kind: "agent", agentIdentityId: "agent-1" },
      }),
      "t1",
      agents,
    );
    // A record made while the agent was active stops implying authority once the
    // agent loses it.
    agents.set("t1", "agent-1", "revoked");
    assert.equal(store.impliesCurrentAgentAuthority(live.record, agents, LATER), false);
    agents.set("t1", "agent-1", "active");
  });

  it("deduplicates a replayed source event and refuses a divergent replay", async () => {
    const store = new ActivityStore();
    const first = await store.record(taskEvent(), "t1", agents);
    const replay = await store.record(taskEvent({ id: "activity-different-id" }), "t1", agents);
    assert.equal(replay.replayed, true);
    assert.equal(replay.record.id, first.record.id);
    assert.equal(store.records.size, 1);

    await expectActivityError(
      () => store.record(taskEvent({ result: "succeeded" }), "t1", agents),
      "ACTIVITY_IDEMPOTENCY_CONFLICT",
      "a divergent replay of the same canonical event must be refused",
    );

    // Interleaved (concurrent) delivery of the same canonical event must still yield
    // exactly one record: the dedupe decision is not order-dependent.
    const concurrent = new ActivityStore();
    const [left, right] = await Promise.all([
      concurrent.record(taskEvent({ id: "activity-race-a" }), "t1", agents),
      concurrent.record(taskEvent({ id: "activity-race-b" }), "t1", agents),
    ]);
    assert.equal(concurrent.records.size, 1);
    assert.equal(left.record.id, right.record.id);
    assert.equal(
      [left, right].filter((outcome) => outcome.replayed === false).length,
      1,
      "exactly one interleaved delivery may create the record",
    );
    assert.deepEqual(concurrent.list("t1").map((record) => record.id), [left.record.id]);
  });

  it("refuses a cross-tenant projection and denies a cross-tenant read", async () => {
    const store = new ActivityStore();
    await store.record(taskEvent(), "t1", agents);
    await expectActivityError(
      () => store.record(taskEvent({ id: "activity-t2", tenantId: "t2" }), "t1", agents),
      "ACTIVITY_CROSS_TENANT",
      "a projection into a foreign tenant must be refused",
    );
    assert.throws(() => store.get("activity-1", "t2"), /activity/i);
    assert.deepEqual(store.list("t2"), []);
    assert.equal(store.listVisible(audience({ tenantId: "t2" })).length, 0);
  });

  it("enforces branch visibility and tenant-wide separation on reads", async () => {
    const store = new ActivityStore();
    await store.record(taskEvent(), "t1", agents);
    await store.record(
      taskEvent({
        id: "activity-other-branch",
        sourceEventId: "ops-task-event-6",
        branchId: "b2",
        subjectId: "task-2",
      }),
      "t1",
      agents,
    );
    const branchOne = store.listVisible(audience());
    assert.deepEqual(branchOne.map((record) => record.id), ["activity-1"]);
    const tenantWide = store.listVisible(audience({ tenantWide: true }));
    assert.equal(tenantWide.length, 2);
    // A caller cannot widen its own audience by asking for another branch.
    const foreign = store.listVisible(audience(), { branchId: "b2" });
    assert.deepEqual(foreign, []);
  });

  it("stores no prose: payload keys are closed and titles are derived at read time", async () => {
    const store = new ActivityStore();
    assert.deepEqual([...ACTIVITY_PAYLOAD_KEYS], [
      "channel",
      "provider",
      "attempt",
      "count",
      "taskKind",
      "previousValue",
      "newValue",
      "originKind",
      // N5/C3 extended this closed registry forward-only with the approval and exception
      // payload keys. Every C2 key is unchanged and the registry is still closed.
      "riskClass",
      "requiredAuthority",
      "approvalStatus",
      "executionOutcome",
      "exceptionKind",
      "exceptionSeverity",
      "exceptionStatus",
      "workItemStatus",
    ]);
    await expectActivityError(
      () => store.record(taskEvent({ payload: { summary: "patient reports chest pain" } }), "t1", agents),
      "ACTIVITY_PAYLOAD_INVALID",
      "a payload key outside the closed allow-list must be refused",
    );
    await expectActivityError(
      () => store.record(taskEvent({ payload: { taskKind: "free text value" } }), "t1", agents),
      "ACTIVITY_PAYLOAD_INVALID",
      "a payload value outside the closed vocabulary must be refused",
    );
    await expectActivityError(
      () => store.record(taskEvent({ payload: { count: 1.5 } }), "t1", agents),
      "ACTIVITY_PAYLOAD_INVALID",
      "a non-integer numeric payload value must be refused",
    );

    const record = (await store.record(
      taskEvent({
        id: "activity-prose",
        sourceEventId: "ops-task-event-7",
        subjectId: "task-7",
        payload: { channel: "whatsapp" },
      }),
      "t1",
      agents,
    )).record;
    const title = activityTitle(record);
    assert.equal(title, "Operational task created");
    assert.ok(!title.includes(record.subjectRef as string));
    // Only closed codes are present: no field of the record holds a sentence.
    for (const value of Object.values(record)) {
      if (typeof value === "string") assert.ok(!value.includes(" "), `${value} must not be prose`);
    }
    // A payload value can never encode a subject through a caller-controlled code:
    // every stored key is from the exported allow-list and every enum-valued key is
    // drawn from its own fixed vocabulary.
    for (const row of store.list("t1")) {
      for (const [key, value] of Object.entries(row.payload)) {
        assert.ok(
          (ACTIVITY_PAYLOAD_KEYS as readonly string[]).includes(key),
          `${key} is not a closed payload key`,
        );
        const vocabulary = ACTIVITY_PAYLOAD_ENUMS[key];
        if (vocabulary) {
          assert.ok(vocabulary.includes(value as string), `${key} must be a fixed vocabulary code`);
        } else {
          assert.ok(Number.isInteger(value), `${key} must hold a small integer`);
        }
      }
    }
  });

  it("refuses credential and secret material anywhere in a record", async () => {
    const store = new ActivityStore();
    await expectActivityError(
      () => store.record(taskEvent({ payload: { provider: "synthetic" }, correlationId: "secret://vault/x" }), "t1", agents),
      "ACTIVITY_MALFORMED",
      "a credential reference must not satisfy the metadata reference shape",
    );
    await expectActivityError(
      () => store.record(taskEvent({ id: "activity-secret-corr", correlationId: "app_secret_value" }), "t1", agents),
      "ACTIVITY_PAYLOAD_SECRET_REFUSED",
      "credential-shaped correlation metadata must be refused",
    );
    await expectActivityError(
      () => store.record(taskEvent({ sourceEventId: "EAAGrawtoken" }), "t1", agents),
      "ACTIVITY_PAYLOAD_SECRET_REFUSED",
      "a raw provider token must not satisfy the source event reference shape",
    );
    await expectActivityError(
      () => store.record(taskEvent({ id: "activity-prose-id", sourceEventId: "task 1" }), "t1", agents),
      "ACTIVITY_MALFORMED",
      "a source event reference containing free text must be refused",
    );
    await expectActivityError(
      () =>
        store.record(
          taskEvent({ id: "activity-secret-prov", provenance: { ...provenance, sourceRef: "app_secret_value" } }),
          "t1",
          agents,
        ),
      "ACTIVITY_PAYLOAD_SECRET_REFUSED",
      "credential-shaped provenance must be refused",
    );
    assert.equal(isActivityToken("secret://vault/x"), false);
    assert.equal(isActivityToken("EAAGtoken"), false);
    assert.equal(isActivityToken("ops-task-event-1"), true);
  });

  it("cannot store a direct identifier, because references are minted by the projector", async () => {
    const store = new ActivityStore();
    const outcome = await store.record(
      taskEvent({
        id: "activity-identifier",
        sourceEventId: "ops-task-event-8",
        subjectId: "+966500000001",
      }),
      "t1",
      agents,
    );
    const serialized = JSON.stringify(outcome.record);
    assert.ok(!serialized.includes("966500000001"));
    assert.ok(!serialized.includes("+966"));
    assert.match(outcome.record.subjectRef as string, /^subject_[0-9a-f]{64}$/);
    // The pseudonym is deterministic, so activity stays correlatable inside a tenant
    // and is different across tenants.
    const other = await activityPseudonym("subject", "t2", "task", "+966500000001");
    assert.notEqual(outcome.record.subjectRef, other);
    // Identifier-shaped source metadata is refused outright.
    await expectActivityError(
      () => store.record(taskEvent({ id: "activity-mrn", sourceEventId: "1052345678" }), "t1", agents),
      "ACTIVITY_MALFORMED",
      "a long digit run must not be storable as source metadata",
    );
  });

  it("rejects an unsupported actor type and refuses a free-text actor name", async () => {
    const store = new ActivityStore();
    assert.deepEqual([...ACTIVITY_ACTOR_KINDS], ["human", "agent", "system", "external"]);
    await expectActivityError(
      () => store.record(taskEvent({ actor: { kind: "clinician" } }), "t1", agents),
      "ACTIVITY_UNSUPPORTED_ACTOR_TYPE",
      "an actor kind outside the closed enumeration must be refused",
    );
    // A bare name is not an actor: the human actor needs a server-authoritative id.
    await expectActivityError(
      () => store.record(taskEvent({ actor: { kind: "human", accountId: "Dr Ahmed" } }), "t1", agents),
      "ACTIVITY_MALFORMED",
      "a free-text human actor must be refused",
    );
    await expectActivityError(
      () => store.record(taskEvent({ actor: { kind: "external" } }), "t1", agents),
      "ACTIVITY_MALFORMED",
      "an external actor requires a namespaced reference",
    );
  });

  it("rejects an unknown source domain and a source/action mismatch", async () => {
    const store = new ActivityStore();
    assert.deepEqual([...ACTIVITY_SOURCE_DOMAINS], [
      "workforce.tasks",
      "identity.agents",
      "communications.whatsapp",
      // N5/C3 additions; the registry stays closed and every C2 value is preserved.
      "collaboration.approvals",
      "collaboration.exceptions",
    ]);
    await expectActivityError(
      () =>
        store.record(
          taskEvent({ sourceDomain: "clinical.encounters", category: "task", action: "created" }),
          "t1",
          agents,
        ),
      "ACTIVITY_UNKNOWN_SOURCE_DOMAIN",
      "a source domain outside the closed registry must be refused",
    );
    await expectActivityError(
      () => store.record(taskEvent({ action: "credential_rotated" }), "t1", agents),
      "ACTIVITY_SOURCE_MISMATCH",
      "a source domain may only derive its own actions",
    );
  });

  it("keeps history append-only and records correction as a superseding activity", async () => {
    const store = new ActivityStore();
    const original = (await store.record(taskEvent(), "t1", agents)).record;
    const snapshot = JSON.stringify(original);

    const correction = await store.record(
      taskEvent({
        id: "activity-correction",
        sourceEventId: "ops-task-event-9",
        action: "transitioned",
        result: "succeeded",
        occurredAt: LATER,
        supersedesActivityId: original.id,
        payload: { previousValue: "open", newValue: "resolved" },
      }),
      "t1",
      agents,
    );
    assert.equal(correction.record.supersedesActivityId, original.id);
    // The original record is byte-identical: history was appended to, not rewritten.
    assert.equal(JSON.stringify(store.get(original.id, "t1")), snapshot);
    // A correction cannot move provenance or the source identity of the record it
    // supersedes: those still describe the original authoritative event.
    const superseded = store.get(original.id, "t1");
    assert.equal(superseded.sourceRef, original.sourceRef);
    assert.equal(superseded.sourceRevision, original.sourceRevision);
    assert.equal(superseded.sourceDomain, original.sourceDomain);
    assert.equal(superseded.sourceEventId, original.sourceEventId);
    assert.equal(superseded.occurredAt, original.occurredAt);
    assert.equal(superseded.recordedAt, original.recordedAt);
    assert.equal(superseded.result, "observed");
    assert.equal(correction.record.result, "succeeded");
    assert.equal(store.records.size, 2);

    await expectActivityError(
      () =>
        store.record(
          taskEvent({
            id: "activity-bad-correction",
            sourceEventId: "ops-task-event-10",
            subjectId: "task-other",
            supersedesActivityId: original.id,
          }),
          "t1",
          agents,
        ),
      "ACTIVITY_INVALID_SUBJECT",
      "a correction must describe the same subject as the record it supersedes",
    );
    await expectActivityError(
      () =>
        store.record(
          taskEvent({
            id: "activity-orphan-correction",
            sourceEventId: "ops-task-event-11",
            supersedesActivityId: "activity-missing",
          }),
          "t1",
          agents,
        ),
      "ACTIVITY_UNKNOWN_REFERENCE",
      "a correction must reference an existing record in the same tenant",
    );

    const prototype = ActivityStore.prototype as unknown as Record<string, unknown>;
    for (const forbidden of ["update", "delete", "remove", "rewrite", "replace"]) {
      assert.equal(prototype[forbidden], undefined, `ActivityStore must not expose ${forbidden}()`);
    }
    assert.deepEqual([...ACTIVITY_SUBJECT_TYPES], [
      "none",
      "task",
      "agent_identity",
      "staff_assignment",
      "facility",
      "conversation",
      // N5/C3 extended this closed registry forward-only; every C2 value is preserved.
      "approval_request",
      "exception_case",
    ]);
  });

  it("gates restricted (clinical) activity behind an explicit clinical audience", async () => {
    const store = new ActivityStore();
    await store.record(taskEvent({ id: "activity-op", sourceEventId: "ops-task-event-12" }), "t1", agents);
    await store.record(
      taskEvent({
        id: "activity-restricted",
        sourceEventId: "ops-task-event-13",
        subjectId: "task-13",
        sensitivity: "restricted",
      }),
      "t1",
      agents,
    );
    const operations = store.listVisible(audience());
    assert.deepEqual(operations.map((record) => record.id), ["activity-op"]);
    // Asking for restricted activity without clinical authorization is refused.
    assert.throws(
      () => store.listVisible(audience(), {}, { includeRestricted: true }),
      /restricted activity requires/i,
    );
    const clinical = store.listVisible(
      audience({ allowRestricted: true }),
      {},
      { includeRestricted: true },
    );
    assert.equal(clinical.length, 2);
    // The operations path cannot reach a restricted record by direct id either: the
    // record exists in the store, and the audience gate still refuses it.
    const restricted = activityRecordOf(store, "activity-restricted");
    assert.equal(restricted.sensitivity, "restricted");
    assert.equal(store.get("activity-restricted", "t1").id, "activity-restricted");
    assert.ok(
      !store.listVisible(audience()).some((record) => record.id === "activity-restricted"),
      "an operations audience must never receive a restricted record",
    );
    assert.equal(store.visibleTo(activityRecordOf(store, "activity-restricted"), audience()), false);
    assert.equal(
      store.visibleTo(activityRecordOf(store, "activity-restricted"), audience({ allowRestricted: true })),
      true,
    );
  });

  it("cannot mutate the source domain it projects", async () => {
    const tasks = new OpsTaskStore();
    const task = tasks.createTask(
      {
        id: "task-source-1",
        tenantId: "t1",
        branchId: "b1",
        kind: "referral_follow_up",
        title: "Synthetic referral follow-up",
        requesterAccountId: "account-reception",
        origin: { kind: "human", ref: "account-reception" },
        provenance: { ...provenance, sourceRef: "n5c2-test", sourceRevision: "n5c2-test" },
        createdAt: NOW,
      },
      "t1",
    );
    tasks.transition("task-source-1", "in_progress", { kind: "human", accountId: "account-reception" }, "t1", {
      at: LATER,
      reason: "synthetic",
    });
    const before = JSON.stringify({
      task: tasks.tasks.get("task-source-1"),
      events: tasks.listEvents("task-source-1", "t1"),
      comments: tasks.listComments("task-source-1", "t1"),
    });
    const store = new ActivityStore();
    for (const event of tasks.listEvents("task-source-1", "t1")) {
      await store.record(
        taskEvent({
          id: `activity-${event.id}`,
          sourceEventId: event.id,
          action: event.action,
          result: "observed",
          occurredAt: event.occurredAt,
          payload: {},
        }),
        "t1",
        agents,
      );
    }
    const after = JSON.stringify({
      task: tasks.tasks.get("task-source-1"),
      events: tasks.listEvents("task-source-1", "t1"),
      comments: tasks.listComments("task-source-1", "t1"),
    });
    assert.equal(after, before, "projecting activity must not change the authoritative task");
    assert.equal(store.list("t1").length, 2);
    assert.equal(task.id, "task-source-1");

    // Static boundary: the collaboration activity module has no handle to a domain
    // store at all, so no write-back path can exist.
    const source = readFileSync(
      new URL("../../packages/collaboration/src/activity.ts", import.meta.url),
      "utf8",
    );
    for (const forbidden of [
      "@zyara/enterprise-access",
      "@zyara/communication",
      "OpsTaskStore",
      "WorkforceStore",
      "pg",
      "fastify",
    ]) {
      assert.ok(!source.includes(forbidden), `activity.ts must not reference ${forbidden}`);
    }
  });
});

function activityRecordOf(store: ActivityStore, id: string): ActivityRecord {
  return store.get(id, "t1");
}
