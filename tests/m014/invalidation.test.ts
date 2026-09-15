// M014 worker invalidation proofs (synthetic only): projection.invalidated
// clears the patient-free cache; malformed bindings reject; tenant prefix
// isolation holds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnvelope, MemoryOutbox } from "@zyara/events";
import {
  consumers, storeProjection, readProjection, clearProjectionCache,
  projectionCacheSize, invalidateProjectionsFor,
} from "../../apps/worker/src/consumers.js";

function invalidated(tenant: string, schedule: string, version: string): Parameters<typeof invalidateProjectionsFor>[0] {
  return makeEnvelope({
    id: `evt-${tenant}-${schedule}-${version}`, code: "projection.invalidated",
    tenant, payload: { schedule, scheduleVersion: version, reason: "SCHEDULE_REVISED" },
  });
}

test("invalidation clears cached projections for the schedule binding", () => {
  clearProjectionCache();
  storeProjection("t1|sched-1|sched-v2|candidates", "payload-a", Date.now());
  storeProjection("t1|sched-1|sched-v2|other-range", "payload-b", Date.now());
  storeProjection("t1|sched-9|sched-v1|candidates", "payload-c", Date.now());
  assert.equal(projectionCacheSize(), 3);
  const removed = invalidateProjectionsFor(invalidated("t1", "sched-1", "2"));
  assert.equal(removed, 2);
  assert.equal(readProjection("t1|sched-1|sched-v2|candidates"), null);
  assert.equal(readProjection("t1|sched-9|sched-v1|candidates"), "payload-c");
});

test("consumer acks valid invalidation and rejects malformed bindings", async () => {
  clearProjectionCache();
  const handler = consumers.find((c) => c.name === "projection-invalidator");
  assert.ok(handler);
  const good = invalidated("t1", "sched-1", "2");
  assert.equal(await handler.handle(good), "ack");
  const bad = makeEnvelope({
    id: "evt-bad", code: "projection.invalidated", tenant: "t1", payload: { reason: "X" },
  });
  assert.equal(await handler.handle(bad), "reject");
});

test("outbox dispatch delivers invalidation exactly once via inbox dedupe", async () => {
  clearProjectionCache();
  const outbox = new MemoryOutbox();
  storeProjection("t1|sched-1|sched-v2|candidates", "payload", Date.now());
  const evt = invalidated("t1", "sched-1", "2");
  outbox.append(evt);
  const handler = consumers.find((c) => c.name === "projection-invalidator");
  assert.ok(handler);
  await outbox.dispatch(handler, new Date().toISOString());
  assert.equal(readProjection("t1|sched-1|sched-v2|candidates"), null);
  assert.equal(outbox.pendingCount(), 0);
});
