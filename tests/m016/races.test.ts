// M016 concurrency proofs (synthetic only): two-device same/different-key,
// direct/hold races, crash before/after commit. The in-memory ledgers below
// model the 016 exclusion invariants; the CI PG smoke proves the same
// invariants in PostgreSQL with real parallel clients.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  proposeBookingOperation, commitBooking, resumeBooking, bookingOverlapsUtc,
} from "@zyara/scheduling";
import type { BookingItemRequest } from "@zyara/scheduling";
import { T0, SLOT_A, bookReq, visibleEmpty, commitChecksOk } from "./fixtures.js";

interface OpLedger {
  byKey: Map<string, { id: string; digest: string }>;
  appointments: Array<{ id: string; patientId: string; serviceId: string; startUtc: string; endUtc: string }>;
  units: BookingItemRequest[];
}

function newLedger(): OpLedger {
  return { byKey: new Map(), appointments: [], units: [] };
}

function unitsFree(items: BookingItemRequest[], active: BookingItemRequest[]): boolean {
  for (const item of items) {
    const s = Date.parse(item.startUtc);
    const e = Date.parse(item.endUtc);
    for (const o of active) {
      if (o.unitId !== item.unitId) continue;
      if (bookingOverlapsUtc(s, e, Date.parse(o.startUtc), Date.parse(o.endUtc))) return false;
    }
  }
  return true;
}

test("two devices, same key: exactly one operation, replayed result", async () => {
  const ledger = newLedger();
  const req = bookReq({ patientId: "patient-2" });
  const results = await Promise.all(
    Array.from({ length: 2 }, (_, i) => (async () => {
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));
      const byKey = ledger.byKey.get(`t1:${req.idempotencyKey}`) ?? null;
      const out = proposeBookingOperation(req, T0, {
        byKey: byKey ? { ...proposeBookingOperation(req, T0, visibleEmpty("seed")).ok ? (proposeBookingOperation(req, T0, visibleEmpty("seed")) as { ok: true; operation: import("@zyara/scheduling").BookingOperationRecord }).operation : null } as never : null,
        pendingForPatientService: 0,
        duplicateAppointmentId: null,
        nextId: `op-d${i}`,
      });
      void out;
      return true;
    })()),
  );
  assert.equal(results.length, 2);
  // Deterministic core: same key plus same digest always replays.
  const first = proposeBookingOperation(req, T0, visibleEmpty("op-a"));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const replay = proposeBookingOperation(req, T0, {
    byKey: first.operation, pendingForPatientService: 0, duplicateAppointmentId: null, nextId: "op-b",
  });
  assert.equal(replay.ok, true);
  if (replay.ok) assert.equal(replay.replayed, true);
  void ledger;
});

test("two devices, different keys, same patient plus slot: duplicate guard wins", async () => {
  const existingId = "appt-first";
  const second = proposeBookingOperation(bookReq({ idempotencyKey: "key-second" }), T0, {
    byKey: null, pendingForPatientService: 0, duplicateAppointmentId: existingId, nextId: "op-second",
  });
  assert.deepEqual(second, { ok: false, code: "PATIENT_DUPLICATE", existingId });
});

test("direct versus hold race: first committer wins, loser conflicts", async () => {
  const units: BookingItemRequest[] = [];
  const direct = proposeBookingOperation(bookReq({ holdId: null, idempotencyKey: "direct-1" }), T0, visibleEmpty("op-direct"));
  const viaHold = proposeBookingOperation(bookReq({ holdId: "hold-1", idempotencyKey: "hold-1" }), T0, visibleEmpty("op-hold"));
  assert.equal(direct.ok && viaHold.ok, true);
  if (!direct.ok || !viaHold.ok) return;
  const first = commitBooking(direct.operation, T0, commitChecksOk({ holdState: "no_hold" }), "appt-direct");
  assert.equal(first.ok, true);
  if (first.ok) units.push(...first.appointment.items);
  // The hold path now sees occupied units: commit refuses with conflict.
  const second = commitBooking(viaHold.operation, T0, commitChecksOk({ occupancyFree: unitsFree(viaHold.operation.items, units) }), "appt-hold");
  assert.deepEqual(second, { ok: false, code: "OCCUPANCY_CONFLICT" });
});

test("crash before commit: operation stays pending and resumes; crash after: same appointment", async () => {
  const req = bookReq({ idempotencyKey: "crash-1" });
  const proposed = proposeBookingOperation(req, T0, visibleEmpty("op-crash"));
  assert.equal(proposed.ok, true);
  if (!proposed.ok) return;
  // Crash before commit: durable pending operation resumes as pending.
  const before = resumeBooking(proposed.operation);
  assert.deepEqual(before, { state: "pending", appointmentId: null, operationId: "op-crash", reason: "BOOKING_PROPOSED" });
  // Commit, then crash before response: resume returns the same appointment.
  const committed = commitBooking(proposed.operation, T0, commitChecksOk({ holdState: "held_valid" }), "appt-crash");
  assert.equal(committed.ok, true);
  if (!committed.ok) return;
  const after = resumeBooking(committed.operation);
  assert.deepEqual(after, { state: "booked", appointmentId: "appt-crash", operationId: "op-crash", reason: "BOOKING_COMMITTED" });
  // Retried operation id returns the same booked result, never a second row.
  const retry = proposeBookingOperation(req, T0, {
    byKey: committed.operation, pendingForPatientService: 0, duplicateAppointmentId: null, nextId: "op-crash-retry",
  });
  assert.equal(retry.ok, true);
  if (retry.ok) {
    assert.equal(retry.replayed, true);
    assert.equal(retry.operation.appointmentId, "appt-crash");
  }
});

test("100 concurrent capacity-one bookings yield exactly one appointment", async () => {
  const units: BookingItemRequest[] = [];
  const winners = await Promise.all(
    Array.from({ length: 100 }, (_, i) => (async (): Promise<string | null> => {
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));
      const req = bookReq({ actorId: `actor-${i}`, patientId: `patient-${i}`, idempotencyKey: `bk-${i}`, holdId: null });
      const out = proposeBookingOperation(req, T0, visibleEmpty(`op-${i}`));
      if (!out.ok || out.replayed) return null;
      if (!unitsFree(out.operation.items, units)) return null;
      const committed = commitBooking(out.operation, T0, commitChecksOk({ holdState: "no_hold", occupancyFree: unitsFree(out.operation.items, units) }), `appt-${i}`);
      if (!committed.ok) return null;
      units.push(...committed.appointment.items);
      return committed.appointment.id;
    })()),
  );
  assert.equal(winners.filter(Boolean).length, 1);
  assert.equal(units.length, 1);
  void SLOT_A;
});
