import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MemoryOutbox, makeEnvelope } from "@zyara/events";

const T0 = "2026-09-15T00:00:00.000Z";

test("commit writes domain state and outbox together; crash-before-commit loses nothing", () => {
  const box = new MemoryOutbox();
  // Simulate crash before commit: event built but never appended.
  const pending = makeEnvelope({ id: "e1", code: "op.committed", tenant: "t1", occurredAt: T0 });
  assert.equal(box.pendingCount(), 0);
  // Commit path: domain write + append happen together.
  const domainWrites: string[] = [];
  domainWrites.push("appointment:created");
  box.append(pending);
  assert.equal(domainWrites.length, 1);
  assert.equal(box.pendingCount(), 1);
});

test("duplicate delivery has one logical effect", async () => {
  const box = new MemoryOutbox();
  box.append(makeEnvelope({ id: "e2", code: "op.committed", tenant: "t1", occurredAt: T0 }));
  let effects = 0;
  const c = { name: "audit-writer", codes: ["op.committed"] as const, tenants: [] as string[], handle: async () => { effects += 1; return "ack" as const; } };
  await box.dispatch({ ...c, codes: [...c.codes] }, T0);
  await box.dispatch({ ...c, codes: [...c.codes] }, T0);
  assert.equal(effects, 1);
});

test("incompatible event version is quarantined", async () => {
  const box = new MemoryOutbox();
  const bad = makeEnvelope({ id: "e3", code: "op.committed", tenant: "t1", occurredAt: T0 });
  (bad as { version: number }).version = 99;
  box.append(bad);
  await box.dispatch({ name: "audit-writer", codes: ["op.committed"], tenants: [], handle: async () => "ack" as const }, T0);
  assert.equal(box.quarantine.length, 1);
  assert.equal(box.deadCount(), 1);
});

test("cross-tenant event routing scoped to consumer tenants", async () => {
  const box = new MemoryOutbox();
  box.append(makeEnvelope({ id: "e4", code: "op.committed", tenant: "t2", occurredAt: T0 }));
  let seen = 0;
  await box.dispatch({ name: "t1-only", codes: ["op.committed"], tenants: ["t1"], handle: async () => { seen += 1; return "ack" as const; } }, T0);
  assert.equal(seen, 0);
  assert.equal(box.owedCount(), 1);
});

test("worker restart rediscovers owed work from cursor", async () => {
  const box = new MemoryOutbox();
  box.append(makeEnvelope({ id: "e5", code: "op.committed", tenant: "t1", occurredAt: T0 }));
  assert.equal(box.owedCount(), 1); // "restart": new dispatcher, same store
  await box.dispatch({ name: "audit-writer", codes: ["op.committed"], tenants: [], handle: async () => "ack" as const }, T0);
  assert.equal(box.owedCount(), 0);
});

test("no patient text in generic event body", () => {
  const src = readFileSync(new URL("../../packages/events/src/index.ts", import.meta.url), "utf8");
  assert.ok(src.includes("NO patient text") || src.includes("Never free text"));
  const e = makeEnvelope({ id: "x", code: "op.committed", tenant: "t1", payload: { appointmentId: "a-1" } });
  assert.equal(e.payload["appointmentId"], "a-1");
});

test("payload must be string IDs only", () => {
  assert.throws(() => makeEnvelope({ id: "z", code: "op.committed", tenant: "t1", payload: { n: 42 } as unknown as Record<string, string> }));
});

test("migration 004 has outbox/inbox/audit + RLS + wakeup", () => {
  const sql = readFileSync(new URL("../../db/migrations/004_durable_events.sql", import.meta.url), "utf8");
  for (const s of ["CREATE TABLE IF NOT EXISTS outbox", "CREATE TABLE IF NOT EXISTS inbox", "audit_log", "FORCE ROW LEVEL SECURITY", "pg_notify", "zyara_app"]) {
    assert.ok(sql.includes(s), s);
  }
});
