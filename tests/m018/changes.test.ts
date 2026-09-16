// M018 safe change tests. English only. Synthetic data only.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createChangeStore,
  seedAppointment,
  cancelAppointment,
  rescheduleAppointment,
  previewSafeLink,
  actOnSafeLink,
  encodeSafeLink,
  explainChange,
  type ChangeRequest,
  type ManagedAppointment,
} from "@zyara/scheduling";

const APPT: ManagedAppointment = {
  id: "appt-m18-1",
  tenantId: "tenant-syn",
  patientId: "pat-syn-1",
  serviceId: "svc-syn-1",
  startUtc: "2026-11-01T10:00:00Z",
  endUtc: "2026-11-01T10:30:00Z",
  lifecycle: "booked",
  version: 1,
  replacedById: null,
};

function cancelReq(changeId: string, key: string): ChangeRequest {
  return {
    changeId,
    kind: "cancel",
    appointmentId: APPT.id,
    tenantId: "tenant-syn",
    actorId: "pat-syn-1",
    patientId: "pat-syn-1",
    idempotencyKey: key,
    newStartUtc: null,
    newEndUtc: null,
    reason: null,
    cutoffIso: "2026-10-31T10:00:00Z",
    nowIso: "2026-10-01T10:00:00Z",
  };
}

describe("M018 original survives failed replacement", () => {
  it("failed commit retains the original", () => {
    const store = createChangeStore();
    seedAppointment(store, APPT);
    const rec = rescheduleAppointment(
      store,
      {
        ...cancelReq("chg-1", "key-1"),
        kind: "reschedule",
        newStartUtc: "2026-11-02T10:00:00Z",
        newEndUtc: "2026-11-02T10:30:00Z",
      },
      { commitReplacement: () => { throw new Error("SLOT_CONFLICT"); } },
    );
    assert.equal(rec.state, "rejected");
    assert.equal(rec.lastReason, "REPLACEMENT_FAILED_ORIGINAL_RETAINED");
    assert.equal(store.appointments.get(APPT.id)?.lifecycle, "booked");
    assert.equal(store.outcomes.retained, 1);
  });
  it("successful replacement voids original only after commit", () => {
    const store = createChangeStore();
    seedAppointment(store, APPT);
    const rec = rescheduleAppointment(
      store,
      {
        ...cancelReq("chg-2", "key-2"),
        kind: "reschedule",
        newStartUtc: "2026-11-02T10:00:00Z",
        newEndUtc: "2026-11-02T10:30:00Z",
      },
      { commitReplacement: () => "appt-m18-2" },
    );
    assert.equal(rec.state, "committed");
    assert.equal(rec.replacementId, "appt-m18-2");
    const appt = store.appointments.get(APPT.id);
    assert.equal(appt?.lifecycle, "replaced");
    assert.equal(appt?.replacedById, "appt-m18-2");
    assert.equal(store.outcomes.replaced, 1);
    assert.equal(store.outcomes.cancelled, 0);
  });
});

describe("M018 mail-link preview cannot cancel", () => {
  it("scanner GET mutates nothing", () => {
    const store = createChangeStore();
    seedAppointment(store, APPT);
    const token = encodeSafeLink({
      tenantId: "tenant-syn",
      appointmentId: APPT.id,
      patientId: "pat-syn-1",
      kind: "cancel",
      expiresAtIso: "2026-12-01T00:00:00Z",
      nonce: "n-1",
    });
    const preview = previewSafeLink(store, token, "2026-10-01T00:00:00Z");
    assert.equal(preview.preview, true);
    assert.equal(preview.mutated, false);
    assert.equal(store.appointments.get(APPT.id)?.lifecycle, "booked");
    assert.equal(store.changes.size, 0);
  });
  it("expired link is rejected on action", () => {
    const store = createChangeStore();
    seedAppointment(store, APPT);
    const token = encodeSafeLink({
      tenantId: "tenant-syn",
      appointmentId: APPT.id,
      patientId: "pat-syn-1",
      kind: "cancel",
      expiresAtIso: "2026-09-01T00:00:00Z",
      nonce: "n-2",
    });
    const rec = actOnSafeLink(
      store,
      {
        token,
        tenantId: "tenant-syn",
        patientId: "pat-syn-1",
        changeId: "chg-exp",
        idempotencyKey: "key-exp",
        newStartUtc: null,
        newEndUtc: null,
        cutoffIso: "2026-10-31T10:00:00Z",
        nowIso: "2026-10-01T00:00:00Z",
      },
      { commitReplacement: () => "appt-x" },
    );
    assert.equal(rec.state, "rejected");
    assert.equal(rec.lastReason, "LINK_EXPIRED");
    assert.equal(store.appointments.get(APPT.id)?.lifecycle, "booked");
  });
  it("wrong-patient link is rejected", () => {
    const store = createChangeStore();
    seedAppointment(store, APPT);
    const token = encodeSafeLink({
      tenantId: "tenant-syn",
      appointmentId: APPT.id,
      patientId: "pat-syn-1",
      kind: "cancel",
      expiresAtIso: "2026-12-01T00:00:00Z",
      nonce: "n-3",
    });
    const rec = actOnSafeLink(
      store,
      {
        token,
        tenantId: "tenant-syn",
        patientId: "pat-syn-OTHER",
        changeId: "chg-wrong",
        idempotencyKey: "key-wrong",
        newStartUtc: null,
        newEndUtc: null,
        cutoffIso: "2026-10-31T10:00:00Z",
        nowIso: "2026-10-01T00:00:00Z",
      },
      { commitReplacement: () => "appt-x" },
    );
    assert.equal(rec.lastReason, "WRONG_PATIENT_LINK");
    assert.equal(store.appointments.get(APPT.id)?.lifecycle, "booked");
  });
});

describe("M018 cancellation branches", () => {
  it("cutoff reached requires assistance", () => {
    const store = createChangeStore();
    seedAppointment(store, APPT);
    const rec = cancelAppointment(store, {
      ...cancelReq("chg-cut", "key-cut"),
      nowIso: "2026-11-01T09:00:00Z",
    });
    assert.equal(rec.lastReason, "CUTOFF_REACHED_ASSISTANCE_REQUIRED");
    assert.equal(store.appointments.get(APPT.id)?.lifecycle, "booked");
  });
  it("already cancelled replays stably; idempotent key replays", () => {
    const store = createChangeStore();
    seedAppointment(store, APPT);
    const first = cancelAppointment(store, cancelReq("chg-c1", "key-c1"));
    assert.equal(first.state, "committed");
    const replay = cancelAppointment(store, cancelReq("chg-c1", "key-c1"));
    assert.deepEqual(replay, first);
    assert.equal(store.outcomes.duplicates, 1);
    assert.equal(store.outcomes.cancelled, 1);
  });
  it("concurrent second change sees non-active original", () => {
    const store = createChangeStore();
    seedAppointment(store, APPT);
    cancelAppointment(store, cancelReq("chg-c2", "key-c2"));
    const second = rescheduleAppointment(
      store,
      {
        ...cancelReq("chg-c3", "key-c3"),
        kind: "reschedule",
        newStartUtc: "2026-11-02T10:00:00Z",
        newEndUtc: "2026-11-02T10:30:00Z",
      },
      { commitReplacement: () => "appt-m18-3" },
    );
    assert.equal(second.lastReason, "ORIGINAL_NOT_ACTIVE");
  });
});

describe("M018 locales", () => {
  it("covers five locales", () => {
    for (const locale of ["ar", "en", "fr", "de", "es"] as const) {
      assert.ok(explainChange(locale, "change.retained").length > 0);
      assert.ok(explainChange(locale, "change.replaced").length > 0);
    }
  });
});
